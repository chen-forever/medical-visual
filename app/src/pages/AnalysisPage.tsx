import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleAlert,
  Edit3,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  WifiOff,
} from 'lucide-react';
import {
  analysisErrorMessage,
  analyzeCase,
  getAnalysisHealth,
  type AnalysisHealth,
} from '../api/analysisClient';
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

function sourceLabel(meta: ReturnType<typeof useCaseStore.getState>['analysisMeta']) {
  if (meta.provider === 'deepseek') return `DeepSeek · ${meta.model}`;
  if (meta.provider === 'rules') return '红旗规则引擎';
  return '演示分析';
}

export default function AnalysisPage() {
  const patient = useCaseStore(state => state.patient);
  const analysis = useCaseStore(state => state.analysis);
  const analysisMeta = useCaseStore(state => state.analysisMeta);
  const primaryId = useCaseStore(state => state.primaryPatternId);
  const setAnalysis = useCaseStore(state => state.setAnalysis);
  const setPrimaryPattern = useCaseStore(state => state.setPrimaryPattern);
  const markComplete = useCaseStore(state => state.markComplete);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [health, setHealth] = useState<AnalysisHealth | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const primary = analysis.patterns.find(pattern => pattern.id === primaryId) ?? analysis.patterns[0];
  const blocked = analysis.redFlags.length > 0;
  const source = sourceLabel(analysisMeta);

  useEffect(() => {
    let active = true;
    getAnalysisHealth().then(result => {
      if (active) setHealth(result);
    });
    return () => {
      active = false;
      abortRef.current?.abort();
    };
  }, []);

  const runAgain = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError('');
    try {
      const result = await analyzeCase(patient, controller.signal);
      if (controller.signal.aborted) return;
      setAnalysis(result.analysis, result.meta);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return;
      setError(analysisErrorMessage(caught));
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  };

  const confirm = () => {
    if (!primary || blocked) return;
    markComplete('analysis');
    go('body');
  };

  return (
    <div className="analysis-page">
      <div className="analysis-topline">
        <div className="analysis-source">
          <span className={`source-badge ${analysisMeta.provider}`}>
            {analysisMeta.provider === 'deepseek' ? <Sparkles size={12} /> : <WifiOff size={12} />}
            {source}
          </span>
          <span className="source-note">
            {analysisMeta.provider === 'deepseek'
              ? `已基于「${patient.alias}」的四诊信息生成 ${analysis.patterns.length} 个候选；点击候选可切换主证候。`
              : `当前为演示分析；点击「DeepSeek 分析」生成新的证型候选。`}
          </span>
          {health && !health.configured && analysisMeta.provider !== 'deepseek' && (
            <span className="source-warning">本地 API 未配置 Key</span>
          )}
        </div>
        <button className="btn btn-ghost small" onClick={runAgain} disabled={loading}>
          <RefreshCw size={13} className={loading ? 'spin' : ''} />
          {loading ? 'DeepSeek 分析中…' : 'DeepSeek 分析'}
        </button>
      </div>

      {error && (
        <div className="analysis-api-error">
          <CircleAlert size={14} />
          <span>{error}</span>
          <button onClick={runAgain}>重试</button>
        </div>
      )}

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

          <section className={`panel redflag-panel ${blocked ? 'has-flags' : ''}`}>
            <div className="redflag-head">
              {blocked ? <ShieldAlert size={15} /> : <ShieldCheck size={15} />}
              <b>红旗筛查</b>
              <span className={`ok-pill ${blocked ? 'blocked' : ''}`}>
                {blocked ? `命中 ${analysis.redFlags.length} 项` : '未命中'}
              </span>
            </div>
            {blocked ? (
              <ul className="redflag-list">
                {analysis.redFlags.map(flag => <li key={flag}>{flag}</li>)}
              </ul>
            ) : (
              <p>当前病例未触发胸痛、意识障碍、大出血等急症规则。</p>
            )}
            <small>红旗规则优先于模型；一旦命中，将停止证型推演并提示就医。</small>
          </section>

          <section className="panel missing-panel">
            <div className="panel-head">
              <div><span className="panel-kicker">MISSING</span><h3>还缺什么</h3></div>
            </div>
            <div className="missing-list">
              {analysis.missingInfo.length ? analysis.missingInfo.map(item => (
                <button key={item} onClick={() => go('patient')}><CircleAlert size={12} /> {item} <span>补充</span></button>
              )) : <p className="small-copy">模型未返回额外缺失信息。</p>}
            </div>
          </section>
        </div>

        <div className={`analysis-main ${loading ? 'is-loading' : ''}`}>
          {loading && (
            <div className="analysis-loading">
              <div className="analysis-loading-ring" />
              <strong>正在调用 DeepSeek</strong>
              <span>四诊信息 → 证型候选 → 证据与脏腑映射</span>
            </div>
          )}

          {!primary ? (
            <section className="panel analysis-blocked">
              <span className="panel-kicker">SAFETY STOP / 安全阻断</span>
              <h2>红旗规则命中，暂停证型推演</h2>
              <p>{analysis.disclaimer}</p>
              <div className="blocked-flags">
                {analysis.redFlags.map(flag => <span key={flag}>{flag}</span>)}
              </div>
              <button className="btn btn-ghost" onClick={() => go('patient')}>返回修改四诊</button>
            </section>
          ) : (
            <>
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
            </>
          )}

          <div className="analysis-disclaimer">
            <Stethoscope size={14} />
            <span>{analysis.disclaimer}</span>
            <span className="model-label">{analysis.modelLabel}</span>
          </div>

          <div className="analysis-actions">
            <button className="btn btn-ghost" onClick={() => go('patient')}>返回修改四诊</button>
            <button
              className="btn btn-gold"
              onClick={confirm}
              disabled={!primary || blocked}
              title={blocked ? '红旗命中时不能进入人体模拟' : undefined}
            >
              {blocked || !primary
                ? '先处理红旗 / 缺少候选'
                : <>确认「{primary.name}」，生成人体 <ArrowRight size={15} /></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
