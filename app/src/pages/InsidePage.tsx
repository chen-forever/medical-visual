import { useMemo, useRef, useState } from 'react';
import { ArrowRight, Layers3, Minus, Plus, RotateCcw, Scissors, SlidersHorizontal } from 'lucide-react';
import { HumanBodyCanvas, type BodyViewerHandle } from '../anatomy/HumanBodyCanvas';
import type { SystemId } from '../anatomy/atlas';
import { LAYER_GROUPS } from '../anatomy/labels';
import { ORGAN_META, ORGAN_BY_ID } from '../data';
import { go } from '../navigation';

const STOMACH_LAYERS = [
  { id: 'mucosa', name: '黏膜层', color: '#c98b7a', note: '胃腑最内层，直接接触水谷；中医以“胃气”概括受纳腐熟。' },
  { id: 'submucosa', name: '黏膜下层', color: '#c9a86a', note: '含血管与神经，是营养与信号传递的通道。' },
  { id: 'muscularis', name: '肌层', color: '#a47d62', note: '负责搅拌与推进；与“胃主通降”的功能相对应。' },
  { id: 'serosa', name: '浆膜层', color: '#7f8f82', note: '外层保护，与周围组织相隔。' },
];

export default function InsidePage() {
  const viewer = useRef<BodyViewerHandle>(null);
  const [clip, setClip] = useState(0);
  const [selected, setSelected] = useState('stomach');
  const [layer, setLayer] = useState('mucosa');
  const [onlyOrgans, setOnlyOrgans] = useState(false);
  const organ = ORGAN_BY_ID[selected] ?? ORGAN_BY_ID.stomach;

  const visible = useMemo<SystemId[]>(
    () =>
      onlyOrgans
        ? ['cardiac', 'respiratory', 'digestive', 'urinary', 'lymphatic', 'endocrine', 'nervous']
        : ['integumentary', 'skeletal', 'cardiac', 'respiratory', 'digestive', 'urinary', 'lymphatic', 'endocrine'],
    [onlyOrgans],
  );

  return (
    <div className="inside-page">
      <div className="inside-layout">
        <section className="viewer-panel inside-viewer">
          <div className="viewer-toolbar">
            <div className="viewer-toolbar-left">
              <span className="live-badge"><i /> 内部观察</span>
              <span className="toolbar-sep" />
              <span className="toolbar-note"><Scissors size={12} /> 剖面示意</span>
            </div>
            <div className="viewer-toolbar-right">
              <button className="viewer-btn" onClick={() => viewer.current?.zoomOut()} aria-label="缩小"><Minus size={15} /></button>
              <button className="viewer-btn" onClick={() => viewer.current?.zoomIn()} aria-label="放大"><Plus size={15} /></button>
              <button className="viewer-btn" onClick={() => viewer.current?.reset()} aria-label="复位"><RotateCcw size={14} /></button>
            </div>
          </div>
          <HumanBodyCanvas
            ref={viewer}
            visibleSystems={visible}
            selectedOrganId={selected}
            onSelectOrgan={setSelected}
            clip={clip}
            focusOnSelect
          />
          <div className="clip-control">
            <div className="clip-head"><span>剖面深度</span><b>{Math.round(clip * 100)}%</b></div>
            <input
              type="range"
              min={0}
              max={100}
              value={clip * 100}
              onChange={event => setClip(Number(event.target.value) / 100)}
              aria-label="剖面深度"
            />
            <div className="clip-foot"><span>完整体表</span><span>内部可见</span></div>
          </div>
        </section>

        <aside className="inside-side">
          <section className="panel side-panel">
            <div className="panel-head">
              <div><span className="panel-kicker">FOCUS / 聚焦</span><h3>{organ.label}</h3></div>
              <span className="organ-swatch" style={{ background: organ.color }} />
            </div>
            <p className="side-lede">{organ.description}</p>
            <div className="organ-detail-meta compact">
              <div><span>中医归属</span><strong>{organ.tcmOrgan}</strong></div>
              <div><span>经络</span><strong>{organ.meridian}</strong></div>
            </div>
            <div className="organ-pills">
              {ORGAN_META.slice(0, 6).map(item => (
                <button key={item.id} className={selected === item.id ? 'active' : ''} onClick={() => setSelected(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
            <button className={`switch-row ${onlyOrgans ? 'on' : ''}`} onClick={() => setOnlyOrgans(value => !value)}>
              <span><Layers3 size={14} /> 只看脏腑</span>
              <i />
            </button>
          </section>

          <section className="panel side-panel stomach-panel">
            <div className="panel-head">
              <div>
                <span className="panel-kicker">STOMACH WALL / 胃壁</span>
                <h3>四层结构 · 示意</h3>
              </div>
              <span className="mini-badge">非真实网格</span>
            </div>
            <div className="stomach-stack">
              {STOMACH_LAYERS.map(item => (
                <button
                  key={item.id}
                  className={`stomach-layer ${layer === item.id ? 'active' : ''}`}
                  onClick={() => setLayer(item.id)}
                  style={{ '--layer-color': item.color } as React.CSSProperties}
                >
                  <span className="stomach-color" />
                  <span className="stomach-name">{item.name}</span>
                  <span className="stomach-line" />
                </button>
              ))}
            </div>
            <p className="stomach-note">{STOMACH_LAYERS.find(item => item.id === layer)?.note}</p>
            <div className="section-hint"><SlidersHorizontal size={13} /> 真实胃壁分层需要专用网格；当前用色带与剖面辅助理解。</div>
          </section>

          <section className="panel side-panel">
            <div className="panel-head"><div><span className="panel-kicker">LAYERS</span><h3>图层快捷键</h3></div></div>
            <div className="quick-layer-list">
              {LAYER_GROUPS.slice(1, 7).map(item => (
                <span key={item.id}><i />{item.label}</span>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <div className="body-bottom">
        <div className="body-bottom-copy">
          <span className="panel-kicker">NEXT / 下一步</span>
          <strong>把证型落到具体病位，控制在 3～5 个。</strong>
          <span>内部观察用于解释，不用于病灶检测。</span>
        </div>
        <div className="body-bottom-actions">
          <button className="btn btn-ghost" onClick={() => go('body')}>返回人体</button>
          <button className="btn btn-gold" onClick={() => go('lesion')}>去定位病位 <ArrowRight size={15} /></button>
        </div>
      </div>
    </div>
  );
}
