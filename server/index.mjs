import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile, stat as statFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { analyzeWithDeepSeek } from './deepseek.mjs';
import { HttpError } from './schema.mjs';

const envPath = fileURLToPath(new URL('./.env.local', import.meta.url));
if (existsSync(envPath)) {
  try {
    process.loadEnvFile(envPath);
  } catch (error) {
    console.warn('[server] 无法读取 .env.local:', error.message);
  }
}

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
    'access-control-allow-methods': 'GET, POST, OPTIONS',
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

async function handler(req, res) {
  const origin = req.headers.origin;
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders(origin));
    res.end();
    return;
  }

  if (req.url?.startsWith('/api/')) {
    if (req.method === 'GET' && req.url === '/api/health') {
      sendJson(
        res,
        200,
        {
          ok: true,
          provider: 'deepseek',
          configured: Boolean(process.env.DEEPSEEK_API_KEY?.trim()),
          model: process.env.DEEPSEEK_MODEL?.trim() || 'deepseek-flash',
        },
        origin,
      );
      return;
    }

    if (req.method !== 'POST' || req.url !== '/api/analyze') {
      sendJson(res, 404, { error: { code: 'NOT_FOUND', message: '接口不存在。' } }, origin);
      return;
    }

    if (isRateLimited(req)) {
      sendJson(
        res,
        429,
        { error: { code: 'RATE_LIMITED', message: '请求过于频繁，请稍后再试。' } },
        origin,
      );
      return;
    }

    const startedAt = Date.now();
    try {
      const rawBody = await readBody(req);
      let payload;
      try {
        payload = JSON.parse(rawBody || '{}');
      } catch {
        throw new HttpError(400, 'INVALID_JSON', '请求体不是合法 JSON。');
      }
      const { patient } = payload;
      if (!patient) throw new HttpError(400, 'INVALID_PATIENT', '请求中缺少 patient。');
      const result = await analyzeWithDeepSeek(patient);
      sendJson(res, 200, result, origin);
      console.log(`[analyze] 200 ${Date.now() - startedAt}ms`);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      const code = error instanceof HttpError ? error.code : 'INTERNAL_ERROR';
      const message =
        error instanceof HttpError ? error.message : '服务内部错误，请稍后重试。';
      sendJson(res, status, { error: { code, message } }, origin);
      console.log(`[analyze] ${status} ${code} ${Date.now() - startedAt}ms`);
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
