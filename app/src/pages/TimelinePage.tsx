import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, Check, Info, Pause, Play, RotateCcw, Sparkles, TrendingUp } from 'lucide-react';
import BodyGlyph from '../components/BodyGlyph';
import { SIMULATION } from '../data';
import { go } from '../navigation';
import { useCaseStore, usePrimaryPattern } from '../store';

const CHART_W = 760;
const CHART_H = 250;
const PAD = { top: 24, right: 22, bottom: 34, left: 34 };

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

export default function TimelinePage() {
  const pattern = usePrimaryPattern();
  const patient = useCaseStore(state => state.patient);
  const formula = useCaseStore(state => state.formula);
  const horizon = useCaseStore(state => state.horizon);
  const setHorizon = useCaseStore(state => state.setHorizon);
  const markComplete = useCaseStore(state => state.markComplete);
  const [dayIndex, setDayIndex] = useState(2);
  const [playing, setPlaying] = useState(false);
  const point = SIMULATION[dayIndex];
  const selectedPoint = SIMULATION[Math.min(dayIndex, SIMULATION.length - 1)];

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setDayIndex(current => {
        if (current >= SIMULATION.length - 1) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 1200);
    return () => window.clearInterval(timer);
  }, [playing]);

  const areaPath = useMemo(() => {
    const top = linePath('score');
    const last = chartPoint(SIMULATION.length - 1, 0);
    const first = chartPoint(0, 0);
    return `${top} L ${last.x} ${last.y} L ${first.x} ${first.y} Z`;
  }, []);

  const chooseHorizon = (value: 7 | 14 | 30) => {
    setHorizon(value);
    const index = SIMULATION.findIndex(pointItem => pointItem.day === value);
    if (index >= 0) setDayIndex(index);
  };

  return (
    <div className="timeline-page">
      <div className="timeline-top">
        <div className="horizon-tabs">
          {([7, 14, 30] as const).map(value => (
            <button key={value} className={horizon === value ? 'active' : ''} onClick={() => chooseHorizon(value)}>
              <CalendarDays size={14} /> {value} 天
            </button>
          ))}
        </div>
        <div className="timeline-note"><Sparkles size={14} /> 基于规则的示意推演 · 固定随机种子 · 不承诺疗效</div>
      </div>

      <div className="timeline-layout">
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
                    <text x={Math.min(x + 50, CHART_W - 50)} y={Math.max(y - 16, 24)} textAnchor="middle" className="chart-tip-text">{item.score} 分</text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="timeline-scrubber">
            <button className="play-btn" onClick={() => setPlaying(value => !value)} aria-label={playing ? '暂停' : '播放'}>
              {playing ? <Pause size={15} /> : <Play size={15} />}
            </button>
            <div className="scrubber">
              <input
                type="range"
                min={0}
                max={SIMULATION.length - 1}
                step={1}
                value={dayIndex}
                onChange={event => { setDayIndex(Number(event.target.value)); setPlaying(false); }}
                aria-label="时间轴"
              />
              <div className="scrubber-ticks">
                {SIMULATION.map((item, index) => (
                  <button key={item.day} className={index <= dayIndex ? 'filled' : ''} onClick={() => setDayIndex(index)}>
                    <i /><span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <button className="btn btn-ghost small" onClick={() => { setDayIndex(0); setPlaying(false); }}><RotateCcw size={12} /> 回到当前</button>
          </div>

          <div className="chart-foot">
            <span><Info size={13} /> 评分仅用于沟通趋势，不是量表诊断。</span>
            <span>假设：规律服药 · 作息调整 · 无新增应激事件</span>
          </div>
        </section>

        <aside className="timeline-side">
          <section className="panel side-panel day-summary">
            <div className="panel-head">
              <div><span className="panel-kicker">SELECTED / 当前切片</span><h3>{selectedPoint.label}</h3></div>
              <span className="score-ring"><b>{selectedPoint.score}</b><small>综合</small></span>
            </div>
            <p className="day-note">{selectedPoint.note}</p>
            <div className="day-metrics">
              {[
                ['睡眠', selectedPoint.sleep, '#6f8faf'],
                ['食欲', selectedPoint.appetite, '#c9a86a'],
                ['精力', selectedPoint.energy, '#4fb3a9'],
                ['湿象', selectedPoint.damp, '#b68b63'],
              ].map(([label, value, color]) => (
                <div key={label as string}>
                  <span>{label}</span>
                  <div className="day-track"><i style={{ width: `${value}%`, background: color as string }} /></div>
                  <b>{value}</b>
                </div>
              ))}
            </div>
            <div className="day-compare">
              <TrendingUp size={14} />
              <span>相对当前：综合状态 +{selectedPoint.score - SIMULATION[0].score}</span>
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
              <p>推演只改变“证型相关状态”的示意参数，不模拟真实生理过程，也没有患者个体数据校准。</p>
            </div>
          </section>

          <section className="panel side-panel mini-state-card">
            <BodyGlyph className="mini-glyph" />
            <div>
              <span className="panel-kicker">STATE PREVIEW</span>
              <strong>{pattern?.name}</strong>
              <p>{selectedPoint.label} · 湿象 {selectedPoint.damp}%</p>
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
