import { useRef, useState } from 'react';
import { ArrowRight, Droplets, Eye, EyeOff, Info, RotateCcw, Sparkles, Wind } from 'lucide-react';
import { HumanBodyCanvas, type BodyViewerHandle } from '../anatomy/HumanBodyCanvas';
import type { SystemId } from '../anatomy/atlas';
import { go } from '../navigation';
import { useCaseStore, usePrimaryPattern } from '../store';

const VISIBLE: SystemId[] = ['integumentary', 'skeletal', 'cardiac', 'respiratory', 'digestive', 'urinary', 'lymphatic', 'endocrine'];

const STATE_METRICS = [
  { id: 'qi', label: '气虚', value: 68, color: '#4fb3a9', note: '乏力、语声低微、脉细弱' },
  { id: 'damp', label: '湿困', value: 54, color: '#c9a86a', note: '舌淡胖、便溏、纳差' },
  { id: 'mind', label: '心神不宁', value: 42, color: '#c8472f', note: '入睡困难、多梦易醒' },
];

export default function StatePage() {
  const viewer = useRef<BodyViewerHandle>(null);
  const pattern = usePrimaryPattern();
  const patient = useCaseStore(state => state.patient);
  const [particles, setParticles] = useState(true);
  const [selected, setSelected] = useState('heart');

  return (
    <div className="state-page">
      <div className="state-layout">
        <section className="viewer-panel state-viewer">
          <div className="viewer-toolbar">
            <div className="viewer-toolbar-left">
              <span className="live-badge teal"><i /> 当前状态</span>
              <span className="toolbar-sep" />
              <span className="toolbar-note"><Sparkles size={12} /> 气机 / 湿象粒子</span>
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
            focusOnSelect
          />
          <div className="state-overlay">
            <div className="state-overlay-card">
              <span className="panel-kicker">CURRENT READING</span>
              <strong>{pattern?.name}</strong>
              <p>{patient.alias} · 当前状态切片</p>
            </div>
            <div className="state-particle-key">
              <span><i className="particle-dot teal" /> 气机</span>
              <span><i className="particle-dot gold" /> 湿浊</span>
              <span><i className="particle-dot red" /> 病位</span>
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
              <span><Wind size={14} /> 显示气机粒子</span>
              <i />
            </button>
          </section>

          <section className="panel side-panel">
            <div className="panel-head"><div><span className="panel-kicker">LEGEND / 图例</span><h3>颜色与动效含义</h3></div></div>
            <div className="legend-list">
              <div><span className="legend-orb teal" /><div><b>青金 · 气机</b><p>缓慢上升与回旋，表示气机运行；强度对应气虚程度。</p></div></div>
              <div><span className="legend-orb gold" /><div><b>金色 · 湿浊</b><p>密度更高、速度更慢，表示湿象偏重；不作为真实体液测量。</p></div></div>
              <div><span className="legend-orb red" /><div><b>朱砂 · 病位</b><p>只标记有证据支持的主要病位，面积受控，不铺满全屏。</p></div></div>
            </div>
          </section>

          <section className="panel side-panel">
            <div className="panel-head"><div><span className="panel-kicker">INTERPRETATION</span><h3>一句话解释</h3></div></div>
            <p className="interpretation">
              “{patient.alias}目前以<strong>心脾两虚</strong>为主线：脾气虚则气血生化不足，心血虚则心神失养。
              画面中的青金气流偏弱、金色湿点偏密，是为了把这两个方向同时讲清楚。”
            </p>
            <div className="state-actions">
              <button className={`toggle-pill ${particles ? 'on' : ''}`} onClick={() => setParticles(value => !value)}>
                <Droplets size={13} /> 湿象粒子 {particles ? '开' : '关'}
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
