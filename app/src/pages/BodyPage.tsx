import { useRef, useState } from 'react';
import { ArrowRight, Eye, EyeOff, Info, Layers3, Lock, Maximize2, Minus, Plus, RotateCcw, ScanEye } from 'lucide-react';
import { HumanBodyCanvas, type BodyViewerHandle } from '../anatomy/HumanBodyCanvas';
import type { SystemId } from '../anatomy/atlas';
import { LAYER_GROUPS, SYSTEM_LABELS } from '../anatomy/labels';
import { ORGAN_META, ORGAN_BY_ID } from '../data';
import { go } from '../navigation';

const DEFAULT_VISIBLE: SystemId[] = [
  'integumentary',
  'skeletal',
  'cardiac',
  'respiratory',
  'digestive',
  'urinary',
  'lymphatic',
  'endocrine',
];

export default function BodyPage() {
  const viewer = useRef<BodyViewerHandle>(null);
  const [visible, setVisible] = useState<SystemId[]>(DEFAULT_VISIBLE);
  const [selected, setSelected] = useState('heart');
  const organ = ORGAN_BY_ID[selected] ?? ORGAN_META[0];

  const toggle = (id: SystemId) => {
    setVisible(current =>
      current.includes(id) ? current.filter(item => item !== id) : [...current, id],
    );
  };

  return (
    <div className="body-page">
      <div className="viewer-layout">
        <section className="viewer-panel">
          <div className="viewer-toolbar">
            <div className="viewer-toolbar-left">
              <span className="live-badge"><i /> 正面视图</span>
              <span className="toolbar-sep" />
              <span className="toolbar-note"><Lock size={12} /> 旋转已锁定</span>
            </div>
            <div className="viewer-toolbar-right">
              <button className="viewer-btn" onClick={() => viewer.current?.zoomOut()} aria-label="缩小"><Minus size={15} /></button>
              <button className="viewer-btn" onClick={() => viewer.current?.zoomIn()} aria-label="放大"><Plus size={15} /></button>
              <button className="viewer-btn" onClick={() => viewer.current?.reset()} aria-label="复位"><RotateCcw size={14} /></button>
              <button className="viewer-btn" aria-label="全屏" onClick={() => document.querySelector('.viewer-panel')?.requestFullscreen?.()}><Maximize2 size={14} /></button>
            </div>
          </div>
          <HumanBodyCanvas
            ref={viewer}
            visibleSystems={visible}
            selectedOrganId={selected}
            onSelectOrgan={setSelected}
          />
          <div className="viewer-legend">
            <span><i className="legend-dot body" /> 体表</span>
            <span><i className="legend-dot organ" /> 脏腑</span>
            <span><i className="legend-dot vessel" /> 血脉</span>
            <span><i className="legend-dot nerve" /> 神经</span>
            <span className="viewer-legend-note">点击脏腑查看归属 · 滚轮缩放</span>
          </div>
        </section>

        <aside className="viewer-side">
          <section className="panel side-panel organ-detail">
            <div className="panel-head">
              <div>
                <span className="panel-kicker">SELECTED / 当前选中</span>
                <h3>{organ.label}</h3>
              </div>
              <span className="organ-swatch" style={{ background: organ.color }} />
            </div>
            <div className="organ-detail-meta">
              <div><span>中医归属</span><strong>{organ.tcmOrgan}</strong></div>
              <div><span>相关经络</span><strong>{organ.meridian}</strong></div>
            </div>
            <p>{organ.description}</p>
            <div className="organ-links">
              <button className="text-btn" onClick={() => go('inside')}>内部观察 <ArrowRight size={13} /></button>
              <button className="text-btn" onClick={() => go('lesion')}>标记病位 <ScanEye size={13} /></button>
            </div>
          </section>

          <section className="panel side-panel layers-panel">
            <div className="panel-head">
              <div>
                <span className="panel-kicker">LAYERS / 图层</span>
                <h3>显示与隐藏</h3>
              </div>
              <Layers3 size={16} className="muted-icon" />
            </div>
            <div className="layer-list">
              {LAYER_GROUPS.map(layer => {
                const on = visible.includes(layer.id);
                return (
                  <button key={layer.id} className={`layer-row ${on ? 'on' : ''}`} onClick={() => toggle(layer.id)}>
                    <span className="layer-state">{on ? <Eye size={13} /> : <EyeOff size={13} />}</span>
                    <span className="layer-copy"><b>{layer.label}</b><small>{layer.note}</small></span>
                    <span className="layer-switch"><i /></span>
                  </button>
                );
              })}
            </div>
            <div className="layer-foot">
              <span>{visible.length} 个图层可见</span>
              <button onClick={() => setVisible(DEFAULT_VISIBLE)}>恢复默认</button>
            </div>
          </section>

          <section className="panel side-panel organ-index">
            <div className="panel-head">
              <div>
                <span className="panel-kicker">QUICK JUMP / 脏腑索引</span>
                <h3>快速定位</h3>
              </div>
            </div>
            <div className="organ-index-grid">
              {ORGAN_META.map(item => (
                <button
                  key={item.id}
                  className={`organ-index-item ${selected === item.id ? 'active' : ''}`}
                  onClick={() => setSelected(item.id)}
                >
                  <i style={{ background: item.color }} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
            <div className="source-note">
              <Info size={13} />
              <span>公开模型：Human Atlas / BodyParts3D 4.0 · CC BY 4.0。当前为成人男性参考解剖，不表示患者个体差异。</span>
            </div>
          </section>
        </aside>
      </div>

      <div className="body-bottom">
        <div className="body-bottom-copy">
          <span className="panel-kicker">NEXT / 下一步</span>
          <strong>进入内部观察，看看病位与器官的关系。</strong>
          <span>当前图层：{visible.map(item => SYSTEM_LABELS[item]).join(' · ')}</span>
        </div>
        <div className="body-bottom-actions">
          <button className="btn btn-ghost" onClick={() => go('analysis')}>返回分析</button>
          <button className="btn btn-gold" onClick={() => go('inside')}>内部观察 <ArrowRight size={15} /></button>
        </div>
      </div>
    </div>
  );
}
