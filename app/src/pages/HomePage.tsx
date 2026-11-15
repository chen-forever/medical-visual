import { ArrowRight, ChevronRight, Clock3, Play, ShieldCheck, Sparkles } from 'lucide-react';
import BodyGlyph from '../components/BodyGlyph';
import { STEPS } from '../data';
import { go } from '../navigation';
import { useCaseStore, usePrimaryPattern } from '../store';

export default function HomePage() {
  const patient = useCaseStore(state => state.patient);
  const completed = useCaseStore(state => state.completed);
  const pattern = usePrimaryPattern();
  const progress = Math.round((completed.length / STEPS.length) * 100);

  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-hero-copy">
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
            <button className="btn btn-ghost" onClick={() => go('patient')}>
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
          <div className="hero-orbit hero-orbit-a" />
          <div className="hero-orbit hero-orbit-b" />
          <BodyGlyph />
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
