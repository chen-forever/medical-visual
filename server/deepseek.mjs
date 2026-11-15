import {
  HttpError,
  extractJson,
  makeBlockedAnalysis,
  normalizeAnalysis,
} from './schema.mjs';
import { detectRedFlags } from './redFlags.mjs';
import { PROMPT_VERSION, buildMessages } from './prompt.mjs';

const DEFAULT_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_MODEL = 'deepseek-flash';
const TIMEOUT_MS = 25_000;

function upstreamError(statusCode) {
  if (statusCode === 401 || statusCode === 403) {
    return new HttpError(502, 'UPSTREAM_AUTH', 'DeepSeek 鉴权失败，请检查服务端 API Key。');
  }
  if (statusCode === 402) {
    return new HttpError(502, 'UPSTREAM_BALANCE', 'DeepSeek 账户余额不足。');
  }
  if (statusCode === 429) {
    return new HttpError(503, 'UPSTREAM_RATE_LIMIT', 'DeepSeek 请求过于频繁，请稍后重试。');
  }
  return new HttpError(502, 'UPSTREAM_ERROR', 'DeepSeek 服务暂时不可用，请稍后重试。');
}

export async function callDeepSeek(
  patient,
  { fetchImpl = fetch, env = process.env, signal } = {},
) {
  const apiKey = env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) {
    throw new HttpError(503, 'CONFIG_MISSING', '服务端未配置 DEEPSEEK_API_KEY。');
  }
  const baseUrl = (env.DEEPSEEK_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const model = env.DEEPSEEK_MODEL?.trim() || DEFAULT_MODEL;
  const timeoutSignal = AbortSignal.timeout(TIMEOUT_MS);
  const requestSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
  const startedAt = Date.now();

  let response;
  try {
    response = await fetchImpl(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: buildMessages(patient),
        thinking: { type: 'disabled' },
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 1600,
        stream: false,
      }),
      signal: requestSignal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new HttpError(504, 'UPSTREAM_TIMEOUT', 'DeepSeek 请求超时，请重试。');
    }
    throw new HttpError(502, 'UPSTREAM_NETWORK', '无法连接 DeepSeek 服务。');
  }

  if (!response.ok) {
    throw upstreamError(response.status);
  }

  let body;
  try {
    body = await response.json();
  } catch {
    throw new HttpError(502, 'UPSTREAM_INVALID_RESPONSE', 'DeepSeek 返回了无法解析的响应。');
  }
  const choice = body?.choices?.[0];
  if (choice?.finish_reason === 'length') {
    throw new HttpError(502, 'UPSTREAM_TRUNCATED', 'DeepSeek 输出被截断，请重试。');
  }
  const content = choice?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new HttpError(502, 'EMPTY_JSON', 'DeepSeek 没有返回可解析的 JSON。');
  }

  return {
    content,
    model,
    usage: body?.usage ?? null,
    latencyMs: Date.now() - startedAt,
  };
}

export async function analyzeWithDeepSeek(
  patient,
  { fetchImpl = fetch, env = process.env, signal } = {},
) {
  const model = env.DEEPSEEK_MODEL?.trim() || DEFAULT_MODEL;
  const redFlags = detectRedFlags(patient);
  if (redFlags.length) {
    return {
      analysis: makeBlockedAnalysis(redFlags, `规则引擎 · ${redFlags.length} 项红旗`),
      meta: {
        provider: 'rules',
        model: 'red-flag-rules',
        latencyMs: 0,
        fallback: false,
        promptVersion: PROMPT_VERSION,
        blocked: true,
      },
    };
  }

  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await callDeepSeek(patient, { fetchImpl, env, signal });
      const parsed = extractJson(result.content);
      const analysis = normalizeAnalysis(parsed, {
        modelLabel: `DeepSeek · ${result.model}`,
        promptVersion: PROMPT_VERSION,
      });
      return {
        analysis,
        meta: {
          provider: 'deepseek',
          model: result.model,
          latencyMs: result.latencyMs,
          fallback: false,
          promptVersion: PROMPT_VERSION,
          usage: result.usage,
        },
      };
    } catch (error) {
      lastError = error;
      const retryable =
        error instanceof HttpError &&
        ['EMPTY_JSON', 'INVALID_JSON', 'INVALID_ANALYSIS'].includes(error.code);
      if (!retryable || attempt > 0) break;
    }
  }
  throw lastError instanceof HttpError
    ? lastError
    : new HttpError(502, 'ANALYSIS_FAILED', '症状分析失败，请稍后重试。');
}
