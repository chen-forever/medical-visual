import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeWithDeepSeek, callDeepSeek } from '../deepseek.mjs';

const PATIENT = {
  alias: '林女士',
  age: 38,
  sex: 'female',
  chiefComplaint: '入睡困难，乏力',
  inspection: '舌淡',
  listening: '',
  inquiry: '纳差',
  palpation: '脉细弱',
  tags: ['失眠'],
};

const VALID = JSON.stringify({
  patterns: [{
    id: 'heart-spleen',
    name: '心脾两虚',
    confidence: 78,
    summary: '心血不足、脾气虚弱并见。',
    evidence: ['入睡困难', '乏力', '脉细弱'],
    organs: ['心', '脾'],
    meridians: ['手少阴心经', '足太阴脾经'],
    rationale: '四诊信息相互支持。',
  }],
  primaryId: 'heart-spleen',
  redFlags: [],
  missingInfo: ['饮食偏嗜'],
});

function jsonResponse(content, status = 200) {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
    }),
    { status, headers: { 'content-type': 'application/json' } },
  );
}

test('calls DeepSeek with JSON mode and disabled thinking', async () => {
  let requestBody;
  const fetchImpl = async (_url, init) => {
    requestBody = JSON.parse(init.body);
    return jsonResponse(VALID);
  };
  const result = await analyzeWithDeepSeek(PATIENT, {
    fetchImpl,
    env: { DEEPSEEK_API_KEY: 'test-key', DEEPSEEK_MODEL: 'deepseek-flash' },
  });
  assert.equal(requestBody.model, 'deepseek-flash');
  assert.deepEqual(requestBody.response_format, { type: 'json_object' });
  assert.deepEqual(requestBody.thinking, { type: 'disabled' });
  assert.equal(result.meta.provider, 'deepseek');
  assert.equal(result.analysis.patterns[0].name, '心脾两虚');
});

test('retries once when the first response is not JSON', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return calls === 1 ? jsonResponse('not json') : jsonResponse(VALID);
  };
  const result = await analyzeWithDeepSeek(PATIENT, {
    fetchImpl,
    env: { DEEPSEEK_API_KEY: 'test-key' },
  });
  assert.equal(calls, 2);
  assert.equal(result.analysis.patterns.length, 1);
});

test('maps upstream auth errors without leaking the key', async () => {
  const fetchImpl = async () => new Response('unauthorized', { status: 401 });
  await assert.rejects(
    () => callDeepSeek(PATIENT, {
      fetchImpl,
      env: { DEEPSEEK_API_KEY: 'never-log-this-key' },
    }),
    error => error.code === 'UPSTREAM_AUTH' && !error.message.includes('never-log-this-key'),
  );
});

test('short-circuits on red flags without calling the model', async () => {
  let called = false;
  const result = await analyzeWithDeepSeek(
    { ...PATIENT, chiefComplaint: '突发胸痛伴大汗' },
    {
      fetchImpl: async () => { called = true; return jsonResponse(VALID); },
      env: { DEEPSEEK_API_KEY: 'test-key' },
    },
  );
  assert.equal(called, false);
  assert.equal(result.meta.blocked, true);
  assert.equal(result.analysis.patterns.length, 0);
  assert.ok(result.analysis.redFlags.length > 0);
});

test('missing key fails closed', async () => {
  await assert.rejects(
    () => analyzeWithDeepSeek(PATIENT, { env: {} }),
    error => error.code === 'CONFIG_MISSING',
  );
});
