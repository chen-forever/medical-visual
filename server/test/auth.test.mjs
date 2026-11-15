import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authConfig,
  clearSessionCookie,
  createSessionToken,
  parseCookies,
  safeEqual,
  sessionCookie,
  verifySessionToken,
} from '../auth.mjs';

const secret = 'test-session-secret';

test('session token verifies and rejects tampering', () => {
  const token = createSessionToken(secret);
  assert.equal(verifySessionToken(token, secret), true);
  assert.equal(verifySessionToken(`${token}x`, secret), false);
  assert.equal(verifySessionToken(token, 'wrong-secret'), false);
  assert.equal(verifySessionToken(createSessionToken(secret, 0), secret, Date.now() + 13 * 60 * 60 * 1000), false);
});

test('cookies are signed-in and cleared with HttpOnly', () => {
  const token = createSessionToken(secret);
  const set = sessionCookie(token);
  assert.match(set, /HttpOnly/);
  assert.match(set, /SameSite=Lax/);
  assert.match(set, /qihuang_session=/);
  assert.match(clearSessionCookie(), /Max-Age=0/);
  assert.match(sessionCookie(token, { secure: true }), /Secure/);
});

test('cookie parsing and constant-time comparison', () => {
  const cookies = parseCookies('a=1; qihuang_session=abc%2Edef; b=2');
  assert.equal(cookies.a, '1');
  assert.equal(cookies.qihuang_session, 'abc.def');
  assert.equal(safeEqual('same', 'same'), true);
  assert.equal(safeEqual('same', 'diff'), false);
  assert.equal(safeEqual('short', 'longer'), false);
});

test('auth config requires a password and keeps empty values disabled', () => {
  assert.equal(authConfig({}).required, false);
  assert.equal(authConfig({ APP_ACCESS_PASSWORD: '  ' }).required, false);
  assert.equal(authConfig({ APP_ACCESS_PASSWORD: 'pw' }).required, true);
  assert.equal(authConfig({ APP_ACCESS_PASSWORD: 'pw', SESSION_SECRET: 's' }).secret, 's');
});
