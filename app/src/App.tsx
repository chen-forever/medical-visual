import { useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  CircleDot,
  FileText,
  FlaskConical,
  Home,
  Layers3,
  MapPin,
  Menu,
  Orbit,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Timer,
  UserRound,
  Waves,
  X,
} from 'lucide-react';
import { Seal } from './components/TcmOrnaments';
import { STEPS } from './data';
import { useCaseStore } from './store';
import type { StepId } from './types';
import HomePage from './pages/HomePage';
import PatientPage from './pages/PatientPage';
import AnalysisPage from './pages/AnalysisPage';
import BodyPage from './pages/BodyPage';
import InsidePage from './pages/InsidePage';
import LesionPage from './pages/LesionPage';
import StatePage from './pages/StatePage';
import FormulaPage from './pages/FormulaPage';
import TimelinePage from './pages/TimelinePage';
import ReportPage from './pages/ReportPage';

const STEP_ICONS: Record<StepId, typeof Home> = {
  home: Home,
  patient: UserRound,
  analysis: ScanLine,
  body: Orbit,
  inside: Layers3,
  lesion: MapPin,
  state: Waves,
  formula: FlaskConical,
  timeline: Timer,
  report: FileText,
};

const PAGE_META: Record<StepId, { kicker: string; title: string; desc: string }> = {
  home: { kicker: '工作台 / OVERVIEW', title: '把状态讲清楚', desc: '从一个真实病例出发，完成四诊、证型、人体图层与沟通报告。' },
  patient: { kicker: '采集 / INTAKE', title: '患者信息与四诊', desc: '只记录沟通所需的信息；真实姓名、联系方式不进入演示数据。' },
  analysis: { kicker: '分析 / PATTERN', title: '症状分析', desc: '模型给出证型候选与证据，医生确认后才进入人体呈现。' },
  body: { kicker: '呈现 / DIGITAL BODY', title: '数字人体', desc: '用半透明人体与脏腑图层，把抽象的证型落到可指认的位置。' },
  inside: { kicker: '呈现 / INTERIOR', title: '人体内部观察', desc: '剖面、隔离与器官细节；胃壁分层为示意，不冒充真实解剖。' },
  lesion: { kicker: '呈现 / LOCATION', title: '病位定位', desc: '把主要病位控制在 3～5 个，每个标记都能回到证据。' },
  state: { kicker: '呈现 / STATE', title: '当前状态', desc: '把病位器官的虚实寒热用颜色、粒子与连线表达，不做真实生理预测。' },
  formula: { kicker: '输出 / FORMULA', title: '输入药方', desc: '记录医生已经给出的方案；系统不生成剂量建议，也不判断处方优劣。' },
  timeline: { kicker: '输出 / TRAJECTORY', title: '7 / 14 / 30 天变化', desc: '基于规则的示意推演，呈现趋势与假设，不承诺疗效。' },
  report: { kicker: '输出 / REPORT', title: '患者报告', desc: '把这次沟通压缩成两页 A4：图、证型、病位、方案与边界说明。' },
};

function readRoute(): StepId {
  const hash = window.location.hash.replace(/^#\/?/, '');
  return STEPS.some(step => step.id === hash) ? (hash as StepId) : 'home';
}

function StepPage({ step }: { step: StepId }) {
  switch (step) {
    case 'patient':
      return <PatientPage />;
    case 'analysis':
      return <AnalysisPage />;
    case 'body':
      return <BodyPage />;
    case 'inside':
      return <InsidePage />;
    case 'lesion':
      return <LesionPage />;
    case 'state':
      return <StatePage />;
    case 'formula':
      return <FormulaPage />;
    case 'timeline':
      return <TimelinePage />;
    case 'report':
      return <ReportPage />;
    default:
      return <HomePage />;
  }
}

export default function App() {
  const [route, setRoute] = useState<StepId>(() => readRoute());
  const [menuOpen, setMenuOpen] = useState(false);
  const patient = useCaseStore(state => state.patient);
  const completed = useCaseStore(state => state.completed);
  const markComplete = useCaseStore(state => state.markComplete);
  const resetDemo = useCaseStore(state => state.resetDemo);
  const primaryPattern = useCaseStore(state =>
    state.analysis.patterns.find(p => p.id === state.primaryPatternId),
  );

  useEffect(() => {
    const onHash = () => {
      setRoute(readRoute());
      setMenuOpen(false);
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    markComplete(route);
  }, [route, markComplete]);

  const navigate = (step: StepId) => {
    if (step === route) {
      setMenuOpen(false);
      return;
    }
    window.location.hash = `/${step}`;
  };

  const progress = Math.round((completed.length / STEPS.length) * 100);
  const activeIndex = STEPS.findIndex(step => step.id === route);
  const groups = useMemo(
    () => [
      { label: '采集与分析', steps: STEPS.slice(0, 3) },
      { label: '人体呈现', steps: STEPS.slice(3, 7) },
      { label: '方案与报告', steps: STEPS.slice(7) },
    ],
    [],
  );

  return (
    <div className="app">
      <div
        className={`mobile-backdrop ${menuOpen ? 'is-open' : ''}`}
        onClick={() => setMenuOpen(false)}
      />
      <aside className={`sidebar ${menuOpen ? 'is-open' : ''}`}>
        <div className="brand-block">
          <div className="brand-seal" aria-hidden="true">黄</div>
          <div className="brand-copy">
            <strong>岐黄 · 状态</strong>
            <span>QIHUANG STATE</span>
          </div>
          <button className="icon-btn sidebar-close" onClick={() => setMenuOpen(false)} aria-label="关闭菜单">
            <X size={18} />
          </button>
        </div>

        <button className="case-card" onClick={() => navigate('patient')} title="编辑当前病例">
          <div className="case-card-top">
            <span className="case-label">当前病例 / DEMO</span>
            <span className="case-status"><i />进行中</span>
          </div>
          <div className="case-person">
            <div className="case-avatar">{patient.alias.slice(0, 1)}</div>
            <div className="case-name">
              <strong>{patient.alias}</strong>
              <span>{patient.age || '—'} 岁 · {patient.sex === 'female' ? '女' : patient.sex === 'male' ? '男' : '未填'}</span>
            </div>
            <ChevronRight size={15} className="case-arrow" />
          </div>
          <p className="case-complaint">{patient.chiefComplaint}</p>
          <div className="case-progress">
            <div className="case-progress-head">
              <span>流程完成度</span>
              <b>{progress}%</b>
            </div>
            <div className="case-progress-track"><i style={{ width: `${progress}%` }} /></div>
          </div>
        </button>

        <nav className="step-nav" aria-label="流程导航">
          {groups.map(group => (
            <div className="nav-group" key={group.label}>
              <div className="nav-group-label">{group.label}</div>
              {group.steps.map(step => {
                const Icon = STEP_ICONS[step.id];
                const active = route === step.id;
                const done = completed.includes(step.id);
                return (
                  <button
                    key={step.id}
                    className={`nav-item ${active ? 'active' : ''} ${done ? 'done' : ''}`}
                    onClick={() => navigate(step.id)}
                    aria-current={active ? 'page' : undefined}
                  >
                    <span className="nav-icon"><Icon size={16} strokeWidth={1.7} /></span>
                    <span className="nav-copy">
                      <b>{step.label}</b>
                      <small>{step.short}</small>
                    </span>
                    <span className="nav-state">
                      {done ? <CircleDot size={10} /> : <span className="nav-index">{step.no}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <Seal text="辨证论治" vertical size="sm" className="sidebar-tcm-seal" />
          <div className="sidebar-note">
            <ShieldCheck size={14} />
            <span>演示 / 沟通示意<br />不构成诊断与治疗建议</span>
          </div>
          <button
            className="sidebar-reset"
            onClick={() => {
              if (window.confirm('重置为演示病例？当前修改会丢失。')) {
                resetDemo();
                navigate('home');
              }
            }}
          >
            <RotateCcw size={13} /> 重置演示病例
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-btn menu-btn" onClick={() => setMenuOpen(true)} aria-label="打开菜单">
              <Menu size={19} />
            </button>
            <div className="breadcrumb">
              <span>病例</span>
              <ChevronRight size={12} />
              <span>{PAGE_META[route].title}</span>
            </div>
          </div>
          <div className="topbar-right">
            <span className="demo-chip"><i />演示数据</span>
            <span className="step-chip">{String(activeIndex).padStart(2, '0')} / {String(STEPS.length - 1).padStart(2, '0')}</span>
            <button className="top-action" onClick={() => navigate('report')}>
              <FileText size={14} /> 患者报告
            </button>
          </div>
        </header>

        <main className="page">
          <div className="page-heading">
            <div>
              <div className="page-kicker">{PAGE_META[route].kicker}</div>
              <h1>{PAGE_META[route].title}</h1>
              <p>{PAGE_META[route].desc}</p>
            </div>
            {primaryPattern && route !== 'home' && route !== 'report' && (
              <div className="heading-pattern">
                <span>当前主证候</span>
                <strong>{primaryPattern.name}</strong>
                <small>{primaryPattern.confidence}% 匹配度 · 待医生确认</small>
              </div>
            )}
          </div>

          <div className="page-body" key={route}>
            <StepPage step={route} />
          </div>

          <footer className="page-footer">
            <span>岐黄 · 状态 / 方案 A 视觉冲刺</span>
            <span>公开解剖数据 BodyParts3D · CC BY 4.0 · 仅作沟通示意</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
