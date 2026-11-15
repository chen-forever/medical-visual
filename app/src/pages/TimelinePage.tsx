import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CalendarDays, Info, Pause, Play, RotateCcw, Sparkles, TrendingUp } from 'lucide-react';
import { HumanBodyCanvas, type BodyViewerHandle } from '../anatomy/HumanBodyCanvas';
import type { SystemId } from '../anatomy/atlas';
import BodyGlyph from '../components/BodyGlyph';
import { ORGAN_BY_ID, SIMULATION } from '../data';
import { resolveSecondaryOrganVisual, resolveTimelineVisual } from '../data/patternVisuals';
import { go } from '../navigation';
import { useCaseStore, usePrimaryPattern } from '../store';

const CHART_W = 760;
const CHART_H = 250;
const PAD = { top: 24, right: 22, bottom: 34, left: 34 };
const MAX_PROGRESS = SIMULATION.length - 1;

const TIMELINE_SYSTEMS: SystemId[] = [
  'integumentary',
  'skeletal',
  'cardiac',
  'respiratory',
  'digestive',
  'urinary',
  'lymphatic',
  'endocrine',
  'nervous',
];

function chartPoint(index: number, value: number) {
  const innerW = CHART_W - PAD.left - PAD.right;
  const innerH = CHART_H - PAD.top - PAD.bottom;
  return {
    x: PAD.left + (index / (SIMULATION.length - 1)) * innerW,
    y: PAD.top + (1 - value / 100) * innerH,
  };
}

function linePath(key: 'score' | 'sleep' | 'appetite' | 'energy') {
  return SIMULATION.map((point, index) => {
    const { x, y } = chartPoint(index, point[key]);
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function interpolateSimulation(progress: number) {
  const value = Math.max(0, Math.min(MAX_PROGRESS, progress));
  const index = Math.min(Math.floor(value), MAX_PROGRESS - 1);
  const t = value - index;
  const from = SIMULATION[index];
  const to = SIMULATION[Math.min(index + 1, MAX_PROGRESS)];
  const mix = (a: number, b: number) => a + (b - a) * t;
  return {
    ...from,
    day: mix(from.day, to.day),
    label:
      t < 0.02
        ? from.label
        : t > 0.98
          ? to.label
          : `第 ${Math.round(mix(from.day, to.day))} 天`,
    score: mix(from.score, to.score),
    sleep: mix(from.sleep, to.sleep),
    appetite: mix(from.appetite, to.appetite),
    energy: mix(from.energy, to.energy),
    damp: mix(from.damp, to.damp),
    note:
      t < 0.02
        ? from.note
        : t > 0.98
          ? to.note
          : `模拟过渡：${from.label} → ${to.label}，器官颜色、透明度与粒子参数连续变化。`,
  };
}

function recoveryAt(point: ReturnType<typeof interpolateSimulation>) {
  const base = SIMULATION[0];
  const final = SIMULATION[MAX_PROGRESS];
  const scorePart = (point.score - base.score) / Math.max(1, final.score - base.score);
  const dampPart = (base.damp - point.damp) / Math.max(1, base.damp - final.damp);
  // The 30-day slice is a "phase result", not a claim of complete recovery:
  // keep a residual visual state so the comparison still has something to see.
  return clamp01(scorePart * 0.7 + dampPart * 0.3) * 0.82;
}

export default function TimelinePage() {
  const viewer = useRef<BodyViewerHandle>(null);
  const pattern = usePrimaryPattern();
  const patient = useCaseStore(state => state.patient);
  const formula = useCaseStore(state => state.formula);
  const lesions = useCaseStore(state => state.lesions);
  const setHorizon = useCaseStore(state => state.setHorizon);
  const markComplete = useCaseStore(state => state.markComplete);

  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const [playing, setPlaying] = useState(false);

  const current = useMemo(() => interpolateSimulation(progress), [progress]);
  const dayIndex = Math.round(progress);
  const recovery = useMemo(() => recoveryAt(current), [current]);
  const visual = useMemo(() => {
    const baseVisual = resolveTimelineVisual(pattern, recovery);
    const organs = { ...baseVisual.organs };
    for (const lesion of lesions) {
      if (organs[lesion.organId]) continue;
      const secondary = resolveSecondaryOrganVisual(lesion.organId, recovery);
      if (secondary) organs[lesion.organId] = secondary;
    }
    return { ...baseVisual, organs };
  }, [lesions, pattern, recovery]);
  const affected = useMemo(() => Object.keys(visual.organs), [visual]);
  const activeHorizon = progress >= 2.5 ? 30 : progress >= 1.5 ? 14 : progress >= 0.5 ? 7 : null;

  const seek = (value: number) => {
    const next = Math.max(0, Math.min(MAX_PROGRESS, value));
    progressRef.current = next;
    setProgress(next);
    setPlaying(false);
  };

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.06);
      last = now;
      const next = Math.min(MAX_PROGRESS, progressRef.current + delta / 4);
      progressRef.current = next;
      setProgress(next);
      if (next >= MAX_PROGRESS) {
        setPlaying(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const togglePlay = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (progressRef.current >= MAX_PROGRESS - 0.001) seek(0);
    setPlaying(true);
  };

  const areaPath = useMemo(() => {
    const top = linePath('score');
    const last = chartPoint(SIMULATION.length - 1, 0);
    const first = chartPoint(0, 0);
    return `${top} L ${last.x} ${last.y} L ${first.x} ${first.y} Z`;
  }, []);

  const chooseHorizon = (value: 7 | 14 | 30) => {
    setHorizon(value);
    const index = SIMULATION.findIndex(pointItem => pointItem.day === value);
    if (index >= 0) seek(index);
  };

  return (
    <div className="timeline-page">
      <div className="timeline-top">
        <div className="horizon-tabs">
          {([7, 14, 30] as const).map(value => (
            <button key={value} className={activeHorizon === value ? 'active' : ''} onClick={() => chooseHorizon(value)}>
              <CalendarDays size={14} /> {value} 天
            </button>
          ))}
        </div>
        <div className="timeline-note"><Sparkles size={14} /> 同一人体模型的连续病理推演 · 示意模拟 · 不承诺疗效</div>
      </div>

      <div className="timeline-layout">
        <div className="timeline-main">
          <section className="viewer-panel timeline-viewer-panel">
            <div className="viewer-toolbar">
              <div className="viewer-toolbar-left">
                <span className="live-badge teal"><i /> 时间切片</span>
                <span className="toolbar-sep" />
                <span className="toolbar-note">{current.label} · 恢复 {Math.round(recovery * 100)}%</span>
              </div>
              <div className="viewer-toolbar-right">
                <button className={`viewer-btn ${playing ? 'active' : ''}`} onClick={togglePlay} aria-label={playing ? '暂停' : '播放'}>
                  {playing ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <button className="viewer-btn" onClick={() => viewer.current?.zoomOut()} aria-label="缩小">−</button>
                <button className="viewer-btn" onClick={() => viewer.current?.zoomIn()} aria-label="放大">＋</button>
                <button className="viewer-btn" onClick={() => viewer.current?.reset()} aria-label="复位"><RotateCcw size={14} /></button>
              </div>
            </div>
            <HumanBodyCanvas
              ref={viewer}
              visibleSystems={TIMELINE_SYSTEMS}
              visibleOrgans={affected}
              isolateOrgans
              organVisuals={visual.organs}
              particles
            />
            <div className="timeline-viewer-hud">
              <span className="panel-kicker">TIME SLICE / {current.label}</span>
              <strong>病理强度 {Math.round((1 - recovery) * 100)}%</strong>
              <div className="timeline-organ-key">
                {affected.map(organId => {
                  const meta = ORGAN_BY_ID[organId];
                  const state = visual.organs[organId];
                  return (
                    <span key={organId}>
                      <i style={{ background: state.color }} /> {meta?.label ?? organId}
                    </span>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="panel chart-panel">
            <div className="panel-head">
              <div><span className="panel-kicker">TRAJECTORY / 状态趋势</span><h3>症状与状态评分</h3></div>
              <div className="chart-legend">
                <span><i className="chart-line score" /> 综合状态</span>
                <span><i className="chart-line sleep" /> 睡眠</span>
                <span><i className="chart-line appetite" /> 食欲</span>
                <span><i className="chart-line energy" /> 精力</span>
              </div>
            </div>

            <div className="chart-wrap">
              <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} role="img" aria-label="7、14、30 天状态评分趋势">
                <defs>
                  <linearGradient id="scoreArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#c9a86a" stopOpacity=".22" />
                    <stop offset="1" stopColor="#c9a86a" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[25, 50, 75, 100].map(value => {
                  const y = chartPoint(0, value).y;
                  return <line key={value} x1={PAD.left} y1={y} x2={CHART_W - PAD.right} y2={y} className="chart-grid" />;
                })}
                {[0, 1, 2, 3].map(index => {
                  const x = chartPoint(index, 0).x;
                  return <line key={index} x1={x} y1={PAD.top} x2={x} y2={CHART_H - PAD.bottom} className="chart-grid vertical" />;
                })}
                <path d={areaPath} fill="url(#scoreArea)" />
                <path d={linePath('energy')} className="chart-path energy" />
                <path d={linePath('appetite')} className="chart-path appetite" />
                <path d={linePath('sleep')} className="chart-path sleep" />
                <path d={linePath('score')} className="chart-path score" />
                {SIMULATION.map((item, index) => {
                  const { x, y } = chartPoint(index, item.score);
                  return (
                    <g key={item.day}>
                      <circle cx={x} cy={y} r={dayIndex === index ? 5.5 : 3} className={`chart-dot ${dayIndex === index ? 'active' : ''}`} />
                      <text x={x} y={CHART_H - 10} textAnchor="middle" className="chart-label">{item.label}</text>
                    </g>
                  );
                })}
                {SIMULATION.map((item, index) => {
                  if (index !== dayIndex) return null;
                  const { x, y } = chartPoint(index, item.score);
                  return (
                    <g key={`tip-${item.day}`}>
                      <line x1={x} y1={PAD.top} x2={x} y2={CHART_H - PAD.bottom} className="chart-focus" />
                      <rect x={Math.min(x + 8, CHART_W - 92)} y={Math.max(y - 34, 6)} width="84" height="26" rx="5" className="chart-tip" />
                      <text x={Math.min(x + 50, CHART_W - 50)} y={Math.max(y - 16, 24)} textAnchor="middle" className="chart-tip-text">{Math.round(current.score)} 分</text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="timeline-scrubber">
              <button className="play-btn" onClick={togglePlay} aria-label={playing ? '暂停' : '播放'}>
                {playing ? <Pause size={15} /> : <Play size={15} />}
              </button>
              <div className="scrubber">
                <input
                  type="range"
                  min={0}
                  max={MAX_PROGRESS}
                  step={0.01}
                  value={progress}
                  onChange={event => seek(Number(event.target.value))}
                  aria-label="时间轴"
                />
                <div className="scrubber-ticks">
                  {SIMULATION.map((item, index) => (
                    <button key={item.day} className={index <= progress ? 'filled' : ''} onClick={() => seek(index)}>
                      <i /><span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <button className="btn btn-ghost small" onClick={() => seek(0)}><RotateCcw size={12} /> 回到当前</button>
            </div>

            <div className="chart-foot">
              <span><Info size={13} /> 拖动时间轴或用播放键观察 0→30 天的连续变化。</span>
              <span>假设：规律服药 · 作息调整 · 无新增应激事件</span>
            </div>
          </section>
        </div>

        <aside className="timeline-side">
          <section className="panel side-panel day-summary">
            <div className="panel-head">
              <div><span className="panel-kicker">SELECTED / 当前切片</span><h3>{current.label}</h3></div>
              <span className="score-ring"><b>{Math.round(current.score)}</b><small>综合</small></span>
            </div>
            <p className="day-note">{current.note}</p>
            <div className="day-metrics">
              {[
                ['睡眠', current.sleep, '#6f8faf'],
                ['食欲', current.appetite, '#c9a86a'],
                ['精力', current.energy, '#4fb3a9'],
                ['湿象', current.damp, '#b68b63'],
              ].map(([label, value, color]) => (
                <div key={label as string}>
                  <span>{label}</span>
                  <div className="day-track"><i style={{ width: `${value}%`, background: color as string }} /></div>
                  <b>{Math.round(value as number)}</b>
                </div>
              ))}
            </div>
            <div className="day-compare">
              <TrendingUp size={14} />
              <span>相对当前：综合状态 +{Math.round(current.score - SIMULATION[0].score)}</span>
            </div>
          </section>

          <section className="panel side-panel timeline-context">
            <div className="panel-head"><div><span className="panel-kicker">CONTEXT</span><h3>这次推演用了什么</h3></div></div>
            <div className="context-lines">
              <div><span>主证候</span><b>{pattern?.name}</b></div>
              <div><span>方案</span><b>{formula.name || '未命名'} · {formula.courseDays} 天</b></div>
              <div><span>患者</span><b>{patient.alias} · {patient.age} 岁</b></div>
              <div><span>关键假设</span><b>依从性良好 · 无新增应激</b></div>
            </div>
            <div className="assumption-box">
              <b>为什么不是疗效预测？</b>
              <p>推演只连续改变“证型相关状态”的颜色、透明度、形态与粒子参数，不模拟真实生理过程，也没有患者个体数据校准。</p>
            </div>
          </section>

          <section className="panel side-panel mini-state-card">
            <BodyGlyph className="mini-glyph" />
            <div>
              <span className="panel-kicker">STATE PREVIEW</span>
              <strong>{pattern?.name}</strong>
              <p>{current.label} · 湿象 {Math.round(current.damp)}% · 恢复 {Math.round(recovery * 100)}%</p>
            </div>
          </section>
        </aside>
      </div>

      <div className="body-bottom">
        <div className="body-bottom-copy">
          <span className="panel-kicker">NEXT / 下一步</span>
          <strong>把这条变化线，压缩成患者能带走的报告。</strong>
          <span>报告会标注“示意模拟”，并保留医生签名位。</span>
        </div>
        <div className="body-bottom-actions">
          <button className="btn btn-ghost" onClick={() => go('formula')}>返回药方</button>
          <button
            className="btn btn-gold"
            onClick={() => {
              markComplete('timeline');
              go('report');
            }}
          >
            生成患者报告 <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
