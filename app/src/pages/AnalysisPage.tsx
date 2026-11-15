import { useState } from 'react';
import { ArrowRight, Check, ChevronDown, CircleAlert, Edit3, RefreshCw, ShieldCheck, Sparkles, Stethoscope } from 'lucide-react';
import { go } from '../navigation';
import { useCaseStore } from '../store';
import type { Pattern } from '../types';

function ConfidenceRing({ value }: { value: number }) {
  return (
    <div className="confidence-ring" style={{ '--value': value } as React.CSSProperties}>
      <div>
        <strong>{value}</strong>
        <span>% 匹配度</span>
      </div>
    </div>
  );
}

function PatternOption({
  pattern,
  active,
  onSelect,
}: {
  pattern: Pattern;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button className={`pattern-option ${active ? 'active' : ''}`} onClick={onSelect}>
      <div className="pattern-option-head">
        <span className="pattern-radio">{active ? <Check size={11} /> : null}</span>
        <b>{pattern.name}</b>
        <span className="pattern-score">{pattern.confidence}%</span>
      </div>
      <p>{pattern.summary}</p>
      <div className="pattern-bar"><i style={{ width: `${pattern.confidence}%` }} /></div>
    </button>
  );
}

export default function AnalysisPage() {
  const patient = useCaseStore(state => state.patient);
  const analysis = useCaseStore(state => state.analysis);
  const primaryId = useCaseStore(state => state.primaryPatternId);
  const setPrimaryPattern = useCaseStore(state => state.setPrimaryPattern);
  const markComplete = useCaseStore(state => state.markComplete);
  const [loading, setLoading] = useState(false);
  const primary = analysis.patterns.find(pattern => pattern.id === primaryId) ?? analysis.patterns[0];

  const runAgain = () => {
    setLoading(true);
    window.setTimeout(() => setLoading(false), 1600);
  };

  const confirm = () => {
    markComplete('analysis');
    go('body');
  };

  return (
    <div className="analysis-page">
      <div className="analysis-topline">
        <div className="inline-note">
          <Sparkles size={14} />
          <span>已基于「{patient.alias}」的四诊信息生成 3 个候选；点击候选可切换主证候。</span>
        </div>
        <button className="btn btn-ghost small" onClick={runAgain} disabled={loading}>
          <RefreshCw size={13} className={loading ? 'spin' : ''} /> {loading ? '重新分析中…' : '重新分析'}
        </button>
      </div>

      <div className="analysis-layout">
        <div className="analysis-side">
          <section className="panel input-summary">
            <div className="panel-head">
              <div>
                <span className="panel-kicker">INPUT / 四诊摘要</span>
                <h3>模型看到的输入</h3>
              </div>
              <button className="icon-btn" onClick={() => go('patient')} aria-label="编辑输入"><Edit3 size={14} /></button>
            </div>
            <div className="summary-list">
              <div><span>主诉</span><p>{patient.chiefComplaint}</p></div>
              <div><span>望</span><p>{patient.inspection || '未记录'}</p></div>
              <div><span>闻</span><p>{patient.listening || '未记录'}</p></div>
              <div><span>问</span><p>{patient.inquiry || '未记录'}</p></div>
              <div><span>切</span><p>{patient.palpation || '未记录'}</p></div>
            </div>
            <div className="tag-row compact">
              {patient.tags.map(tag => <span className="tag static" key={tag}>{tag}</span>)}
            </div>
          </section>

          <section className="panel redflag-panel">
            <div className="redflag-head"><ShieldCheck size={15} /><b>红旗筛查</b><span className="ok-pill">未命中</span></div>
            <p>当前演示病例未触发胸痛、意识障碍、大出血等急症规则。</p>
            <small>红旗规则优先于模型；一旦命中，将停止推演并提示就医。</small>
          </section>

          <section className="panel missing-panel">
            <div className="panel-head">
              <div><span className="panel-kicker">MISSING</span><h3>还缺什么</h3></div>
            </div>
            <div className="missing-list">
              {analysis.missingInfo.map(item => (
                <button key={item} onClick={() => go('patient')}><CircleAlert size={12} /> {item} <span>补充</span></button>
              ))}
            </div>
          </section>
        </div>

        <div className={`analysis-main ${loading ? 'is-loading' : ''}`}>
          {loading && (
            <div className="analysis-loading">
              <div className="analysis-loading-ring" />
              <strong>正在重组四诊证据</strong>
              <span>按“症状 → 证据 → 证型 → 脏腑/经络”重新排序</span>
            </div>
          )}

          <section className="panel primary-pattern">
            <div className="primary-pattern-head">
              <div>
                <span className="panel-kicker">PRIMARY HYPOTHESIS / 主证候候选</span>
                <h2>{primary.name}</h2>
                <p>{primary.summary}</p>
              </div>
              <ConfidenceRing value={primary.confidence} />
            </div>

            <div className="evidence-grid">
              <div>
                <span className="mini-label">支持证据</span>
                <ul className="evidence-list">
                  {primary.evidence.map(item => <li key={item}><Check size={11} /> {item}</li>)}
                </ul>
              </div>
              <div>
                <span className="mini-label">病位映射</span>
                <div className="organ-tags">
                  {primary.organs.map(organ => <span key={organ} className="organ-tag">{organ}</span>)}
                </div>
                <span className="mini-label meridian-label">相关经络</span>
                <div className="meridian-tags">
                  {primary.meridians.map(meridian => <span key={meridian}>{meridian}</span>)}
                </div>
              </div>
            </div>

            <details className="rationale">
              <summary>为什么这样判断？<ChevronDown size={14} /></summary>
              <p>{primary.rationale}</p>
              {primary.caution && <div className="caution-note"><CircleAlert size={13} /> {primary.caution}</div>}
            </details>
          </section>

          <section className="alternatives">
            <div className="section-line-head">
              <div><span className="panel-kicker">DIFFERENTIAL / 鉴别候选</span><h3>还需要排除什么</h3></div>
              <span className="muted-label">置信度为模型匹配，不是概率诊断</span>
            </div>
            <div className="pattern-grid">
              {analysis.patterns.map(pattern => (
                <PatternOption
                  key={pattern.id}
                  pattern={pattern}
                  active={pattern.id === primaryId}
                  onSelect={() => setPrimaryPattern(pattern.id)}
                />
              ))}
            </div>
          </section>

          <div className="analysis-disclaimer">
            <Stethoscope size={14} />
            <span>{analysis.disclaimer}</span>
            <span className="model-label">{analysis.modelLabel}</span>
          </div>

          <div className="analysis-actions">
            <button className="btn btn-ghost" onClick={() => go('patient')}>返回修改四诊</button>
            <button className="btn btn-gold" onClick={confirm}>
              确认「{primary.name}」，生成人体 <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
