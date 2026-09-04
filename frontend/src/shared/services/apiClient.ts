import {
  getStoredAuth,
  isAccessTokenExpiringSoon,
  isTokenExpired,
  logout,
  refreshAccessToken,
  resolveApiBaseUrl,
} from './authService';

const API_BASE_URL = resolveApiBaseUrl();

interface ApiEnvelope<T> {
  resultCode: number | string;
  resultMessage: string;
  result: T;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let auth = getStoredAuth();

  if (!auth) {
    logout();
    throw new Error('로그인이 필요합니다. 다시 로그인해주세요.');
  }

  if (isTokenExpired(auth)) {
    const refreshedAuth = await refreshAccessToken();
    auth = refreshedAuth ?? getStoredAuth();

    if (!auth) {
      logout();
      throw new Error('로그인이 만료되었습니다. 다시 로그인해주세요.');
    }
  } else if (isAccessTokenExpiringSoon(auth)) {
    const refreshedAuth = await refreshAccessToken();
    auth = refreshedAuth ?? getStoredAuth();

    if (!auth) {
      logout();
      throw new Error('세션을 갱신할 수 없어 로그아웃됩니다.');
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init?.headers as Record<string, string>) ?? {}),
  };

  if (auth.accessToken) {
    headers.Authorization = `Bearer ${auth.accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  const body = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok || String(body.resultCode) !== '200') {
    throw new Error(body.resultMessage || '요청이 실패했습니다.');
  }

  return body.result;
}

export const apiGet = <T>(path: string): Promise<T> => request<T>(path);

export const apiPost = <T>(path: string, data: unknown): Promise<T> =>
  request<T>(path, { method: 'POST', body: JSON.stringify(data) });

export const apiPut = <T>(path: string, data: unknown): Promise<T> =>
  request<T>(path, { method: 'PUT', body: JSON.stringify(data) });

export const apiDelete = <T>(path: string): Promise<T> =>
  request<T>(path, { method: 'DELETE' });
