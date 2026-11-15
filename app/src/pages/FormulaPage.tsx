import { useState } from 'react';
import { ArrowRight, BookOpen, Check, FlaskConical, Info, Plus, Save, Trash2 } from 'lucide-react';
import { createCase, saveFormula as saveFormulaServer } from '../api/casesClient';
import { analysisErrorMessage } from '../api/analysisClient';
import { go } from '../navigation';
import { useCaseStore } from '../store';
import type { Formula, Herb } from '../types';

const LIBRARY: Array<{ name: string; hint: string; herbs: Herb[] }> = [
  {
    name: '归脾汤',
    hint: '益气补血，健脾养心',
    herbs: [
      { id: 'lib1', name: '黄芪', dose: '15g', role: '益气健脾' },
      { id: 'lib2', name: '党参', dose: '12g', role: '补中益气' },
      { id: 'lib3', name: '白术', dose: '10g', role: '健脾燥湿' },
      { id: 'lib4', name: '当归', dose: '10g', role: '养血和血' },
      { id: 'lib5', name: '茯神', dose: '12g', role: '宁心安神' },
      { id: 'lib6', name: '酸枣仁', dose: '15g', role: '养心安神' },
    ],
  },
  {
    name: '参苓白术散',
    hint: '健脾益气，渗湿止泻',
    herbs: [
      { id: 'lib7', name: '党参', dose: '12g', role: '补中益气' },
      { id: 'lib8', name: '白术', dose: '12g', role: '健脾燥湿' },
      { id: 'lib9', name: '茯苓', dose: '15g', role: '利水渗湿' },
      { id: 'lib10', name: '山药', dose: '15g', role: '补脾养胃' },
      { id: 'lib11', name: '薏苡仁', dose: '20g', role: '健脾渗湿' },
    ],
  },
  {
    name: '酸枣仁汤',
    hint: '养血安神，清热除烦',
    herbs: [
      { id: 'lib12', name: '酸枣仁', dose: '18g', role: '养心安神' },
      { id: 'lib13', name: '茯苓', dose: '12g', role: '宁心' },
      { id: 'lib14', name: '知母', dose: '10g', role: '清热除烦' },
      { id: 'lib15', name: '川芎', dose: '6g', role: '调血' },
      { id: 'lib16', name: '甘草', dose: '6g', role: '调和' },
    ],
  },
];

export default function FormulaPage() {
  const stored = useCaseStore(state => state.formula);
  const patient = useCaseStore(state => state.patient);
  const caseId = useCaseStore(state => state.caseId);
  const setCaseRef = useCaseStore(state => state.setCaseRef);
  const setFormula = useCaseStore(state => state.setFormula);
  const markComplete = useCaseStore(state => state.markComplete);
  const [formula, setLocalFormula] = useState<Formula>({
    ...stored,
    herbs: stored.herbs.map(herb => ({ ...herb })),
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateHerb = (id: string, patch: Partial<Herb>) => {
    setLocalFormula(prev => ({
      ...prev,
      herbs: prev.herbs.map(herb => (herb.id === id ? { ...herb, ...patch } : herb)),
    }));
    setSaved(false);
  };

  const addHerb = () => {
    setLocalFormula(prev => ({
      ...prev,
      herbs: [...prev.herbs, { id: `h-${Date.now()}`, name: '', dose: '', role: '' }],
    }));
    setSaved(false);
  };

  const removeHerb = (id: string) => {
    setLocalFormula(prev => ({ ...prev, herbs: prev.herbs.filter(herb => herb.id !== id) }));
    setSaved(false);
  };

  const loadLibrary = (item: (typeof LIBRARY)[number]) => {
    setLocalFormula(prev => ({
      ...prev,
      name: item.name,
      herbs: item.herbs.map(herb => ({ ...herb })),
    }));
    setSaved(false);
  };

  const save = async (next = false) => {
    setSaving(true);
    setError('');
    try {
      let activeCaseId = caseId;
      if (!activeCaseId) {
        const created = await createCase(patient);
        activeCaseId = created.id;
        setCaseRef(created.id, created.version, created.lesionVersion);
      }
      await saveFormulaServer(activeCaseId, formula);
      setFormula(formula);
      markComplete('formula');
      setSaved(true);
      if (next) window.setTimeout(() => go('timeline'), 240);
    } catch (caught) {
      setError(analysisErrorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="formula-page">
      <div className="formula-layout">
        <section className="panel formula-editor">
          <div className="panel-head">
            <div><span className="panel-kicker">RECORD / 方案记录</span><h3>医生给出的药方</h3></div>
            <span className="record-chip"><FlaskConical size={13} /> 仅记录</span>
          </div>

          <div className="tcm-formula-legend" aria-label="君臣佐使">
            <span><b>君</b>主病之药</span>
            <span><b>臣</b>辅助君药</span>
            <span><b>佐</b>兼治兼制</span>
            <span><b>使</b>引经调和</span>
          </div>

          <div className="formula-top">
            <label className="field">
              <span>方名</span>
              <input
                value={formula.name}
                onChange={event => { setLocalFormula(prev => ({ ...prev, name: event.target.value })); setSaved(false); }}
                placeholder="如：归脾汤加减"
              />
            </label>
            <label className="field course-field">
              <span>记录疗程</span>
              <select
                value={formula.courseDays}
                onChange={event => setLocalFormula(prev => ({ ...prev, courseDays: Number(event.target.value) as 7 | 14 | 30 }))}
              >
                <option value={7}>7 天</option>
                <option value={14}>14 天</option>
                <option value={30}>30 天</option>
              </select>
            </label>
          </div>

          <div className="herb-table">
            <div className="herb-head"><span>药味</span><span>剂量</span><span>在方中的角色</span><span /></div>
            {formula.herbs.map((herb, index) => (
              <div className="herb-row" key={herb.id}>
                <div className="herb-name">
                  <span className="herb-index">{String(index + 1).padStart(2, '0')}</span>
                  <input value={herb.name} onChange={event => updateHerb(herb.id, { name: event.target.value })} placeholder="药名" />
                </div>
                <input className="dose-input" value={herb.dose} onChange={event => updateHerb(herb.id, { dose: event.target.value })} placeholder="9g" />
                <input value={herb.role} onChange={event => updateHerb(herb.id, { role: event.target.value })} placeholder="如：益气健脾" />
                <button className="row-remove" onClick={() => removeHerb(herb.id)} aria-label={`删除${herb.name}`}><Trash2 size={14} /></button>
              </div>
            ))}
            <button className="add-herb" onClick={addHerb}><Plus size={14} /> 添加药味</button>
          </div>

          <div className="formula-notes">
            <label className="field">
              <span>煎服法</span>
              <input
                value={formula.decoction}
                onChange={event => setLocalFormula(prev => ({ ...prev, decoction: event.target.value }))}
                placeholder="水煎服，每日 1 剂，分早晚温服。"
              />
            </label>
            <label className="field">
              <span>医生备注</span>
              <textarea
                rows={2}
                value={formula.note}
                onChange={event => setLocalFormula(prev => ({ ...prev, note: event.target.value }))}
                placeholder="记录医嘱、复诊安排或需要观察的反应。"
              />
            </label>
          </div>

          <div className="formula-warning">
            <Info size={16} />
            <div>
              <b>系统不生成剂量建议，也不判断处方是否合适。</b>
              <span>药方由医生输入；本页只负责记录、展示与后续时间模拟。妊娠、肝肾功能异常、儿童与老年患者需单独评估。</span>
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="formula-actions">
            <button className="btn btn-ghost" onClick={() => save(false)} disabled={saving}>
              {saved ? <Check size={15} /> : <Save size={15} />} {saving ? '保存中…' : saved ? '已保存' : '保存方案'}
            </button>
            <button className="btn btn-gold" onClick={() => save(true)} disabled={saving}>
              保存并进入时间模拟 <ArrowRight size={15} />
            </button>
          </div>
        </section>

        <aside className="formula-side">
          <section className="panel side-panel">
            <div className="panel-head"><div><span className="panel-kicker">LIBRARY / 方剂库</span><h3>从经典方开始</h3></div><BookOpen size={15} className="muted-icon" /></div>
            <p className="small-copy">点击只是载入药味与常用角色，剂量仍需医生按个体情况填写。</p>
            <div className="library-list">
              {LIBRARY.map(item => (
                <button key={item.name} className="library-item" onClick={() => loadLibrary(item)}>
                  <div><b>{item.name}</b><span>{item.hint}</span></div>
                  <span className="library-count">{item.herbs.length} 味</span>
                </button>
              ))}
            </div>
          </section>

          <section className="panel side-panel formula-summary">
            <div className="panel-head"><div><span className="panel-kicker">SUMMARY</span><h3>当前记录</h3></div></div>
            <div className="formula-summary-big"><strong>{formula.herbs.length}</strong><span>味药</span><i /> <strong>{formula.courseDays}</strong><span>天</span></div>
            <div className="summary-lines">
              <div><span>方名</span><b>{formula.name || '未命名'}</b></div>
              <div><span>煎服</span><b>{formula.decoction || '未填写'}</b></div>
              <div><span>状态</span><b>{saved ? '已保存到本机' : '有未保存修改'}</b></div>
            </div>
            <div className="section-hint"><Info size={13} /> 时间模拟只使用“证型 + 疗程”生成趋势，不把药方当疗效预测。</div>
          </section>
        </aside>
      </div>
    </div>
  );
}
