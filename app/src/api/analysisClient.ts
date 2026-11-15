import type { AnalysisMeta, AnalysisResult, Patient } from '../types';

export interface AnalyzeResponse {
  analysis: AnalysisResult;
  meta: AnalysisMeta;
}

export interface AnalysisHealth {
  ok: boolean;
  provider: string;
  configured: boolean;
  model: string;
}

export class AnalysisApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 0) {
    super(message);
    this.name = 'AnalysisApiError';
    this.code = code;
    this.status = status;
  }
}

async function readJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function analyzeCase(patient: Patient, signal?: AbortSignal): Promise<AnalyzeResponse> {
  let response: Response;
  try {
    response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ patient }),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new AnalysisApiError('NETWORK_ERROR', '无法连接分析服务，请确认本地 API 服务已启动。');
  }

  const payload = await readJson(response);
  if (!response.ok) {
    const code = payload?.error?.code ?? 'ANALYSIS_FAILED';
    const message = payload?.error?.message ?? '症状分析失败，请稍后重试。';
    throw new AnalysisApiError(code, message, response.status);
  }
  if (!payload?.analysis || !Array.isArray(payload.analysis.patterns)) {
    throw new AnalysisApiError('INVALID_RESPONSE', '分析服务返回的数据不完整。');
  }
  return payload as AnalyzeResponse;
}

export async function getAnalysisHealth(): Promise<AnalysisHealth | null> {
  try {
    const response = await fetch('/api/health', { headers: { accept: 'application/json' } });
    if (!response.ok) return null;
    return (await response.json()) as AnalysisHealth;
  } catch {
    return null;
  }
}

export function analysisErrorMessage(error: unknown) {
  if (error instanceof AnalysisApiError) {
    switch (error.code) {
      case 'CONFIG_MISSING':
        return '本地 API 尚未配置 DeepSeek Key；当前仍显示演示分析。';
      case 'UPSTREAM_AUTH':
        return 'DeepSeek 鉴权失败；请检查服务端 .env.local。';
      case 'UPSTREAM_BALANCE':
        return 'DeepSeek 账户余额不足；当前仍显示上一次分析。';
      case 'UPSTREAM_RATE_LIMIT':
        return '请求过于频繁，请稍后再试。';
      case 'UPSTREAM_TIMEOUT':
        return 'DeepSeek 响应超时，请重试。';
      case 'EMPTY_JSON':
      case 'INVALID_JSON':
      case 'INVALID_ANALYSIS':
        return 'DeepSeek 返回的结构不完整，已保留上一次分析。';
      case 'NETWORK_ERROR':
        return '没有连上本地 API 服务，请先运行 server。';
      case 'CASE_VERSION_CONFLICT':
        return '病例已被另一个窗口修改，请返回患者信息重新加载。';
      case 'LESION_VERSION_CONFLICT':
        return '病位已被另一个窗口修改，请点击“重新载入病例”。';
      case 'CASE_NOT_FOUND':
        return '病例不存在或已被删除。';
      case 'REPORT_NEEDS_ANALYSIS':
        return '请先完成一次证型分析，再生成报告。';
      default:
        return error.message;
    }
  }
  return '分析失败，请稍后重试。';
}
