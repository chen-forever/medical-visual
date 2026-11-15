import { AnalysisApiError } from './analysisClient';

export interface AuthStatus {
  authenticated: boolean;
  authRequired: boolean;
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new AnalysisApiError('NETWORK_ERROR', '无法连接本地服务，请确认 server 已启动。');
  }
  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    throw new AnalysisApiError(
      payload?.error?.code ?? 'AUTH_FAILED',
      payload?.error?.message ?? '登录失败。',
      response.status,
    );
  }
  return payload as T;
}

export function getAuthStatus() {
  return request<AuthStatus>('/api/auth/me');
}

export function login(password: string) {
  return request<AuthStatus>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export function logout() {
  return request<AuthStatus>('/api/auth/logout', { method: 'POST', body: '{}' });
}
