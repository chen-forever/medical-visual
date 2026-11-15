import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractJson,
  normalizeAnalysis,
  validatePatient,
} from '../schema.mjs';
import { detectRedFlags } from '../redFlags.mjs';

test('validates and trims patient input', () => {
  const patient = validatePatient({
    patient: {
      alias: '  林女士  ',
      age: 38,
      sex: 'female',
      chiefComplaint: '  入睡困难  ',
      inquiry: '多梦',
      tags: ['乏力'],
    },
  });
  assert.equal(patient.alias, '林女士');
  assert.equal(patient.chiefComplaint, '入睡困难');
  assert.equal(patient.age, 38);
});

test('rejects missing chief complaint', () => {
  assert.throws(
    () => validatePatient({ alias: '林女士', chiefComplaint: '' }),
    error => error.code === 'INVALID_PATIENT',
  );
});

test('extracts JSON from a fenced model response', () => {
  const parsed = extractJson('说明\n```json\n{"patterns":[]}\n```\n');
  assert.deepEqual(parsed, { patterns: [] });
});

test('normalizes confidence, organs and primaryId', () => {
  const analysis = normalizeAnalysis(
    {
      patterns: [{
        id: 'p1',
        name: '心脾两虚',
        confidence: 180,
        summary: ' summary ',
        evidence: ['入睡困难'],
        organs: ['心', '脾', '三焦'],
        meridians: ['手少阴心经'],
        rationale: '思虑劳倦',
      }],
      primaryId: 'missing',
      redFlags: [],
      missingInfo: ['饮食'],
    },
    { modelLabel: 'DeepSeek · deepseek-flash', promptVersion: 'test' },
  );
  assert.equal(analysis.patterns[0].confidence, 100);
  assert.deepEqual(analysis.patterns[0].organs, ['心', '脾']);
  assert.equal(analysis.primaryId, 'p1');
  assert.equal(analysis.modelLabel, 'DeepSeek · deepseek-flash');
  assert.match(analysis.disclaimer, /不是诊断/);
});

test('rejects an analysis with no patterns and no red flags', () => {
  assert.throws(
    () => normalizeAnalysis({ patterns: [], redFlags: [] }, { modelLabel: 'x' }),
    error => error.code === 'INVALID_ANALYSIS',
  );
});

test('detects urgent red flags without treating them as diagnosis', () => {
  const hits = detectRedFlags({
    chiefComplaint: '突发胸痛伴大汗，左侧肢体无力',
    inquiry: '言语不清',
  });
  assert.ok(hits.includes('胸痛 / 疑似心血管急症'));
  assert.ok(hits.includes('疑似脑卒中'));
});
