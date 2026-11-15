import type { Pattern } from '../types';

export type ParticleKind =
  | 'mist'
  | 'flame'
  | 'ice'
  | 'steam'
  | 'clot'
  | 'wave'
  | 'qiline'
  | 'vortex'
  | 'dust';

export type ParticleFlow =
  | 'rise'
  | 'sink'
  | 'out'
  | 'in'
  | 'swirl'
  | 'still'
  | 'exchange';

export interface OrganAbnormality {
  color: string;
  opacity: number;
  scale: number;
  roughness?: number;
  halo?: number;
  /** 0 = dark/dim (deficiency), 1 = bright (heat/inflammation). */
  glow?: number;
  particle: {
    kind: ParticleKind;
    color: string;
    density: number;
    speed: number;
    flow: ParticleFlow;
  };
}

export interface PatternVisual {
  category: string;
  accent: string;
  organs: Record<string, OrganAbnormality>;
  connector?: { color: string; opacity: number };
  note: string;
}

const ORGAN_ID_BY_TCM_LABEL: Record<string, string> = {
  心: 'heart',
  肝: 'liver',
  脾: 'spleen',
  肺: 'lung',
  肾: 'kidney',
  胃: 'stomach',
  胆: 'gallbladder',
  小肠: 'smallIntestine',
  大肠: 'largeIntestine',
  膀胱: 'bladder',
};

function organ(
  color: string,
  opacity: number,
  scale: number,
  kind: ParticleKind,
  density: number,
  speed: number,
  flow: ParticleFlow,
  roughness = 0.55,
  halo = 0.32,
  glow = 0.35,
): OrganAbnormality {
  return {
    color,
    opacity,
    scale,
    roughness,
    halo,
    glow,
    particle: { kind, color, density, speed, flow },
  };
}

// Exact entry: 规则总表第 9 行「心脾两虚」。
const HEART_SPLEEN_DEFICIENCY: PatternVisual = {
  category: '虚证',
  accent: '#D5C8B0',
  organs: {
    heart: organ('#D5C8B0', 0.55, 0.9, 'mist', 0.18, 0.2, 'exchange', 0.72, 0.3, 0.15),
    spleen: organ('#D8C8A8', 0.55, 0.9, 'mist', 0.18, 0.2, 'exchange', 0.72, 0.3, 0.15),
  },
  connector: { color: '#D5C8B0', opacity: 0.16 },
  note: '心脾双器官均暗淡、略萎小；稀疏双色微粒在心脾之间缓慢交流。',
};

// 规则表无同名项，由「肝气郁结」+「脾气虚」组合推导。
const LIVER_SPLEEN_DISHARMONY: PatternVisual = {
  category: '气机',
  accent: '#4A6B3C',
  organs: {
    liver: organ('#4A6B3C', 0.65, 1.04, 'qiline', 0.55, 0.5, 'swirl', 0.6, 0.32, 0.3),
    spleen: organ('#D0C0A0', 0.6, 0.9, 'mist', 0.25, 0.3, 'exchange', 0.7, 0.28, 0.15),
  },
  connector: { color: '#8A9A6A', opacity: 0.18 },
  note: '肝区以滞涩条索状微粒横向冲突，脾区以稀疏雾状微粒示弱；肝脾之间用暗线相连。',
};

// 规则表无同名项，由「痰湿体质」+「寒湿困脾」组合推导。
const PHLEGM_DAMP: PatternVisual = {
  category: '痰证',
  accent: '#C8C0B0',
  organs: {
    spleen: organ('#C8C0B0', 0.48, 1.12, 'steam', 0.65, 0.2, 'out', 0.78, 0.4, 0.2),
    stomach: organ('#C8C0B0', 0.48, 1.12, 'steam', 0.65, 0.2, 'sink', 0.78, 0.4, 0.2),
  },
  connector: { color: '#C8C0B0', opacity: 0.16 },
  note: '脾、胃被白浊湿团包裹，器官略胀大；黏稠微粒沉重缓慢地向外弥漫。',
};

const EXACT: Record<string, PatternVisual> = {
  心脾两虚: HEART_SPLEEN_DEFICIENCY,
  肝郁脾虚: LIVER_SPLEEN_DISHARMONY,
  痰湿内扰: PHLEGM_DAMP,
};

function fallbackVisual(pattern: Pattern): PatternVisual {
  const text = `${pattern.name} ${pattern.summary} ${pattern.organs.join(' ')}`;
  let config: OrganAbnormality;
  let category: string;
  let note: string;

  if (/热|火|发热|面赤/.test(text)) {
    category = '热证';
    config = organ('#E8705A', 0.8, 1.1, 'flame', 0.8, 1.5, 'rise', 0.4, 0.5, 0.85);
    note = '按热证规则：红橙暖色、火焰状上升、器官略胀大。';
  } else if (/寒|阳虚|冷|畏寒/.test(text)) {
    category = '寒证';
    config = organ('#AFC4D8', 0.5, 0.88, 'ice', 0.25, 0.2, 'sink', 0.68, 0.28, 0.12);
    note = '按寒证规则：蓝白冷色、冰晶缓沉、器官挛缩。';
  } else if (/痰|湿|水|腻/.test(text)) {
    category = '痰湿';
    config = organ('#C8C0B0', 0.5, 1.1, 'steam', 0.65, 0.25, 'out', 0.78, 0.4, 0.2);
    note = '按痰湿规则：白浊蒸汽团、黏滞缓慢、器官胀大。';
  } else if (/瘀|血|刺痛|紫暗/.test(text)) {
    category = '血分';
    config = organ('#6B2A45', 0.4, 1.0, 'clot', 0.35, 0.15, 'still', 0.62, 0.34, 0.18);
    note = '按血分规则：紫暗瘀色、斑块粒子、局部停滞。';
  } else if (/郁|气滞|气逆|胀痛/.test(text)) {
    category = '气机';
    config = organ('#4A6B3C', 0.6, 1.02, 'qiline', 0.5, 0.5, 'swirl', 0.58, 0.3, 0.3);
    note = '按气机规则：条索状微粒、不规律旋转、器官紧张。';
  } else {
    category = '虚证';
    config = organ('#D5C8B0', 0.55, 0.92, 'mist', 0.2, 0.25, 'sink', 0.72, 0.28, 0.15);
    note = '按虚证规则：淡白低饱和、稀疏缓沉微粒、器官略萎小。';
  }

  const organs: Record<string, OrganAbnormality> = {};
  for (const label of pattern.organs) {
    const id = ORGAN_ID_BY_TCM_LABEL[label];
    if (id) organs[id] = config;
  }
  return {
    category,
    accent: config.color,
    organs,
    connector: Object.keys(organs).length > 1 ? { color: config.color, opacity: 0.15 } : undefined,
    note,
  };
}

export function resolvePatternVisual(pattern?: Pattern | null): PatternVisual {
  if (!pattern) {
    return {
      category: '未匹配',
      accent: '#C9A86A',
      organs: {},
      note: '尚未选择主证候；画面仅保留数字人体总览。',
    };
  }
  return EXACT[pattern.name] ?? fallbackVisual(pattern);
}
