import { useRef, useState } from 'react';
import { ArrowRight, CircleAlert, MapPin, Plus, RotateCcw, ShieldAlert, Trash2 } from 'lucide-react';
import { HumanBodyCanvas, type BodyViewerHandle } from '../anatomy/HumanBodyCanvas';
import type { SystemId } from '../anatomy/atlas';
import { ORGAN_META, ORGAN_BY_ID } from '../data';
import { go } from '../navigation';
import { useCaseStore } from '../store';
import type { Lesion } from '../types';

const VISIBLE: SystemId[] = ['integumentary', 'skeletal', 'cardiac', 'respiratory', 'digestive', 'urinary', 'lymphatic', 'endocrine'];

export default function LesionPage() {
  const viewer = useRef<BodyViewerHandle>(null);
  const lesions = useCaseStore(state => state.lesions);
  const addLesion = useCaseStore(state => state.addLesion);
  const removeLesion = useCaseStore(state => state.removeLesion);
  const setLesions = useCaseStore(state => state.setLesions);
  const [selectedId, setSelectedId] = useState(lesions[0]?.id ?? '');
  const [adding, setAdding] = useState(false);
  const selected = lesions.find(item => item.id === selectedId) ?? lesions[0];
  const selectedOrgan = selected ? ORGAN_BY_ID[selected.organId] : undefined;

  const add = (organId: string) => {
    const organ = ORGAN_BY_ID[organId];
    if (!organ) return;
    if (lesions.some(item => item.organId === organId)) {
      setAdding(false);
      const existing = lesions.find(item => item.organId === organId);
      if (existing) setSelectedId(existing.id);
      return;
    }
    const lesion: Lesion = {
      id: `l-${Date.now()}`,
      organId,
      label: `${organ.label}相关病位`,
      severity: '观察',
      evidence: '待补充：请结合四诊信息填写依据。',
    };
    addLesion(lesion);
    setSelectedId(lesion.id);
    setAdding(false);
  };

  return (
    <div className="lesion-page">
      <div className="lesion-layout">
        <section className="viewer-panel lesion-viewer">
          <div className="viewer-toolbar">
            <div className="viewer-toolbar-left">
              <span className="live-badge red"><i /> 病位标记</span>
              <span className="toolbar-sep" />
              <span className="toolbar-note"><MapPin size={12} /> {lesions.length} 个标记</span>
            </div>
            <div className="viewer-toolbar-right">
              <button className="viewer-btn" onClick={() => viewer.current?.zoomOut()} aria-label="缩小">−</button>
              <button className="viewer-btn" onClick={() => viewer.current?.zoomIn()} aria-label="放大">＋</button>
              <button className="viewer-btn" onClick={() => viewer.current?.reset()} aria-label="复位"><RotateCcw size={14} /></button>
            </div>
          </div>
          <HumanBodyCanvas
            ref={viewer}
            visibleSystems={VISIBLE}
            selectedOrganId={selected?.organId}
            onSelectOrgan={organId => {
              const existing = lesions.find(item => item.organId === organId);
              if (existing) setSelectedId(existing.id);
            }}
            lesions={lesions}
            focusOnSelect
          />
          <div className="lesion-legend">
            <span><i className="legend-dot red" /> 主要病位</span>
            <span><i className="legend-dot gold" /> 次要/观察</span>
            <span>标记为理论映射，不是影像病灶</span>
          </div>
        </section>

        <aside className="lesion-side">
          <section className="panel side-panel">
            <div className="panel-head">
              <div><span className="panel-kicker">LOCATIONS / 病位</span><h3>{lesions.length} 个病位</h3></div>
              <button className="btn btn-ghost small" onClick={() => setAdding(value => !value)}>
                <Plus size={13} /> 添加
              </button>
            </div>

            {adding && (
              <div className="add-lesion-grid">
                {ORGAN_META.map(organ => (
                  <button key={organ.id} onClick={() => add(organ.id)}>
                    <i style={{ background: organ.color }} /> {organ.label}
                  </button>
                ))}
              </div>
            )}

            <div className="lesion-list">
              {lesions.map((lesion, index) => {
                const organ = ORGAN_BY_ID[lesion.organId];
                return (
                  <button
                    key={lesion.id}
                    className={`lesion-item ${selected?.id === lesion.id ? 'active' : ''}`}
                    onClick={() => setSelectedId(lesion.id)}
                  >
                    <span className={`lesion-index ${lesion.severity === '主要' ? 'major' : ''}`}>{index + 1}</span>
                    <span className="lesion-copy">
                      <b>{lesion.label}</b>
                      <small>{organ?.label} · {organ?.meridian}</small>
                    </span>
                    <span className={`severity ${lesion.severity === '主要' ? 'major' : ''}`}>{lesion.severity}</span>
                  </button>
                );
              })}
            </div>

            {selected && (
              <div className="lesion-detail">
                <div className="lesion-detail-head">
                  <span>依据</span>
                  <button onClick={() => removeLesion(selected.id)} aria-label="删除病位"><Trash2 size={13} /></button>
                </div>
                <p>{selected.evidence}</p>
                <div className="lesion-detail-tags">
                  <span>{selectedOrgan?.tcmOrgan}</span>
                  <span>{selectedOrgan?.meridian}</span>
                </div>
              </div>
            )}
          </section>

          <section className="panel side-panel">
            <div className="panel-head"><div><span className="panel-kicker">EVIDENCE / 证据</span><h3>这些标记从哪来</h3></div></div>
            <div className="evidence-stack">
              <div><span>1</span><p>证型候选「心脾两虚」的主病位是心、脾。</p></div>
              <div><span>2</span><p>纳差、便溏支持脾失健运；入睡困难、多梦支持心神失养。</p></div>
              <div><span>3</span><p>胃纳不和作为次要病位，来自食欲不振与饭后腹胀。</p></div>
            </div>
            <div className="warning-note"><ShieldAlert size={14} /><span>病位数量上限为 5；超过时应回到证据，而不是继续加标记。</span></div>
          </section>

          <section className="panel side-panel">
            <div className="panel-head"><div><span className="panel-kicker">CLEAN UP</span><h3>整理标记</h3></div></div>
            <div className="lesion-actions">
              <button onClick={() => setLesions([])}><RotateCcw size={13} /> 清空全部</button>
              <button onClick={() => setLesions(lesions.filter(item => item.severity === '主要'))}><CircleAlert size={13} /> 只保留主要</button>
            </div>
            <p className="small-copy">清空后可在上方重新添加；演示病例可随时重置。</p>
          </section>
        </aside>
      </div>

      <div className="body-bottom">
        <div className="body-bottom-copy">
          <span className="panel-kicker">NEXT / 下一步</span>
          <strong>用颜色和流动解释“现在是什么状态”。</strong>
          <span>病位是空间，状态是时间切片上的气机与病机。</span>
        </div>
        <div className="body-bottom-actions">
          <button className="btn btn-ghost" onClick={() => go('inside')}>返回内部</button>
          <button className="btn btn-gold" onClick={() => go('state')}>查看当前状态 <ArrowRight size={15} /></button>
        </div>
      </div>
    </div>
  );
}
