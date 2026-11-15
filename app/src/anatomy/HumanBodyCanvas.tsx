import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import * as THREE from 'three';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Atlas, Part, SystemId } from './atlas';
import { SYSTEM_LABELS } from './labels';
import { decodeModelResponse } from './model-download';
import { ORGAN_BY_ID, ORGAN_META } from '../data';
import type { Lesion } from '../types';

export interface BodyViewerHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  panUp: () => void;
  panDown: () => void;
}

interface LesionMarker extends Pick<Lesion, 'id' | 'organId' | 'label' | 'severity'> {}

interface Props {
  visibleSystems: SystemId[];
  selectedOrganId?: string;
  onSelectOrgan?: (id: string) => void;
  clip?: number;
  particles?: boolean;
  lesions?: LesionMarker[];
  focusOnSelect?: boolean;
  className?: string;
  onReady?: () => void;
}

const MODEL_BASE = '/models/human-atlas/';

/**
 * Progressive loading: the body surface and the organs used by the default
 * view are assembled first, then the remaining anatomy chunks stream in.
 * The four core chunks total ~8.8 MB gzipped (vs ~33 MB for the whole atlas).
 */
const CORE_CHUNK_BUDGET = 10 * 1024 * 1024;
const CORE_SYSTEMS: SystemId[] = [
  'integumentary',
  'cardiac',
  'respiratory',
  'digestive',
  'urinary',
  'lymphatic',
  'endocrine',
];

const SYSTEM_PRIORITY: Partial<Record<SystemId, number>> = {
  integumentary: 120,
  skeletal: 90,
  cardiac: 80,
  respiratory: 70,
  digestive: 70,
  urinary: 50,
  lymphatic: 40,
  endocrine: 40,
  nervous: 30,
  arterial: 20,
  venous: 15,
  muscular: 8,
};

let atlasCache: Promise<Atlas> | null = null;
const coreChunkCache = new Map<number, ArrayBuffer>();

function fetchAtlas(): Promise<Atlas> {
  atlasCache ??= fetch(`${MODEL_BASE}atlas.json`)
    .then(response => {
      if (!response.ok) throw new Error('模型目录加载失败');
      return response.json() as Promise<Atlas>;
    })
    .catch(error => {
      atlasCache = null;
      throw error;
    });
  return atlasCache;
}

function chunkBytes(atlas: Atlas, index: number) {
  return atlas.chunks[index]?.gzipBytes ?? atlas.chunks[index]?.bytes ?? 0;
}

/** Pick the smallest useful set of chunks for the first frame. */
function pickCoreChunks(atlas: Atlas): number[] {
  const picked = new Set<number>();
  let bytes = 0;
  for (const system of CORE_SYSTEMS) {
    let best = -1;
    let bestTriangles = 0;
    for (const part of atlas.parts) {
      if (part.system !== system || picked.has(part.chunk)) continue;
      if (part.indexCount <= bestTriangles) continue;
      if (bytes + chunkBytes(atlas, part.chunk) > CORE_CHUNK_BUDGET) continue;
      best = part.chunk;
      bestTriangles = part.indexCount;
    }
    if (best >= 0) {
      picked.add(best);
      bytes += chunkBytes(atlas, best);
    }
  }
  if (!picked.size) picked.add(0);
  return [...picked];
}

/** Order the rest so visually dominant anatomy arrives before detail layers. */
function rankBackgroundChunks(atlas: Atlas, core: number[]): number[] {
  const coreSet = new Set(core);
  return atlas.chunks
    .map((_, index) => {
      const triangles = atlas.parts
        .filter(part => part.chunk === index)
        .reduce((sum, part) => sum + (SYSTEM_PRIORITY[part.system] ?? 5) * part.indexCount, 0);
      return { index, triangles };
    })
    .filter(item => !coreSet.has(item.index))
    .sort((a, b) => b.triangles - a.triangles)
    .map(item => item.index);
}

async function fetchChunkBuffer(
  atlas: Atlas,
  index: number,
  signal?: AbortSignal,
): Promise<ArrayBuffer> {
  const cached = coreChunkCache.get(index);
  if (cached) return cached;
  const chunk = atlas.chunks[index];
  const filename = (chunk.gzip ?? chunk.url).split('/').pop() ?? chunk.url;
  const response = await fetch(`${MODEL_BASE}${filename}`, { signal });
  return decodeModelResponse(response, chunk.bytes, Boolean(chunk.gzip));
}

const STYLE: Record<SystemId, { color: string; opacity: number; roughness: number }> = {
  skeletal: { color: '#d7c7a4', opacity: 0.5, roughness: 0.62 },
  muscular: { color: '#92564c', opacity: 0.12, roughness: 0.6 },
  cardiac: { color: '#bd6b61', opacity: 0.94, roughness: 0.42 },
  sensory: { color: '#a9c4c9', opacity: 0.7, roughness: 0.45 },
  arterial: { color: '#b84a3e', opacity: 0.62, roughness: 0.5 },
  venous: { color: '#4f7391', opacity: 0.58, roughness: 0.5 },
  nervous: { color: '#c9a86a', opacity: 0.72, roughness: 0.48 },
  respiratory: { color: '#b98a91', opacity: 0.9, roughness: 0.48 },
  digestive: { color: '#b68b63', opacity: 0.92, roughness: 0.46 },
  urinary: { color: '#b27a62', opacity: 0.9, roughness: 0.48 },
  lymphatic: { color: '#8ca181', opacity: 0.72, roughness: 0.5 },
  endocrine: { color: '#c5a09a', opacity: 0.86, roughness: 0.48 },
  reproductive: { color: '#bda098', opacity: 0.82, roughness: 0.5 },
  integumentary: { color: '#9fbab5', opacity: 0.09, roughness: 0.55 },
  connective: { color: '#aec3bb', opacity: 0.42, roughness: 0.55 },
};

function makeBodyMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
    uniforms: {
      uColor: { value: new THREE.Color('#a8c8c2') },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.2);
        float alpha = 0.018 + fresnel * 0.30;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
  });
}

function makeGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
  gradient.addColorStop(0.18, 'rgba(255,255,255,0.65)');
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.18)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function buildOrganAnchors(atlas: Atlas) {
  const anchors: Array<{
    id: string;
    label: string;
    point: THREE.Vector3;
    system: SystemId;
    color: string;
  }> = [];

  for (const meta of ORGAN_META) {
    const elementIds = new Set<string>();
    for (const concept of atlas.concepts) {
      if (
        meta.concepts.some(
          name => name.toLowerCase() === concept.name.toLowerCase(),
        )
      ) {
        concept.elements.forEach(id => elementIds.add(id));
      }
    }
    const boxes: THREE.Box3[] = [];
    for (const part of atlas.parts) {
      if (!elementIds.has(part.id)) continue;
      boxes.push(
        new THREE.Box3(
          new THREE.Vector3().fromArray(part.bounds[0]),
          new THREE.Vector3().fromArray(part.bounds[1]),
        ),
      );
    }
    if (!boxes.length) continue;
    const box = boxes.reduce((acc, next) => acc.union(next), boxes[0].clone());
    anchors.push({
      id: meta.id,
      label: meta.label,
      point: box.getCenter(new THREE.Vector3()),
      system: meta.system as SystemId,
      color: meta.color,
    });
  }
  return anchors;
}

function makeParticles(count: number, color: string, spread: number) {
  const positions = new Float32Array(count * 3);
  const seeds: number[] = [];
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const radius = Math.pow(Math.random(), 0.6) * spread;
    const y = 0.35 + Math.random() * 0.95;
    positions[i * 3] = Math.cos(theta) * radius * 0.62;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(theta) * radius * 0.32;
    seeds.push(theta, radius, y, Math.random());
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color,
    size: 0.012,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return { points, seeds };
}

export const HumanBodyCanvas = forwardRef<BodyViewerHandle, Props>(function HumanBodyCanvas(
  {
    visibleSystems,
    selectedOrganId,
    onSelectOrgan,
    clip = 0,
    particles = false,
    lesions = [],
    focusOnSelect = false,
    className = '',
    onReady,
  },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef({
    visibleSystems,
    selectedOrganId,
    onSelectOrgan,
    clip,
    particles,
    lesions,
    focusOnSelect,
  });
  propsRef.current = {
    visibleSystems,
    selectedOrganId,
    onSelectOrgan,
    clip,
    particles,
    lesions,
    focusOnSelect,
  };

  const apiRef = useRef<BodyViewerHandle>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [detailLoaded, setDetailLoaded] = useState(0);
  const [detailTotal, setDetailTotal] = useState(0);
  const [degraded, setDegraded] = useState(false);

  useImperativeHandle(ref, () => ({
    zoomIn: () => apiRef.current?.zoomIn(),
    zoomOut: () => apiRef.current?.zoomOut(),
    reset: () => apiRef.current?.reset(),
    panUp: () => apiRef.current?.panUp(),
    panDown: () => apiRef.current?.panDown(),
  }));

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let frame = 0;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setError('当前浏览器无法启动 3D 查看器，请开启 WebGL 或更换浏览器。');
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor('#05070a', 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.localClippingEnabled = true;
    host.appendChild(renderer.domElement);
    renderer.domElement.setAttribute(
      'aria-label',
      '数字人体三维模型。可上下拖动、滚轮缩放，点击脏腑查看信息；旋转已锁定。',
    );

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.domElement.className = 'body-label-layer';
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.inset = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
    host.appendChild(labelRenderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.005, 60);
    let bodyCenterY = 0.865;
    let bodyHeight = 1.73;
    camera.position.set(0, bodyCenterY + 0.16, 3.04);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, bodyCenterY, 0);
    controls.enableRotate = false;
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.minDistance = 0.9;
    controls.maxDistance = 4.8;
    controls.zoomSpeed = 0.7;

    scene.add(new THREE.AmbientLight(0xffffff, 1.4));
    const key = new THREE.DirectionalLight(0xfff4e6, 2.4);
    key.position.set(-2.6, 3.2, 3.6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x8ec8c1, 2.0);
    rim.position.set(2.2, 1.8, -2.6);
    scene.add(rim);
    const fill = new THREE.DirectionalLight(0xc9a86a, 0.8);
    fill.position.set(1.8, 0.6, 2.4);
    scene.add(fill);

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xc9a86a,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.423, 128), ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.004;
    scene.add(ring);
    const ring2 = new THREE.Mesh(
      new THREE.RingGeometry(0.58, 0.581, 128),
      new THREE.MeshBasicMaterial({
        color: 0x4fb3a9,
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    ring2.rotation.x = -Math.PI / 2;
    ring2.position.y = 0.004;
    scene.add(ring2);

    const clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 10);
    const systemGroups = new Map<SystemId, THREE.Group>();
    const materials = new Map<SystemId, THREE.Material>();
    const organAnchors: ReturnType<typeof buildOrganAnchors> = [];
    const controller = new AbortController();
    const markerGroup = new THREE.Group();
    scene.add(markerGroup);
    const labelGroup = new THREE.Group();
    scene.add(labelGroup);

    const getSystemMaterial = (system: SystemId) => {
      const existing = materials.get(system);
      if (existing) return existing;
      let material: THREE.Material;
      if (system === 'integumentary') {
        material = makeBodyMaterial();
      } else {
        const style = STYLE[system];
        material = new THREE.MeshStandardMaterial({
          color: style.color,
          roughness: style.roughness,
          metalness: 0.04,
          transparent: style.opacity < 1,
          opacity: style.opacity,
          side: THREE.DoubleSide,
          depthWrite: style.opacity > 0.4,
        });
      }
      materials.set(system, material);
      return material;
    };

    // Add one anatomy chunk as a set of per-system meshes. Keeping chunk
    // batches separate lets later chunks append without rebuilding the scene.
    const addChunk = (index: number, buffer: ArrayBuffer) => {
      const batches = new Map<SystemId, THREE.BufferGeometry[]>();
      for (const part of atlas.parts) {
        if (part.chunk !== index) continue;
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          'position',
          new THREE.BufferAttribute(new Float32Array(buffer, part.positions, part.vertexCount * 3), 3),
        );
        geometry.setAttribute(
          'normal',
          new THREE.BufferAttribute(new Int16Array(buffer, part.normals, part.vertexCount * 3), 3, true),
        );
        geometry.setIndex(
          new THREE.BufferAttribute(new Uint32Array(buffer, part.indices, part.indexCount), 1),
        );
        const list = batches.get(part.system as SystemId) ?? [];
        list.push(geometry);
        batches.set(part.system as SystemId, list);
      }
      for (const [system, geometries] of batches) {
        const merged = mergeGeometries(geometries, false);
        geometries.forEach(geometry => geometry.dispose());
        if (!merged) continue;
        merged.computeBoundingSphere();
        const mesh = new THREE.Mesh(merged, getSystemMaterial(system));
        mesh.frustumCulled = false;
        mesh.renderOrder = system === 'integumentary' ? 2 : 1;
        let group = systemGroups.get(system);
        if (!group) {
          group = new THREE.Group();
          group.name = `system-${system}`;
          scene.add(group);
          systemGroups.set(system, group);
        }
        group.add(mesh);
      }
    };

    let atlas: Atlas;

    const glowTexture = makeGlowTexture();
    const selectionSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: 0xe2c894,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.88,
      }),
    );
    selectionSprite.scale.set(0.22, 0.22, 1);
    selectionSprite.renderOrder = 20;
    selectionSprite.visible = false;
    markerGroup.add(selectionSprite);

    const qi = makeParticles(420, '#4fb3a9', 0.44);
    const damp = makeParticles(260, '#c9a86a', 0.52);
    scene.add(qi.points);
    scene.add(damp.points);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const hitPoint = new THREE.Vector3();
    let downX = 0;
    let downY = 0;
    let downTime = 0;
    let dragging = false;
    let lastDragY = 0;
    let activePointerId = -1;
    let currentAnchors = organAnchors;
    let lastLesionKey = '';
    let lastLabelId = '';
    let focusKey = '';
    let lastClip = -1;
    let lastFrame = performance.now();

    const fitDistance = () => {
      const halfFov = THREE.MathUtils.degToRad(camera.fov) / 2;
      const base = (bodyHeight / 2) / Math.tan(halfFov);
      const factor = camera.aspect < 0.9 ? 1.12 : 0.94;
      return THREE.MathUtils.clamp(base * factor, 1.5, 5.0);
    };

    const fitCamera = () => {
      const width = host.clientWidth || 1;
      const height = host.clientHeight || 1;
      camera.aspect = width / height;
      camera.fov = width < 640 ? 34 : 30;
      camera.updateProjectionMatrix();
      const distance = fitDistance();
      controls.target.set(0, bodyCenterY, 0);
      camera.position.set(0, bodyCenterY + 0.16, distance);
      controls.minDistance = 0.9;
      controls.maxDistance = 4.8;
      controls.update();
    };

    const resize = () => {
      const width = host.clientWidth || 1;
      const height = host.clientHeight || 1;
      renderer.setSize(width, height, false);
      labelRenderer.setSize(width, height);
      fitCamera();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    const reset = () => {
      controls.target.set(0, bodyCenterY, 0);
      camera.position.set(0, bodyCenterY + 0.16, fitDistance());
      focusKey = '';
      controls.update();
    };
    const zoom = (factor: number) => {
      const direction = camera.position.clone().sub(controls.target);
      const length = THREE.MathUtils.clamp(
        direction.length() * factor,
        controls.minDistance,
        controls.maxDistance,
      );
      camera.position.copy(controls.target).add(direction.normalize().multiplyScalar(length));
      controls.update();
    };
    // Vertical-only pan: the model moves up/down while rotation stays locked.
    const panBy = (deltaY: number) => {
      const height = host.clientHeight || 1;
      const distance = camera.position.distanceTo(controls.target);
      const worldPerPixel =
        (2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / height;
      const nextY = THREE.MathUtils.clamp(
        controls.target.y + deltaY * worldPerPixel,
        0.45,
        1.3,
      );
      const applied = nextY - controls.target.y;
      controls.target.y = nextY;
      camera.position.y += applied;
      controls.update();
    };
    apiRef.current = {
      zoomIn: () => zoom(0.82),
      zoomOut: () => zoom(1.22),
      reset,
      panUp: () => panBy(-18),
      panDown: () => panBy(18),
    };

    const clearMarkers = () => {
      while (markerGroup.children.length > 1) {
        const item = markerGroup.children[1];
        markerGroup.remove(item);
        item.traverse(obj => {
          if (obj instanceof THREE.Sprite) {
            obj.material.dispose();
          }
        });
      }
      while (labelGroup.children.length) {
        const item = labelGroup.children[0];
        labelGroup.remove(item);
        if (item instanceof CSS2DObject) item.element.remove();
      }
      selectionSprite.visible = false;
    };

    const rebuildMarkers = () => {
      if (!currentAnchors.length) return;
      const current = propsRef.current;
      const lesionKey = current.lesions.map(l => `${l.id}:${l.organId}:${l.severity}`).join('|');
      const labelId = current.selectedOrganId ?? '';
      if (lesionKey === lastLesionKey && labelId === lastLabelId) return;
      lastLesionKey = lesionKey;
      lastLabelId = labelId;
      clearMarkers();

      const findAnchor = (organId: string) =>
        currentAnchors.find(anchor => anchor.id === organId);

      for (const lesion of current.lesions) {
        const anchor = findAnchor(lesion.organId);
        if (!anchor) continue;
        const lesionIndex = current.lesions.indexOf(lesion);
        const sprite = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: glowTexture,
            color: lesion.severity === '主要' ? 0xc8472f : 0xc9a86a,
            transparent: true,
            depthTest: false,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            opacity: 0.92,
          }),
        );
        sprite.scale.set(lesion.severity === '主要' ? 0.2 : 0.15, lesion.severity === '主要' ? 0.2 : 0.15, 1);
        sprite.position.copy(anchor.point);
        sprite.renderOrder = 12;
        markerGroup.add(sprite);

        const label = document.createElement('div');
        label.className = `body-label lesion-label ${lesion.severity === '主要' ? 'is-main' : ''}`;
        label.innerHTML = `<span class="body-label-no">${lesion.severity === '主要' ? '●' : '○'}</span>${lesion.label}`;
        const labelObject = new CSS2DObject(label);
        labelObject.position
          .copy(anchor.point)
          .add(new THREE.Vector3(0.08 + lesionIndex * 0.03, 0.08 + lesionIndex * 0.11, 0));
        labelGroup.add(labelObject);
      }

      if (current.selectedOrganId && !current.lesions.length) {
        const anchor = findAnchor(current.selectedOrganId);
        if (anchor) {
          selectionSprite.position.copy(anchor.point);
          selectionSprite.material.color.set(anchor.color);
          selectionSprite.visible = true;
          const meta = ORGAN_META.find(o => o.id === current.selectedOrganId);
          const label = document.createElement('div');
          label.className = 'body-label selected-organ-label';
          label.innerHTML = `<strong>${anchor.label}</strong><span>${meta?.meridian ?? ''}</span>`;
          const labelObject = new CSS2DObject(label);
          labelObject.position.copy(anchor.point).add(new THREE.Vector3(0.06, 0.08, 0));
          labelGroup.add(labelObject);
        }
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      downX = event.clientX;
      downY = event.clientY;
      downTime = performance.now();
      dragging = false;
      lastDragY = event.clientY;
      activePointerId = event.pointerId;
      renderer.domElement.setPointerCapture?.(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerId !== activePointerId) return;
      if (!dragging) {
        if (event.buttons !== 1 || Math.abs(event.clientY - downY) <= 4) return;
        dragging = true;
        lastDragY = event.clientY;
        renderer.domElement.style.cursor = 'grabbing';
      }
      const delta = event.clientY - lastDragY;
      lastDragY = event.clientY;
      if (delta) panBy(delta);
      event.preventDefault();
    };
    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerId !== activePointerId) return;
      renderer.domElement.releasePointerCapture?.(event.pointerId);
      activePointerId = -1;
      renderer.domElement.style.cursor = 'grab';
      if (dragging) {
        dragging = false;
        return;
      }
      const moved = Math.hypot(event.clientX - downX, event.clientY - downY);
      if (moved > 6 || performance.now() - downTime > 650) return;
      if (!currentAnchors.length) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const visibleMeshes = [...systemGroups.values()].filter(group => group.visible);
      const hits = raycaster.intersectObjects(visibleMeshes, true);
      if (!hits.length) return;
      hitPoint.copy(hits[0].point);
      let nearest: (typeof currentAnchors)[number] | null = null;
      let nearestDistance = Infinity;
      for (const anchor of currentAnchors) {
        const distance = anchor.point.distanceTo(hitPoint);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = anchor;
        }
      }
      if (nearest && nearestDistance < 0.28) {
        propsRef.current.onSelectOrgan?.(nearest.id);
      }
    };
    const onPointerCancel = (event: PointerEvent) => {
      if (event.pointerId !== activePointerId) return;
      activePointerId = -1;
      dragging = false;
      renderer.domElement.style.cursor = 'grab';
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointercancel', onPointerCancel);
    renderer.domElement.style.cursor = 'grab';

    const animate = () => {
      if (disposed) return;
      frame = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min((now - lastFrame) / 1000, 0.06);
      lastFrame = now;
      const current = propsRef.current;

      for (const [system, group] of systemGroups) {
        const bodyClipped = system === 'integumentary' && current.clip > 0.06;
        group.visible = current.visibleSystems.includes(system) && !bodyClipped;
      }
      ring.visible = current.clip < 0.02;
      ring2.visible = current.clip < 0.02;

      const clipAmount = current.clip;
      if (Math.abs(clipAmount - lastClip) > 0.002) {
        lastClip = clipAmount;
        clipPlane.constant = clipAmount <= 0.01 ? 10 : 0.26 - clipAmount * 0.72;
        for (const system of ['integumentary', 'skeletal', 'muscular'] as SystemId[]) {
          const material = materials.get(system);
          if (material) {
            (material as THREE.Material & { clippingPlanes?: THREE.Plane[] }).clippingPlanes =
              clipAmount > 0.01 ? [clipPlane] : [];
            material.needsUpdate = true;
          }
        }
      }

      if (current.particles) {
        qi.points.visible = true;
        damp.points.visible = true;
        const t = now * 0.00018;
        const qPos = qi.points.geometry.getAttribute('position') as THREE.BufferAttribute;
        for (let i = 0; i < qPos.count; i++) {
          const theta = qi.seeds[i * 4];
          const radius = qi.seeds[i * 4 + 1];
          const baseY = qi.seeds[i * 4 + 2];
          const phase = qi.seeds[i * 4 + 3] * Math.PI * 2;
          qPos.setXYZ(
            i,
            Math.cos(theta + t) * radius * 0.58,
            ((baseY + t * 0.55 + phase * 0.02) % 1.15) + 0.25,
            Math.sin(theta + t) * radius * 0.32,
          );
        }
        qPos.needsUpdate = true;
        const dPos = damp.points.geometry.getAttribute('position') as THREE.BufferAttribute;
        for (let i = 0; i < dPos.count; i++) {
          const theta = damp.seeds[i * 4];
          const radius = damp.seeds[i * 4 + 1];
          const baseY = damp.seeds[i * 4 + 2];
          dPos.setXYZ(
            i,
            Math.cos(theta - t * 0.62) * radius * 0.5,
            ((baseY + t * 0.28) % 1.2) + 0.28,
            Math.sin(theta - t * 0.62) * radius * 0.3,
          );
        }
        dPos.needsUpdate = true;
      } else {
        qi.points.visible = false;
        damp.points.visible = false;
      }

      if (current.selectedOrganId && current.focusOnSelect) {
        const anchor = currentAnchors.find(item => item.id === current.selectedOrganId);
        if (anchor) {
          const key = current.selectedOrganId;
          if (key !== focusKey) {
            focusKey = key;
            const desired = anchor.point;
            const direction = new THREE.Vector3(0.16, 0.05, 1).normalize();
            controls.target.copy(desired);
            camera.position.copy(desired).add(direction.multiplyScalar(1.55));
            controls.update();
          }
        }
      } else {
        focusKey = '';
      }

      controls.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
      rebuildMarkers();
    };

    const start = async () => {
      try {
        setProgress(2);
        atlas = await fetchAtlas();
        if (disposed) return;
        setProgress(6);

        const bodyBox = new THREE.Box3();
        for (const part of atlas.parts) {
          if (part.system !== 'integumentary') continue;
          bodyBox.expandByPoint(new THREE.Vector3().fromArray(part.bounds[0]));
          bodyBox.expandByPoint(new THREE.Vector3().fromArray(part.bounds[1]));
        }
        if (!bodyBox.isEmpty()) {
          const size = bodyBox.getSize(new THREE.Vector3());
          bodyCenterY = (bodyBox.min.y + bodyBox.max.y) / 2;
          bodyHeight = Math.max(size.y, 0.5);
          fitCamera();
        }

        currentAnchors = buildOrganAnchors(atlas);
        organAnchors.push(...currentAnchors);

        const coreChunks = pickCoreChunks(atlas);
        const coreSet = new Set(coreChunks);
        const remaining = rankBackgroundChunks(atlas, coreChunks);
        setDetailTotal(remaining.length);

        let coreLoaded = 0;
        await Promise.all(
          coreChunks.map(async index => {
            const buffer = await fetchChunkBuffer(atlas, index, controller.signal);
            if (coreSet.has(index)) coreChunkCache.set(index, buffer);
            if (disposed) return;
            addChunk(index, buffer);
            coreLoaded += 1;
            setProgress(6 + Math.round((coreLoaded / coreChunks.length) * 94));
          }),
        );
        if (disposed) return;

        // First frame is usable now; the remaining anatomy streams in without
        // blocking zoom, layer toggles, or organ selection.
        setProgress(100);
        setReady(true);
        onReady?.();

        const queue = remaining.slice();
        let detailsLoaded = 0;
        const workers = Array.from({ length: 3 }, async () => {
          while (queue.length) {
            if (disposed) return;
            const index = queue.shift();
            if (index === undefined) return;
            try {
              const buffer = await fetchChunkBuffer(atlas, index, controller.signal);
              if (disposed) return;
              addChunk(index, buffer);
            } catch {
              if (!disposed && !controller.signal.aborted) setDegraded(true);
            }
            if (disposed) return;
            detailsLoaded += 1;
            setDetailLoaded(detailsLoaded);
          }
        });
        await Promise.all(workers);
      } catch (err) {
        if (!disposed && !controller.signal.aborted) {
          setError(err instanceof Error ? err.message : '模型加载失败');
        }
      }
    };

    void start();
    frame = requestAnimationFrame(animate);

    return () => {
      disposed = true;
      controller.abort();
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointercancel', onPointerCancel);
      controls.dispose();
      scene.traverse(obj => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
          obj.geometry.dispose();
          const material = obj.material;
          if (Array.isArray(material)) material.forEach(item => item.dispose());
          else material.dispose();
        }
      });
      glowTexture.dispose();
      labelRenderer.domElement.remove();
      renderer.dispose();
      renderer.domElement.remove();
      host.innerHTML = '';
      apiRef.current = null;
    };
  }, [onReady]);

  const detailPct = detailTotal ? Math.round((detailLoaded / detailTotal) * 100) : 100;
  const status = !ready
    ? '模型载入中'
    : degraded
      ? '部分图层未载入'
      : detailLoaded < detailTotal
        ? `细节载入 ${detailPct}%`
        : '上下拖动 · 滚轮缩放';

  return (
    <div className={`body-viewer ${className}`}>
      <div
        ref={hostRef}
        className="body-viewer-host"
        tabIndex={0}
        onKeyDown={event => {
          if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
          event.preventDefault();
          if (event.key === 'ArrowUp') apiRef.current?.panUp();
          else apiRef.current?.panDown();
        }}
      />
      {ready && (
        <div className="viewer-pan-controls" aria-label="垂直移动模型">
          <button className="viewer-btn" onClick={() => apiRef.current?.panUp()} aria-label="向上移动">
            <ChevronUp size={14} />
          </button>
          <button className="viewer-btn" onClick={() => apiRef.current?.panDown()} aria-label="向下移动">
            <ChevronDown size={14} />
          </button>
        </div>
      )}
      <div className="viewer-corner viewer-corner-left">
        <span className="viewer-live-dot" />
        <span>{status}</span>
      </div>
      <div className="viewer-corner viewer-corner-right">
        <span>{SYSTEM_LABELS[visibleSystems[0]] ?? '数字人体'}</span>
        <span className="viewer-corner-sep">/</span>
        <span>BodyParts3D</span>
      </div>
      {!ready && !error && (
        <div className="viewer-loading">
          <div className="viewer-loading-mark">黄</div>
          <div className="viewer-loading-copy">
            <strong>正在装配数字人体</strong>
            <span>公开解剖数据 · 本体不发生旋转</span>
            <div className="viewer-progress">
              <i style={{ width: `${Math.max(2, progress)}%` }} />
            </div>
            <small>{progress}% · 首屏约 9 MB，其余解剖细节后台载入</small>
          </div>
        </div>
      )}
      {ready && degraded && (
        <div className="viewer-degraded">部分图层未载入 · 刷新可重试</div>
      )}
      {error && (
        <div className="viewer-error">
          <strong>3D 模型暂不可用</strong>
          <span>{error}</span>
          <span>你仍然可以使用病位列表与报告页；刷新页面可重试。</span>
        </div>
      )}
    </div>
  );
});
