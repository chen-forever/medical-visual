import type { AnalysisMeta, AnalysisResult, Formula, Lesion, Patient, SimulationPoint } from '../types';
import { AnalysisApiError, type AnalyzeResponse } from './analysisClient';

export interface ServerCase {
  id: string;
  patient: Patient;
  lesions: Lesion[];
  version: number;
  lesionVersion: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CaseSummary extends ServerCase {
  latestAnalysis: null | {
    name: string;
    confidence: number;
    createdAt: string;
  };
  latestFormula: null | {
    name: string;
    createdAt: string;
  };
}

export interface CaseDetail {
  case: ServerCase;
  analyses: Array<{
    id: string;
    provider: string;
    model: string;
    promptVersion: string;
    latencyMs: number;
    caseVersion?: number;
    analysis: AnalysisResult;
    createdAt: string;
  }>;
  formulas: Array<{
    id: string;
    formula: Formula;
    createdAt: string;
  }>;
  reports: Array<{
    id: string;
    analysisId: string;
    formulaId: string;
    shareToken: string;
    createdAt: string;
  }>;
}

export interface CaseAnalyzeResponse extends AnalyzeResponse {
  analysisId: string;
  caseId: string;
}

export interface CaseEvent {
  id: number;
  actor: string;
  action: string;
  detail: Record<string, unknown>;
  createdAt: string;
}

async function request<T>(
  url: string,
  init: RequestInit = {},
  signal?: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(init.headers ?? {}),
      },
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new AnalysisApiError('NETWORK_ERROR', '无法连接本地服务，请确认 server 已启动。');
  }
  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('qihuang:unauthorized'));
    }
    throw new AnalysisApiError(
      payload?.error?.code ?? 'REQUEST_FAILED',
      payload?.error?.message ?? '请求失败，请稍后重试。',
      response.status,
    );
  }
  return payload as T;
}

export function listCases() {
  return request<{ cases: CaseSummary[] }>('/api/cases').then(payload => payload.cases);
}

export function createCase(patient: Patient) {
  return request<{ case: ServerCase }>('/api/cases', {
    method: 'POST',
    body: JSON.stringify({ patient }),
  }).then(payload => payload.case);
}

export function updateCase(
  caseId: string,
  patient: Patient,
  version: number,
  lesions: Lesion[],
) {
  return request<{ case: ServerCase }>(`/api/cases/${encodeURIComponent(caseId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ patient, version, lesions }),
  }).then(payload => payload.case);
}

export function getCase(caseId: string) {
  return request<CaseDetail>(`/api/cases/${encodeURIComponent(caseId)}`);
}

export function updateLesions(
  caseId: string,
  lesions: Lesion[],
  lesionVersion: number,
) {
  return request<{ case: ServerCase }>(`/api/cases/${encodeURIComponent(caseId)}/lesions`, {
    method: 'PATCH',
    body: JSON.stringify({ lesions, lesionVersion }),
  }).then(payload => payload.case);
}

export function listEvents(caseId: string) {
  return request<{ events: CaseEvent[] }>(
    `/api/cases/${encodeURIComponent(caseId)}/events`,
  ).then(payload => payload.events);
}

export function analyzeCaseById(caseId: string, signal?: AbortSignal) {
  return request<CaseAnalyzeResponse>(
    `/api/cases/${encodeURIComponent(caseId)}/analyze`,
    { method: 'POST', body: '{}' },
    signal,
  );
}

export function saveFormula(caseId: string, formula: Formula) {
  return request<{ formula: { id: string; formula: Formula; createdAt: string } }>(
    `/api/cases/${encodeURIComponent(caseId)}/formulas`,
    { method: 'POST', body: JSON.stringify({ formula }) },
  );
}

export function saveReport(
  caseId: string,
  payload: {
    analysisId?: string;
    formulaId?: string;
    lesions?: Lesion[];
    simulation?: SimulationPoint[];
  },
) {
  return request<{
    id: string;
    shareToken: string;
    snapshot: unknown;
    createdAt: string;
  }>(`/api/cases/${encodeURIComponent(caseId)}/reports`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export type { AnalysisMeta, AnalysisResult };
