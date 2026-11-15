import { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, ChevronRight, Clock3, FolderClock, Play, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { getCase, listCases, type CaseSummary } from '../api/casesClient';
import { analysisErrorMessage } from '../api/analysisClient';
import BodyGlyph from '../components/BodyGlyph';
import { Seal, TaijiMark } from '../components/TcmOrnaments';
import { STEPS } from '../data';
import { go } from '../navigation';
import { useCaseStore, usePrimaryPattern } from '../store';

export default function HomePage() {
  const patient = useCaseStore(state => state.patient);
  const caseId = useCaseStore(state => state.caseId);
  const completed = useCaseStore(state => state.completed);
  const hydrateCase = useCaseStore(state => state.hydrateCase);
  const startNewCase = useCaseStore(state => state.startNewCase);
  const pattern = usePrimaryPattern();
  const progress = Math.round((completed.length / STEPS.length) * 100);
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [openingCaseId, setOpeningCaseId] = useState('');
  const [caseError, setCaseError] = useState('');

  const refreshCases = async () => {
    setLoadingCases(true);
    setCaseError('');
    try {
      setCases(await listCases());
    } catch (caught) {
      setCaseError(analysisErrorMessage(caught));
    } finally {
      setLoadingCases(false);
    }
  };

  useEffect(() => {
    void refreshCases();
  }, []);

  const openCase = async (id: string) => {
    setOpeningCaseId(id);
    setCaseError('');
    try {
      const detail = await getCase(id);
      hydrateCase(detail);
      go(detail.analyses.length ? 'analysis' : 'patient');
    } catch (caught) {
      setCaseError(analysisErrorMessage(caught));
    } finally {
      setOpeningCaseId('');
    }
  };

  const newCase = () => {
    startNewCase();
    go('patient');
  };

  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-hero-copy">
          <div className="hero-tcm-row">
            <Seal text="岐黄" size="sm" />
            <div className="tcm-diagnosis-chips" aria-label="望闻问切">
              <span className="tcm-diagnosis-chip">望</span>
              <span className="tcm-diagnosis-chip">闻</span>
              <span className="tcm-diagnosis-chip">问</span>
              <span className="tcm-diagnosis-chip">切</span>
            </div>
          </div>
          <div className="eyebrow"><span /> 中医状态沟通工具 / v0.1</div>
          <h2>把一次四诊，<br />讲成一条<em>看得见</em>的状态线。</h2>
          <p>
            望闻问切不该只停在病历里。把证型、病位与调理过程，转译成
            <strong>患者看得懂、医生讲得清</strong>的人体图层与时间模拟。
          </p>
          <div className="home-hero-actions">
            <button className="btn btn-gold" onClick={() => go('analysis')}>
              <Play size={15} /> 继续当前病例
            </button>
            <button className="btn btn-ghost" onClick={newCase}>
              新建病例 <ArrowRight size={15} />
            </button>
          </div>
          <div className="hero-assurance">
            <span><ShieldCheck size={13} /> 医生在环</span>
            <span><Sparkles size={13} /> 每个图层可解释</span>
            <span><Clock3 size={13} /> 7 / 14 / 30 天模拟</span>
          </div>
        </div>

        <div className="home-hero-art">
          <TaijiMark />
          <div className="hero-orbit hero-orbit-a" />
          <div className="hero-orbit hero-orbit-b" />
          <BodyGlyph tone="light" />
          <div className="hero-float hero-float-a"><i className="dot teal" /> 心神失养</div>
          <div className="hero-float hero-float-b"><i className="dot gold" /> 湿象 62%</div>
          <div className="hero-float hero-float-c"><i className="dot red" /> 脾失健运</div>
          <div className="hero-caption">ADULT REFERENCE · BODY_PARTS3D</div>
        </div>
      </section>

      <section className="home-grid">
        <article className="panel case-overview">
          <div className="panel-head">
            <div>
              <span className="panel-kicker">CURRENT CASE</span>
              <h3>当前病例</h3>
            </div>
            <button className="text-btn" onClick={() => go('patient')}>编辑信息 <ChevronRight size={13} /></button>
          </div>
          <div className="case-overview-top">
            <div className="case-avatar large">{patient.alias.slice(0, 1)}</div>
            <div>
              <div className="case-overview-name">{patient.alias}<span>{patient.age} 岁 · {patient.sex === 'female' ? '女' : '男'}</span></div>
              <p>{patient.chiefComplaint}</p>
            </div>
          </div>
          <div className="case-facts">
            <div><span>主证候</span><strong>{pattern?.name ?? '待分析'}</strong></div>
            <div><span>匹配度</span><strong className="gold-text">{pattern?.confidence ?? '—'}%</strong></div>
            <div><span>病位</span><strong>{pattern?.organs.join(' · ') ?? '—'}</strong></div>
            <div><span>病程</span><strong>3 个月</strong></div>
          </div>
          <div className="case-next">
            <div>
              <span>下一步</span>
              <strong>{progress >= 60 ? '查看 7 / 14 / 30 天变化' : '确认证型，生成数字人体'}</strong>
            </div>
            <button className="icon-arrow" onClick={() => go(progress >= 60 ? 'timeline' : 'analysis')} aria-label="继续">
              <ArrowRight size={17} />
            </button>
          </div>
        </article>

        <article className="panel path-overview">
          <div className="panel-head">
            <div>
              <span className="panel-kicker">DEMO PATH</span>
              <h3>一次完整演示</h3>
            </div>
            <span className="muted-label">约 6 分钟</span>
          </div>
          <div className="path-list">
            {[
              ['01', '四诊采集', '患者信息 + 望闻问切', 'patient'],
              ['02', '证型分析', '候选、证据与置信度', 'analysis'],
              ['03', '人体呈现', '图层、病位与状态', 'body'],
              ['04', '方案推演', '药方记录与时间轴', 'formula'],
              ['05', '沟通报告', '两页 A4，可打印', 'report'],
            ].map(([no, title, desc, step]) => (
              <button key={no} className="path-item" onClick={() => go(step as never)}>
                <span className="path-no">{no}</span>
                <span className="path-copy"><b>{title}</b><small>{desc}</small></span>
                <ChevronRight size={14} />
              </button>
            ))}
          </div>
        </article>
      </section>

      <section className="panel recent-cases">
        <div className="panel-head">
          <div>
            <span className="panel-kicker">CASE ARCHIVE / 病例库</span>
            <h3>最近病例</h3>
          </div>
          <button className="text-btn" onClick={refreshCases} disabled={loadingCases}>
            <RefreshCw size={13} className={loadingCases ? 'spin' : ''} />
            {loadingCases ? '读取中…' : '刷新'}
          </button>
        </div>
        {caseError && (
          <div className="recent-case-error">
            <AlertCircle size={13} />
            <span>{caseError}</span>
          </div>
        )}
        {!caseError && !loadingCases && cases.length === 0 && (
          <div className="recent-case-empty">
            <FolderClock size={20} />
            <div>
              <strong>还没有服务端病例</strong>
              <span>保存一份新病例后，会在这里出现。</span>
            </div>
            <button className="btn btn-gold small" onClick={newCase}>新建病例</button>
          </div>
        )}
        {cases.length > 0 && (
          <div className="recent-case-grid">
            {cases.slice(0, 6).map(item => (
              <button
                key={item.id}
                className={`recent-case-item ${item.id === caseId ? 'active' : ''}`}
                onClick={() => openCase(item.id)}
                disabled={openingCaseId === item.id}
              >
                <div className="recent-case-top">
                  <span className="recent-case-avatar">{item.patient.alias.slice(0, 1) || '病'}</span>
                  <span className="recent-case-name">{item.patient.alias || '未命名病例'}</span>
                  {item.id === caseId && <span className="recent-case-current">当前</span>}
                </div>
                <p>{item.patient.chiefComplaint}</p>
                <div className="recent-case-meta">
                  <span>{item.latestAnalysis ? item.latestAnalysis.name : '待分析'}</span>
                  {item.latestAnalysis && <b>{item.latestAnalysis.confidence}%</b>}
                  {item.latestFormula && <span>· {item.latestFormula.name}</span>}
                </div>
                <div className="recent-case-foot">
                  <span>{new Date(item.updatedAt).toLocaleDateString('zh-CN')}</span>
                  <span>{openingCaseId === item.id ? '打开中…' : '打开病例'} <ChevronRight size={12} /></span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="home-principles">
        <div className="principle">
          <span className="principle-k">01 / 不是诊断</span>
          <strong>证型候选，不是确诊结论</strong>
          <p>每个输出都带证据与置信度，红旗规则优先于模型结果。</p>
        </div>
        <div className="principle">
          <span className="principle-k">02 / 不是特效</span>
          <strong>每个视觉都能回到图例</strong>
          <p>颜色、粒子与箭头必须对应证型、病位或治法，不为好看而添加。</p>
        </div>
        <div className="principle">
          <span className="principle-k">03 / 不是预测</span>
          <strong>时间轴是示意模拟</strong>
          <p>7 / 14 / 30 天变化用于沟通趋势，不承诺疗效，也不替代复诊。</p>
        </div>
      </section>
    </div>
  );
}
