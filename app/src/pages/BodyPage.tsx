import { useRef, useState } from 'react';
import { ArrowRight, Eye, EyeOff, Info, Layers3, Lock, Maximize2, Minus, Plus, RotateCcw, ScanEye } from 'lucide-react';
import { HumanBodyCanvas, type BodyViewerHandle } from '../anatomy/HumanBodyCanvas';
import type { SystemId } from '../anatomy/atlas';
import { BASE_BODY_LAYERS, ORGAN_IDS, ORGAN_META, ORGAN_BY_ID } from '../data';
import { go } from '../navigation';

const DEFAULT_BASE: SystemId[] = ['integumentary', 'skeletal'];

export default function BodyPage() {
  const viewer = useRef<BodyViewerHandle>(null);
  const [visibleBase, setVisibleBase] = useState<SystemId[]>(DEFAULT_BASE);
  const [visibleOrgans, setVisibleOrgans] = useState<string[]>([...ORGAN_IDS]);
  const [selected, setSelected] = useState('heart');
  const organ = ORGAN_BY_ID[selected] ?? ORGAN_META[0];

  const toggleBase = (id: SystemId) => {
    setVisibleBase(current =>
      current.includes(id) ? current.filter(item => item !== id) : [...current, id],
    );
  };

  const toggleOrgan = (id: string) => {
    setVisibleOrgans(current =>
      current.includes(id) ? current.filter(item => item !== id) : [...current, id],
    );
  };

  const resetLayers = () => {
    setVisibleBase(DEFAULT_BASE);
    setVisibleOrgans([...ORGAN_IDS]);
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
            visibleSystems={visibleBase}
            visibleOrgans={visibleOrgans}
            selectedOrganId={selected}
            onSelectOrgan={setSelected}
          />
          <div className="viewer-legend">
            <span><i className="legend-dot body" /> 体表</span>
            <span><i className="legend-dot organ" /> 五脏六腑</span>
            <span><i className="legend-dot muscle" /> 肌肉</span>
            <span><i className="legend-dot skeleton" /> 骨骼</span>
            <span className="viewer-legend-note">点击器官查看归属 · 滚轮缩放 · 上下拖动</span>
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

            <div className="layer-section-label">体表与支撑</div>
            <div className="layer-list compact">
              {BASE_BODY_LAYERS.map(layer => {
                const on = visibleBase.includes(layer.id);
                return (
                  <button key={layer.id} className={`layer-row ${on ? 'on' : ''}`} onClick={() => toggleBase(layer.id)}>
                    <span className="layer-state">{on ? <Eye size={13} /> : <EyeOff size={13} />}</span>
                    <span className="layer-copy"><b>{layer.label}</b><small>{layer.note}</small></span>
                    <span className="layer-switch"><i /></span>
                  </button>
                );
              })}
            </div>

            <div className="layer-section-label organ-label-row">
              <span>五脏六腑</span>
              <span>{visibleOrgans.length} / {ORGAN_META.length}</span>
            </div>
            <div className="organ-layer-grid">
              {ORGAN_META.map(item => {
                const on = visibleOrgans.includes(item.id);
                return (
                  <button
                    key={item.id}
                    className={`organ-layer-item ${on ? 'on' : ''}`}
                    onClick={() => toggleOrgan(item.id)}
                    title={on ? `隐藏${item.label}` : `显示${item.label}`}
                  >
                    <span className="organ-layer-dot" style={{ background: item.color }} />
                    <span>{item.label}</span>
                    <span className="layer-switch"><i /></span>
                  </button>
                );
              })}
            </div>

            <div className="layer-foot">
              <span>{visibleOrgans.length} 个脏腑 · {visibleBase.length} 个基础层</span>
              <button onClick={resetLayers}>恢复默认</button>
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
          <span>当前：{visibleOrgans.length} / {ORGAN_META.length} 个脏腑可见 · {visibleBase.length} 个基础层</span>
        </div>
        <div className="body-bottom-actions">
          <button className="btn btn-ghost" onClick={() => go('analysis')}>返回分析</button>
          <button className="btn btn-gold" onClick={() => go('inside')}>内部观察 <ArrowRight size={15} /></button>
        </div>
      </div>
    </div>
  );
}
