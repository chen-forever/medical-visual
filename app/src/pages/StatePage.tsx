import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Droplets, Eye, EyeOff, Info, RotateCcw, Sparkles, Wind } from 'lucide-react';
import { HumanBodyCanvas, type BodyViewerHandle } from '../anatomy/HumanBodyCanvas';
import type { SystemId } from '../anatomy/atlas';
import { CloudCorner, MeridianDivider, Seal } from '../components/TcmOrnaments';
import { ORGAN_BY_ID } from '../data';
import { resolvePatternVisual } from '../data/patternVisuals';
import { go } from '../navigation';
import { useCaseStore, usePrimaryPattern } from '../store';

const VISIBLE: SystemId[] = ['integumentary', 'skeletal', 'cardiac', 'respiratory', 'digestive', 'urinary', 'lymphatic', 'endocrine'];

const PARTICLE_LABEL: Record<string, string> = {
  mist: '雾状微粒',
  flame: '火焰粒子',
  ice: '冰晶粒子',
  steam: '蒸汽团',
  clot: '瘀斑粒子',
  wave: '流体波浪',
  qiline: '条索气浪',
  vortex: '旋涡粒子',
  dust: '干燥粉尘',
};

const FLOW_LABEL: Record<string, string> = {
  rise: '上升',
  sink: '下沉',
  out: '向外扩散',
  in: '向内收束',
  swirl: '旋转',
  still: '停滞',
  exchange: '双向交流',
};

const FIVE_ELEMENTS = [
  { key: 'wood', label: '木', organs: ['liver'] },
  { key: 'fire', label: '火', organs: ['heart'] },
  { key: 'earth', label: '土', organs: ['spleen', 'stomach'] },
  { key: 'metal', label: '金', organs: ['lung'] },
  { key: 'water', label: '水', organs: ['kidney'] },
];

const STATE_METRICS = [
  { id: 'qi', label: '气虚', value: 68, color: '#4fb3a9', note: '乏力、语声低微、脉细弱' },
  { id: 'damp', label: '湿困', value: 54, color: '#c9a86a', note: '舌淡胖、便溏、纳差' },
  { id: 'mind', label: '心神不宁', value: 42, color: '#c8472f', note: '入睡困难、多梦易醒' },
];

export default function StatePage() {
  const viewer = useRef<BodyViewerHandle>(null);
  const pattern = usePrimaryPattern();
  const patient = useCaseStore(state => state.patient);
  const visual = useMemo(() => resolvePatternVisual(pattern), [pattern]);
  const affected = new Set(Object.keys(visual.organs));
  const [particles, setParticles] = useState(true);
  const [selected, setSelected] = useState('heart');

  useEffect(() => {
    if (!visual.organs[selected]) {
      setSelected(Object.keys(visual.organs)[0] ?? 'heart');
    }
  }, [selected, visual]);

  return (
    <div className="state-page">
      <div className="state-layout">
        <section className="viewer-panel state-viewer">
          <div className="viewer-toolbar">
            <div className="viewer-toolbar-left">
              <span className="live-badge teal"><i /> 当前状态</span>
              <span className="toolbar-sep" />
              <span className="toolbar-note"><Sparkles size={12} /> 病位粒子 / 气机示意</span>
            </div>
            <div className="viewer-toolbar-right">
              <button className={`viewer-btn ${particles ? 'active' : ''}`} onClick={() => setParticles(value => !value)} aria-label="切换粒子">
                {particles ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
              <button className="viewer-btn" onClick={() => viewer.current?.zoomOut()} aria-label="缩小">−</button>
              <button className="viewer-btn" onClick={() => viewer.current?.zoomIn()} aria-label="放大">＋</button>
              <button className="viewer-btn" onClick={() => viewer.current?.reset()} aria-label="复位"><RotateCcw size={14} /></button>
            </div>
          </div>
          <HumanBodyCanvas
            ref={viewer}
            visibleSystems={VISIBLE}
            selectedOrganId={selected}
            onSelectOrgan={setSelected}
            particles={particles}
            organVisuals={visual.organs}
            visibleOrgans={Object.keys(visual.organs)}
            isolateOrgans
          />
          <div className="state-overlay">
            <div className="state-overlay-card">
              <span className="panel-kicker">CURRENT READING</span>
              <div className="state-overlay-title">
                <Seal text="辨证" size="sm" />
                <strong>{pattern?.name}</strong>
              </div>
              <p>{patient.alias} · 当前状态切片</p>
            </div>
            <div className="state-particle-key">
              <span><i style={{ background: visual.accent }} /> 病位器官</span>
              <span>{Object.keys(visual.organs).length} 个病位 · 粒子可开关</span>
            </div>
          </div>
        </section>

        <aside className="state-side">
          <section className="panel side-panel">
            <div className="panel-head">
              <div><span className="panel-kicker">STATE / 状态摘要</span><h3>三个核心读法</h3></div>
              <Info size={15} className="muted-icon" />
            </div>
            <div className="state-metrics">
              {STATE_METRICS.map(metric => (
                <div className="state-metric" key={metric.id}>
                  <div className="state-metric-head">
                    <span><i style={{ background: metric.color }} />{metric.label}</span>
                    <b>{metric.value}%</b>
                  </div>
                  <div className="state-track"><i style={{ width: `${metric.value}%`, background: metric.color }} /></div>
                  <small>{metric.note}</small>
                </div>
              ))}
            </div>
            <button className={`switch-row ${particles ? 'on' : ''}`} onClick={() => setParticles(value => !value)}>
              <span><Wind size={14} /> 显示病位粒子</span>
              <i />
            </button>
          </section>

          <section className="panel side-panel">
            <div className="panel-head"><div><span className="panel-kicker">LEGEND / 图例</span><h3>颜色与动效含义</h3></div></div>
            <div className="legend-list">
              {Object.entries(visual.organs).map(([organId, state]) => {
                const meta = ORGAN_BY_ID[organId];
                return (
                  <div key={organId}>
                    <span className="legend-orb" style={{ background: state.color }} />
                    <div>
                      <b>{meta?.label ?? organId} · {PARTICLE_LABEL[state.particle.kind]}</b>
                      <p>
                        {FLOW_LABEL[state.particle.flow]} · 密度 {Math.round(state.particle.density * 100)}%
                        · 透明度 {Math.round(state.opacity * 100)}%
                      </p>
                    </div>
                  </div>
                );
              })}
              {!Object.keys(visual.organs).length && (
                <div><span className="legend-orb gold" /><div><b>暂无可映射器官</b><p>当前证型未对应独立器官网格。</p></div></div>
              )}
            </div>
            <p className="small-copy" style={{ marginTop: 9 }}>{visual.note}</p>
            <MeridianDivider label="五行 / 脏腑" />
            <div className="tcm-five-elements">
              {FIVE_ELEMENTS.map(element => (
                <span
                  key={element.key}
                  className={`tcm-element ${element.key} ${element.organs.some(id => affected.has(id)) ? 'active' : ''}`}
                >
                  <i /> {element.label}
                </span>
              ))}
            </div>
            <CloudCorner position="tr" />
          </section>

          <section className="panel side-panel">
            <div className="panel-head"><div><span className="panel-kicker">INTERPRETATION</span><h3>一句话解释</h3></div></div>
            <p className="interpretation">
              “{patient.alias}目前以<strong>{pattern?.name ?? '待确认证型'}</strong>为主线。
              {visual.note}画面中的颜色、粒子密度与流向，都按证型视觉规则生成，不作真实病理测量。”
            </p>
            <div className="state-actions">
              <button className={`toggle-pill ${particles ? 'on' : ''}`} onClick={() => setParticles(value => !value)}>
                <Droplets size={13} /> 病位粒子 {particles ? '开' : '关'}
              </button>
              <button className="text-btn" onClick={() => go('inside')}>调整器官 <ArrowRight size={13} /></button>
            </div>
          </section>
        </aside>
      </div>

      <div className="body-bottom">
        <div className="body-bottom-copy">
          <span className="panel-kicker">NEXT / 下一步</span>
          <strong>把医生已经给出的药方记录下来。</strong>
          <span>系统只记录方案，不生成剂量建议，也不判断处方优劣。</span>
        </div>
        <div className="body-bottom-actions">
          <button className="btn btn-ghost" onClick={() => go('lesion')}>返回病位</button>
          <button className="btn btn-gold" onClick={() => go('formula')}>输入药方 <ArrowRight size={15} /></button>
        </div>
      </div>
    </div>
  );
}
