import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile, stat as statFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { analyzeWithDeepSeek } from './deepseek.mjs';
import { getStore } from './db.mjs';
import { HttpError } from './schema.mjs';

const envPath = fileURLToPath(new URL('./.env.local', import.meta.url));
if (existsSync(envPath)) {
  try {
    process.loadEnvFile(envPath);
  } catch (error) {
    console.warn('[server] 无法读取 .env.local:', error.message);
  }
}

const store = getStore();
const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '127.0.0.1';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || 'http://127.0.0.1:5173,http://localhost:5173')
  .split(',')
  .map(item => item.trim())
  .filter(Boolean);
const STATIC_DIR = process.env.STATIC_DIR
  ? resolve(process.cwd(), process.env.STATIC_DIR)
  : fileURLToPath(new URL('../app/dist', import.meta.url));
const RATE_LIMIT = 6;
const RATE_WINDOW_MS = 60_000;
const buckets = new Map();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.glb': 'model/gltf-binary',
  '.gz': 'application/gzip',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

function corsHeaders(origin) {
  const headers = {
    'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '600',
  };
  if (origin && (ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*'))) {
    headers['access-control-allow-origin'] = origin;
    headers.vary = 'origin';
  }
  return headers;
}

function sendJson(res, status, payload, origin) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
    ...corsHeaders(origin),
  });
  res.end(body);
}

async function serveStatic(req, res, origin) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    return false;
  }
  if (pathname.startsWith('/api/')) return false;

  const root = resolve(STATIC_DIR);
  let filePath = resolve(root, `.${pathname}`);
  if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) return false;

  try {
    const info = await statFile(filePath);
    if (info.isDirectory()) filePath = join(filePath, 'index.html');
  } catch {
    if (extname(pathname)) return false;
    filePath = join(root, 'index.html');
  }

  try {
    const body = await readFile(filePath);
    const extension = extname(filePath).toLowerCase();
    const isHashedAsset = pathname.startsWith('/assets/');
    const isModel = pathname.startsWith('/models/');
    const cacheControl = isHashedAsset
      ? 'public, max-age=31536000, immutable'
      : isModel
        ? 'public, max-age=3600'
        : 'no-cache';
    res.writeHead(200, {
      'content-type': MIME[extension] || 'application/octet-stream',
      'content-length': body.length,
      'cache-control': cacheControl,
      'x-content-type-options': 'nosniff',
      ...corsHeaders(origin),
    });
    if (req.method !== 'HEAD') res.end(body);
    else res.end();
    return true;
  } catch {
    return false;
  }
}

function clientKey(req) {
  return req.socket.remoteAddress || 'unknown';
}

function isRateLimited(req) {
  const key = clientKey(req);
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || now - current.startedAt > RATE_WINDOW_MS) {
    buckets.set(key, { startedAt: now, count: 1 });
    return false;
  }
  current.count += 1;
  return current.count > RATE_LIMIT;
}

function readBody(req) {
  return new Promise((resolveBody, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > 64 * 1024) {
        reject(new HttpError(413, 'BODY_TOO_LARGE', '请求体过大。'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function readJson(req) {
  const rawBody = await readBody(req);
  try {
    return JSON.parse(rawBody || '{}');
  } catch {
    throw new HttpError(400, 'INVALID_JSON', '请求体不是合法 JSON。');
  }
}

async function handleAnalyze(res, origin, patient) {
  if (!patient) throw new HttpError(400, 'INVALID_PATIENT', '请求中缺少 patient。');
  const result = await analyzeWithDeepSeek(patient);
  sendJson(res, 200, result, origin);
}

async function handleApi(req, res, pathname, origin) {
  if (req.method === 'GET' && pathname === '/api/health') {
    sendJson(
      res,
      200,
      {
        ok: true,
        provider: 'deepseek',
        configured: Boolean(process.env.DEEPSEEK_API_KEY?.trim()),
        model: process.env.DEEPSEEK_MODEL?.trim() || 'deepseek-flash',
        storage: 'sqlite',
      },
      origin,
    );
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/cases') {
    sendJson(res, 200, { cases: store.listCases() }, origin);
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/cases') {
    const body = await readJson(req);
    const created = store.createCase(body.patient);
    sendJson(res, 201, { case: created }, origin);
    return true;
  }

  const caseMatch = pathname.match(/^\/api\/cases\/([^/]+)$/);
  if (caseMatch) {
    const id = decodeURIComponent(caseMatch[1]);
    if (req.method === 'GET') {
      sendJson(res, 200, store.getCase(id), origin);
      return true;
    }
    if (req.method === 'PATCH') {
      const body = await readJson(req);
      const updated = store.updateCase(id, body);
      sendJson(res, 200, { case: updated }, origin);
      return true;
    }
    if (req.method === 'DELETE') {
      store.softDeleteCase(id);
      sendJson(res, 200, { ok: true }, origin);
      return true;
    }
  }

  const caseActionMatch = pathname.match(/^\/api\/cases\/([^/]+)\/(analyze|analyses|formulas|reports)$/);
  if (caseActionMatch) {
    const id = decodeURIComponent(caseActionMatch[1]);
    const action = caseActionMatch[2];

    if (action === 'analyses' && req.method === 'GET') {
      sendJson(res, 200, { analyses: store.listAnalyses(id) }, origin);
      return true;
    }

    if (action === 'analyze' && req.method === 'POST') {
      if (isRateLimited(req)) {
        throw new HttpError(429, 'RATE_LIMITED', '请求过于频繁，请稍后再试。');
      }
      const record = store.getCase(id).case;
      const result = await analyzeWithDeepSeek(record.patient);
      const saved = store.saveAnalysis(id, result.analysis, result.meta);
      sendJson(
        res,
        200,
        { ...result, analysisId: saved.id, caseId: id },
        origin,
      );
      return true;
    }

    if (action === 'formulas' && req.method === 'GET') {
      sendJson(res, 200, { formulas: store.listFormulas(id) }, origin);
      return true;
    }

    if (action === 'formulas' && req.method === 'POST') {
      const body = await readJson(req);
      const saved = store.saveFormula(id, body.formula);
      sendJson(res, 201, { formula: saved }, origin);
      return true;
    }

    if (action === 'reports' && req.method === 'GET') {
      sendJson(res, 200, { reports: store.listReports(id) }, origin);
      return true;
    }

    if (action === 'reports' && req.method === 'POST') {
      const body = await readJson(req);
      const saved = store.saveReport(id, body);
      sendJson(res, 201, saved, origin);
      return true;
    }
  }

  const reportMatch = pathname.match(/^\/api\/reports\/([^/]+)$/);
  if (reportMatch && req.method === 'GET') {
    sendJson(res, 200, store.getReport(decodeURIComponent(reportMatch[1])), origin);
    return true;
  }

  if (pathname === '/api/analyze' && req.method === 'POST') {
    if (isRateLimited(req)) {
      throw new HttpError(429, 'RATE_LIMITED', '请求过于频繁，请稍后再试。');
    }
    const body = await readJson(req);
    await handleAnalyze(res, origin, body.patient);
    return true;
  }

  return false;
}

async function handler(req, res) {
  const origin = req.headers.origin;
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders(origin));
    res.end();
    return;
  }

  const pathname = (() => {
    try {
      return new URL(req.url, 'http://localhost').pathname;
    } catch {
      return '';
    }
  })();

  if (pathname.startsWith('/api/')) {
    const startedAt = Date.now();
    try {
      const handled = await handleApi(req, res, pathname, origin);
      if (!handled) {
        sendJson(res, 404, { error: { code: 'NOT_FOUND', message: '接口不存在。' } }, origin);
      }
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      const code = error instanceof HttpError ? error.code : 'INTERNAL_ERROR';
      const message =
        error instanceof HttpError ? error.message : '服务内部错误，请稍后重试。';
      sendJson(res, status, { error: { code, message } }, origin);
      console.log(`[api] ${status} ${code} ${req.method} ${pathname} ${Date.now() - startedAt}ms`);
    }
    return;
  }

  if (await serveStatic(req, res, origin)) return;
  sendJson(res, 404, { error: { code: 'NOT_FOUND', message: '资源不存在。' } }, origin);
}

const server = createServer(handler);

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  server.listen(PORT, HOST, () => {
    const configured = Boolean(process.env.DEEPSEEK_API_KEY?.trim());
    console.log(`[server] http://${HOST}:${PORT}`);
    console.log(`[server] static ${existsSync(join(STATIC_DIR, 'index.html')) ? STATIC_DIR : '未找到（API-only）'}`);
    console.log(`[server] DeepSeek ${configured ? '已配置' : '未配置（健康检查会提示 configured:false）'}`);
  });
  const shutdown = () => server.close(() => process.exit(0));
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

export { server, handler };
