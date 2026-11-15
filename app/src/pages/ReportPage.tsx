import { useState } from 'react';
import { ArrowLeft, Check, Download, FileText, Printer, Save, ShieldCheck } from 'lucide-react';
import { saveReport } from '../api/casesClient';
import { analysisErrorMessage } from '../api/analysisClient';
import BodyGlyph from '../components/BodyGlyph';
import { MeridianDivider, Seal } from '../components/TcmOrnaments';
import { ORGAN_BY_ID, SIMULATION } from '../data';
import { go } from '../navigation';
import { useCaseStore, usePrimaryPattern } from '../store';

export default function ReportPage() {
  const patient = useCaseStore(state => state.patient);
  const caseId = useCaseStore(state => state.caseId);
  const analysis = useCaseStore(state => state.analysis);
  const formula = useCaseStore(state => state.formula);
  const lesions = useCaseStore(state => state.lesions);
  const pattern = usePrimaryPattern();
  const [saving, setSaving] = useState(false);
  const [savedReportId, setSavedReportId] = useState('');
  const [error, setError] = useState('');
  const now = new Date();
  const dateText = `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日`;
  const reportNo = `QH-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-038`;

  const saveSnapshot = async () => {
    if (!caseId) {
      setError('请先保存病例并完成分析，再保存报告。');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const saved = await saveReport(caseId, {
        lesions,
        simulation: SIMULATION,
      });
      setSavedReportId(saved.id);
    } catch (caught) {
      setError(analysisErrorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="report-page">
      <div className="report-actions">
        <button className="btn btn-ghost" onClick={() => go('timeline')}><ArrowLeft size={14} /> 返回时间模拟</button>
        <div>
          <button className="btn btn-ghost" onClick={saveSnapshot} disabled={saving || !caseId}>
            {savedReportId ? <Check size={14} /> : <Save size={14} />}
            {saving ? '保存中…' : savedReportId ? '已保存快照' : '保存报告快照'}
          </button>
          <button className="btn btn-ghost" onClick={() => window.print()}><Printer size={14} /> 打印 / 另存 PDF</button>
          <button className="btn btn-gold" onClick={() => window.print()}><Download size={14} /> 导出报告</button>
        </div>
      </div>

      {error && <div className="analysis-api-error"><ShieldCheck size={14} /><span>{error}</span></div>}
      {savedReportId && (
        <div className="report-saved-note">
          <Check size={13} />
          <span>报告快照已写入服务端 · {savedReportId.slice(0, 8)}</span>
        </div>
      )}

      <article className="report-paper" id="report-paper">
        <Seal text="辨证论治" vertical size="sm" className="report-seal" />
        <header className="report-header">
          <div className="report-brand">
            <div className="brand-seal small">黄</div>
            <div><strong>岐黄 · 状态</strong><span>中医数字人体状态沟通报告</span></div>
          </div>
          <div className="report-meta">
            <span>报告编号 {reportNo}</span>
            <span>{dateText}</span>
            <span className="report-demo">沟通示意 · 非诊断</span>
          </div>
        </header>

        <section className="report-intro">
          <div>
            <span className="report-kicker">PATIENT / 患者信息</span>
            <h1>{patient.alias} 的状态说明</h1>
            <p className="report-lede">
              本次沟通把四诊信息、证型候选与调理方案，转译成可指认的人体图层与时间趋势。
              所有内容均为沟通示意，不构成诊断、处方或疗效承诺。
            </p>
          </div>
          <div className="report-patient-grid">
            <div><span>年龄</span><b>{patient.age} 岁</b></div>
            <div><span>性别</span><b>{patient.sex === 'female' ? '女' : patient.sex === 'male' ? '男' : '未填'}</b></div>
            <div><span>主诉</span><b className="span-2">{patient.chiefComplaint}</b></div>
            <div><span>记录医师</span><b>_____________</b></div>
            <div><span>复诊建议</span><b>2 周后复诊</b></div>
          </div>
        </section>

        <section className="report-grid-two">
          <div className="report-block">
            <div className="report-block-head"><span>01</span><h2>证型候选与依据</h2></div>
            <div className="report-pattern">
              <div>
                <strong>{pattern?.name}</strong>
                <span>{pattern?.confidence}% 匹配度</span>
              </div>
              <p>{pattern?.summary}</p>
            </div>
            <ul className="report-evidence">
              {pattern?.evidence.map(item => <li key={item}>{item}</li>)}
            </ul>
            <div className="report-tags">
              {pattern?.organs.map(organ => <span key={organ}>病位：{organ}</span>)}
              {pattern?.meridians.map(meridian => <span key={meridian}>{meridian}</span>)}
            </div>
            <p className="report-small">鉴别候选：{analysis.patterns.filter(item => item.id !== pattern?.id).map(item => item.name).join('、')}。以上为证型候选，需医师结合面诊确认。</p>
          </div>

          <div className="report-block report-body-block">
            <div className="report-block-head"><span>02</span><h2>病位与状态示意</h2></div>
            <div className="report-body-visual">
              <BodyGlyph tone="light" />
              <div className="report-legend">
                <div><i className="legend-dot red" /> 主要病位</div>
                <div><i className="legend-dot gold" /> 次要 / 观察</div>
                <div><i className="legend-dot teal" /> 气机示意</div>
              </div>
            </div>
            <div className="report-lesions">
              {lesions.slice(0, 4).map((lesion, index) => (
                <div key={lesion.id}>
                  <span>{index + 1}</span>
                  <b>{lesion.label}</b>
                  <small>{ORGAN_BY_ID[lesion.organId]?.label} · {lesion.severity}</small>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="report-block">
          <div className="report-block-head"><span>03</span><h2>本次调理方案记录</h2></div>
          <div className="report-formula-head">
            <strong>{formula.name}</strong>
            <span>{formula.courseDays} 天 · {formula.decoction}</span>
          </div>
          <div className="report-herbs">
            {formula.herbs.map(herb => <span key={herb.id}>{herb.name} <b>{herb.dose}</b></span>)}
          </div>
          <p className="report-small">{formula.note || '本方为医生记录，仅用于本次沟通。'}</p>
        </section>

        <section className="report-grid-two report-bottom-grid">
          <div className="report-block">
            <div className="report-block-head"><span>04</span><h2>7 / 14 / 30 天趋势</h2></div>
            <div className="report-timeline">
              {SIMULATION.map(point => (
                <div key={point.day} className="report-time-row">
                  <span>{point.label}</span>
                  <div><i style={{ width: `${point.score}%` }} /></div>
                  <b>{point.score}</b>
                </div>
              ))}
            </div>
            <p className="report-small">趋势为基于证型与疗程的示意模拟，假设依从性良好、无新增应激事件；不是疗效预测。</p>
          </div>

          <div className="report-block">
            <div className="report-block-head"><span>05</span><h2>生活调护与复诊</h2></div>
            <ul className="report-advice">
              <li><b>作息</b><span>固定起床时间，睡前 1 小时减少屏幕与强光刺激。</span></li>
              <li><b>饮食</b><span>规律进食，少食生冷油腻；若纳差持续，记录每日进食情况。</span></li>
              <li><b>情志</b><span>工作压力较大时安排短时散步或呼吸练习，避免睡前反复思考。</span></li>
              <li><b>复诊</b><span>2 周后复诊；若出现持续加重、明显情绪低落或急症表现，及时就医。</span></li>
            </ul>
          </div>
        </section>

        <footer className="report-footer">
          <MeridianDivider label="岐黄 · 辨证论治" />
          <div className="report-disclaimer">
            <ShieldCheck size={15} />
            <p>
              <b>重要说明：</b>本报告由“岐黄 · 状态”在医生输入的基础上生成，用于医患沟通与健康教育。
              它不是诊断报告，不替代面诊、检验检查或处方审核；7 / 14 / 30 天趋势为示意模拟，不构成疗效承诺。
              方药内容由医生提供，系统不生成剂量建议。
            </p>
          </div>
          <div className="report-sign">
            <span>医师签名 / 日期</span>
            <div />
          </div>
          <div className="report-foot-line">
            <span>岐黄 · 状态 / Qihuang State</span>
            <span>BodyParts3D · CC BY 4.0 · 报告编号 {reportNo}</span>
          </div>
        </footer>
      </article>

      <div className="report-note">
        <FileText size={14} />
        <span>打印时请选择 A4、纵向、取消页眉页脚；深色屏幕预览会自动切换为白底报告。</span>
      </div>
    </div>
  );
}
