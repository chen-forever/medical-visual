import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  ensureSessionSecret,
  getEnvValue,
  readEnvFile,
  upsertEnvValue,
  validatePassword,
  writeEnvFileAtomic,
} from '../env-file.mjs';

const dir = mkdtempSync(join(tmpdir(), 'qihuang-env-test-'));

test.after(() => rmSync(dir, { recursive: true, force: true }));

test('password validation rejects empty, short, spaced and newline values', () => {
  assert.equal(validatePassword(''), '密码至少需要 8 位。');
  assert.equal(validatePassword('short'), '密码至少需要 8 位。');
  assert.equal(validatePassword('good-password'), '');
  assert.ok(validatePassword('has space'));
  assert.ok(validatePassword('line\nbreak'));
  assert.ok(validatePassword(`hash#value`));
});

test('upsert replaces only the target key and keeps the rest', () => {
  const source = '# comment\nDEEPSEEK_API_KEY=keep\nAPP_ACCESS_PASSWORD=old\nPORT=8787\n';
  const next = upsertEnvValue(source, 'APP_ACCESS_PASSWORD', 'new-password');
  assert.match(next, /^# comment\n/);
  assert.match(next, /DEEPSEEK_API_KEY=keep/);
  assert.match(next, /APP_ACCESS_PASSWORD=new-password/);
  assert.match(next, /PORT=8787/);
  assert.doesNotMatch(next, /APP_ACCESS_PASSWORD=old/);
  assert.equal(getEnvValue(next, 'APP_ACCESS_PASSWORD'), 'new-password');
});

test('upsert appends a missing key and rejects newline injection', () => {
  const next = upsertEnvValue('PORT=8787', 'SESSION_SECRET', 'secret');
  assert.equal(getEnvValue(next, 'SESSION_SECRET'), 'secret');
  assert.match(next, /PORT=8787\nSESSION_SECRET=secret\n$/);
  assert.throws(() => upsertEnvValue('', 'APP_ACCESS_PASSWORD', 'a\nb'));
});

test('session secret is generated once and can be rotated', () => {
  const first = ensureSessionSecret('APP_ACCESS_PASSWORD=x');
  const secret = getEnvValue(first, 'SESSION_SECRET');
  assert.ok(secret.length > 20);
  assert.equal(ensureSessionSecret(first), first);
  const rotated = ensureSessionSecret(first, { rotate: true });
  assert.notEqual(getEnvValue(rotated, 'SESSION_SECRET'), secret);
});

test('env file is written atomically', () => {
  const path = join(dir, '.env.local');
  writeEnvFileAtomic(path, 'APP_ACCESS_PASSWORD=test-value\n');
  assert.equal(readEnvFile(path), 'APP_ACCESS_PASSWORD=test-value\n');
  assert.equal(readFileSync(path, 'utf8'), 'APP_ACCESS_PASSWORD=test-value\n');
});
