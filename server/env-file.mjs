import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { randomBytes } from 'node:crypto';

const KEY_PATTERN = /^[A-Z][A-Z0-9_]*$/;

export function validatePassword(password) {
  if (typeof password !== 'string') return '密码格式无效。';
  if (password.length < 8) return '密码至少需要 8 位。';
  if (password.length > 128) return '密码不能超过 128 位。';
  if (password.trim() !== password) return '密码首尾不能有空格。';
  if (/\s/.test(password)) return '密码不能包含空格或换行。';
  if (password.includes('#')) return '密码不能包含 #，避免配置解析错误。';
  return '';
}

export function getEnvValue(content, key) {
  if (!content) return '';
  const line = content
    .split(/\r?\n/)
    .find(item => item.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1) : '';
}

export function upsertEnvValue(content, key, value) {
  if (!KEY_PATTERN.test(key)) throw new Error(`非法配置键：${key}`);
  const text = String(value);
  if (/[\r\n]/.test(text)) throw new Error('配置值不能包含换行。');
  const lines = String(content ?? '').split(/\r?\n/);
  let replaced = false;
  const next = lines.map(line => {
    if (!replaced && line.startsWith(`${key}=`)) {
      replaced = true;
      return `${key}=${text}`;
    }
    return line;
  });
  if (!replaced) {
    if (next.length && next[next.length - 1] === '') next.pop();
    next.push(`${key}=${text}`, '');
  }
  return next.join('\n');
}

export function ensureSessionSecret(content, { rotate = false } = {}) {
  if (!rotate && getEnvValue(content, 'SESSION_SECRET').trim()) return content;
  return upsertEnvValue(content, 'SESSION_SECRET', randomBytes(48).toString('base64url'));
}

export function writeEnvFileAtomic(path, content) {
  const temporary = join(dirname(path), `.${Date.now()}-${process.pid}.env.tmp`);
  writeFileSync(temporary, content, { mode: 0o600 });
  renameSync(temporary, path);
}

export function readEnvFile(path) {
  if (!existsSync(path)) return '';
  return readFileSync(path, 'utf8');
}

export function envFilePath(directory) {
  return join(directory, '.env.local');
}
