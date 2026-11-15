import { useState } from 'react';
import { ArrowRight, Ear, Eye, Hand, MessageSquareText, RotateCcw, ShieldCheck, UserRound } from 'lucide-react';
import { createCase, updateCase } from '../api/casesClient';
import { analysisErrorMessage } from '../api/analysisClient';
import { DEMO_PATIENT } from '../data';
import { go } from '../navigation';
import { useCaseStore } from '../store';
import type { Patient, Sex } from '../types';

const QUICK_TAGS = ['入睡困难', '多梦易醒', '乏力', '纳差', '便溏', '焦虑', '口干', '畏寒'];

export default function PatientPage() {
  const stored = useCaseStore(state => state.patient);
  const caseId = useCaseStore(state => state.caseId);
  const caseVersion = useCaseStore(state => state.caseVersion);
  const setPatient = useCaseStore(state => state.setPatient);
  const setCaseRef = useCaseStore(state => state.setCaseRef);
  const markAnalysisStale = useCaseStore(state => state.markAnalysisStale);
  const markComplete = useCaseStore(state => state.markComplete);
  const [form, setForm] = useState<Patient>({ ...stored });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const update = <K extends keyof Patient>(key: K, value: Patient[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setError('');
  };

  const toggleTag = (tag: string) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(item => item !== tag)
        : [...prev.tags, tag],
    }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.alias.trim()) {
      setError('请先填写患者称呼。');
      return;
    }
    if (!form.chiefComplaint.trim()) {
      setError('请填写主诉，后续分析需要它作为入口。');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const saved = caseId
        ? await updateCase(caseId, form, caseVersion, useCaseStore.getState().lesions)
        : await createCase(form);
      setPatient(form);
      setCaseRef(saved.id, saved.version, saved.lesionVersion);
      markAnalysisStale();
      markComplete('patient');
      go('analysis');
    } catch (caught) {
      setError(analysisErrorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="patient-page" onSubmit={submit}>
      <div className="form-layout">
        <section className="panel form-panel">
          <div className="panel-head">
            <div>
              <span className="panel-kicker">BASIC / 基本信息</span>
              <h3>这是谁，以及为什么来</h3>
            </div>
            <span className="required-note"><i /> 必填</span>
          </div>

          <div className="field-grid two">
            <label className="field">
              <span>患者称呼 <i>*</i></span>
              <input
                value={form.alias}
                onChange={event => update('alias', event.target.value)}
                placeholder="如：林女士"
              />
            </label>
            <label className="field">
              <span>年龄</span>
              <input
                type="number"
                min={0}
                max={120}
                value={form.age}
                onChange={event => update('age', event.target.value === '' ? '' : Number(event.target.value))}
                placeholder="38"
              />
            </label>
          </div>

          <div className="field">
            <span>性别</span>
            <div className="segmented">
              {([
                ['female', '女'],
                ['male', '男'],
                ['other', '其他 / 不填'],
              ] as Array<[Sex, string]>).map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  className={form.sex === value ? 'active' : ''}
                  onClick={() => update('sex', value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <label className="field">
            <span>主诉 <i>*</i></span>
            <textarea
              rows={3}
              value={form.chiefComplaint}
              onChange={event => update('chiefComplaint', event.target.value)}
              placeholder="用患者自己的话记录最主要的不适与持续时间"
            />
            <small>一句话即可，例如“反复入睡困难 3 个月，伴乏力、纳差”。</small>
          </label>

          <div className="field">
            <span>快速标记</span>
            <div className="tag-row">
              {QUICK_TAGS.map(tag => (
                <button
                  type="button"
                  key={tag}
                  className={`tag ${form.tags.includes(tag) ? 'active' : ''}`}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
            <small>这些词不会自动变成诊断，只作为四诊信息的检索线索。</small>
          </div>

          <div className="privacy-note">
            <ShieldCheck size={15} />
            <span>
              演示模式：请勿填写真实姓名、电话、身份证或人脸照片。本次病例会保存到本地服务端 SQLite，仍请使用去标识化信息。
            </span>
          </div>
        </section>

        <section className="panel form-panel">
          <div className="panel-head">
            <div>
              <span className="panel-kicker">FOUR DIAGNOSIS / 四诊</span>
              <h3>望、闻、问、切</h3>
            </div>
            <button
              type="button"
              className="text-btn"
              onClick={() => {
                setForm({ ...DEMO_PATIENT });
                setError('');
              }}
            >
              <RotateCcw size={13} /> 恢复演示病例
            </button>
          </div>

          <div className="four-grid">
            <label className="four-card">
              <div className="four-head"><Eye size={16} /><b>望</b><span>神色、舌象、形体</span></div>
              <textarea
                rows={3}
                value={form.inspection}
                onChange={event => update('inspection', event.target.value)}
                placeholder="面色、舌质、舌苔、形态……"
              />
            </label>
            <label className="four-card">
              <div className="four-head"><Ear size={16} /><b>闻</b><span>声音、气息、气味</span></div>
              <textarea
                rows={3}
                value={form.listening}
                onChange={event => update('listening', event.target.value)}
                placeholder="语声、呼吸、咳嗽、体味……"
              />
            </label>
            <label className="four-card">
              <div className="four-head"><MessageSquareText size={16} /><b>问</b><span>寒热、饮食、睡眠、二便</span></div>
              <textarea
                rows={5}
                value={form.inquiry}
                onChange={event => update('inquiry', event.target.value)}
                placeholder="睡眠、饮食、二便、情绪、月经……"
              />
            </label>
            <label className="four-card">
              <div className="four-head"><Hand size={16} /><b>切</b><span>脉象、腹诊</span></div>
              <textarea
                rows={5}
                value={form.palpation}
                onChange={event => update('palpation', event.target.value)}
                placeholder="脉象、腹部压痛、温度……"
              />
            </label>
          </div>

          <div className="form-tip">
            <UserRound size={15} />
            <div>
              <b>写“观察”，不写“结论”</b>
              <span>例如记录“舌淡胖有齿痕”，而不是直接写“脾虚”。证型留给下一步分析。</span>
            </div>
          </div>
        </section>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="action-bar">
        <div className="action-bar-copy">
          <span>第 01 / 09 步</span>
          <strong>四诊信息会用于证型候选，不会直接生成诊断。</strong>
        </div>
        <div className="action-bar-actions">
          <button type="button" className="btn btn-ghost" onClick={() => go('home')}>返回工作台</button>
          <button type="submit" className="btn btn-gold" disabled={saving}>
            {saving ? '保存中…' : '保存并进入分析'} <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </form>
  );
}
