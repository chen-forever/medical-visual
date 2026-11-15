import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createStore } from '../db.mjs';

const dir = mkdtempSync(join(tmpdir(), 'qihuang-db-test-'));
const store = createStore(join(dir, 'test.sqlite'));

test.after(() => {
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

const patient = {
  alias: '林女士',
  age: 38,
  sex: 'female',
  chiefComplaint: '入睡困难',
  inspection: '舌淡',
  listening: '',
  inquiry: '乏力',
  palpation: '脉细弱',
  tags: ['失眠'],
};

const analysis = {
  patterns: [{
    id: 'heart-spleen',
    name: '心脾两虚',
    confidence: 80,
    summary: 'summary',
    evidence: ['入睡困难'],
    organs: ['心', '脾'],
    meridians: ['手少阴心经'],
    rationale: 'rationale',
  }],
  primaryId: 'heart-spleen',
  redFlags: [],
  missingInfo: [],
  generatedAt: new Date().toISOString(),
  modelLabel: 'DeepSeek · deepseek-flash',
  disclaimer: 'disclaimer',
};

test('case lifecycle is persisted and versioned', () => {
  const created = store.createCase({ patient });
  assert.equal(created.patient.alias, '林女士');
  assert.equal(created.version, 1);
  const id = created.id;

  const updated = store.updateCase(id, {
    version: created.version,
    patient: { ...patient, chiefComplaint: '入睡困难加重' },
  });
  assert.equal(updated.version, 2);
  assert.equal(updated.patient.chiefComplaint, '入睡困难加重');

  assert.throws(
    () => store.updateCase(id, { version: 1, patient }),
    error => error.code === 'CASE_VERSION_CONFLICT',
  );

  const loaded = store.getCase(id);
  assert.equal(loaded.case.patient.alias, '林女士');
  assert.equal(store.listCases().length, 1);
});

test('analysis, formula and immutable report are stored', () => {
  const created = store.createCase({ patient });
  const caseId = created.id;
  const savedAnalysis = store.saveAnalysis(caseId, analysis, {
    provider: 'deepseek',
    model: 'deepseek-flash',
    promptVersion: 'test',
    latencyMs: 120,
  });
  const savedFormula = store.saveFormula(caseId, {
    name: '归脾汤',
    herbs: [{ name: '黄芪', dose: '15g', role: '益气' }],
    decoction: '水煎服',
    courseDays: 14,
    note: '复诊',
  });
  const savedReport = store.saveReport(caseId, {
    analysisId: savedAnalysis.id,
    formulaId: savedFormula.id,
    lesions: [{ id: 'l1', organId: 'heart', label: '心神失养' }],
    simulation: [{ day: 7, score: 50 }],
  });
  assert.ok(savedReport.id);
  assert.equal(savedReport.snapshot.analysis.patterns[0].name, '心脾两虚');
  assert.equal(savedReport.snapshot.formula.name, '归脾汤');
  assert.equal(savedReport.snapshot.lesions.length, 1);

  store.updateCase(caseId, {
    version: created.version,
    patient: { ...patient, alias: '新称呼' },
  });
  const report = store.getReport(savedReport.id);
  assert.equal(report.snapshot.case.patient.alias, '林女士');

  const loaded = store.getCase(caseId);
  assert.equal(loaded.analyses.length, 1);
  assert.equal(loaded.formulas.length, 1);
  assert.equal(loaded.reports.length, 1);
});

test('soft deletion hides a case', () => {
  const created = store.createCase({ patient });
  store.softDeleteCase(created.id);
  assert.throws(
    () => store.getCase(created.id),
    error => error.code === 'CASE_NOT_FOUND',
  );
});

test('lesions are versioned and audited', () => {
  const created = store.createCase({ patient });
  const updated = store.updateLesions(created.id, [{
    id: 'lesion-1',
    organId: 'heart',
    label: '心神失养',
  }], created.lesionVersion);
  assert.equal(updated.version, 1);
  assert.equal(updated.lesionVersion, 2);
  assert.equal(updated.lesions.length, 1);
  assert.throws(
    () => store.updateLesions(created.id, [], created.lesionVersion),
    error => error.code === 'LESION_VERSION_CONFLICT',
  );
  const events = store.listEvents(created.id);
  assert.ok(events.some(event => event.action === 'case.lesions_updated'));
});
