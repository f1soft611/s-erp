import type { LoginFormValues } from '../../pages/auth/types/auth';

export interface LoginRequest extends LoginFormValues {}

export interface AuthSession {
  tenantCode: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

const AUTH_STORAGE_KEY = 's-erp-auth';
const AUTH_CHANGE_EVENT = 's-erp-auth-change';
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';
const ACCESS_TOKEN_VALIDITY_MS = 15 * 60 * 1000;
const ACCESS_TOKEN_REFRESH_BUFFER_MS = 60 * 1000;

const syncBrowserLocation = (nextPath: string): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const currentPath = window.location.pathname;
  if (currentPath !== nextPath) {
    window.history.pushState({}, '', nextPath);
  }

  window.dispatchEvent(new PopStateEvent('popstate'));
};

const notifyAuthChange = (): void => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }
};

export const getStoredAuth = (): AuthSession | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = window.localStorage.getItem(AUTH_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as AuthSession;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

export const isTokenExpired = (auth: AuthSession | null): boolean => {
  if (!auth?.expiresAt) {
    return true;
  }

  const expiresAt = Date.parse(auth.expiresAt);
  return Number.isNaN(expiresAt) || Date.now() >= expiresAt;
};

export const isAccessTokenExpiringSoon = (
  auth: AuthSession | null,
  bufferMs: number = ACCESS_TOKEN_REFRESH_BUFFER_MS,
): boolean => {
  if (!auth?.expiresAt) {
    return true;
  }

  const expiresAt = Date.parse(auth.expiresAt);
  if (Number.isNaN(expiresAt)) {
    return true;
  }

  return Date.now() + bufferMs >= expiresAt;
};

export const refreshAccessToken = async (): Promise<AuthSession | null> => {
  const auth = getStoredAuth();

  if (!auth?.refreshToken) {
    logout();
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: auth.refreshToken }),
    });

    const body = (await response.json()) as {
      resultCode?: number | string;
      resultMessage?: string;
      jToken?: string;
      refreshToken?: string;
    };

    if (!response.ok || String(body.resultCode) !== '200' || !body.jToken) {
      logout();
      return null;
    }

    const nextSession: AuthSession = {
      ...auth,
      accessToken: body.jToken,
      refreshToken: body.refreshToken ?? auth.refreshToken,
      expiresAt: new Date(Date.now() + ACCESS_TOKEN_VALIDITY_MS).toISOString(),
    };

    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession));
    notifyAuthChange();
    return nextSession;
  } catch {
    logout();
    return null;
  }
};

export const isAuthenticated = (): boolean => {
  const auth = getStoredAuth();

  if (!auth) {
    return false;
  }

  if (isTokenExpired(auth)) {
    if (!auth.refreshToken) {
      logout();
      return false;
    }

    return true;
  }

  return true;
};

interface LoginJwtResponse {
  resultCode: string;
  resultMessage: string;
  jToken?: string;
  refreshToken?: string;
}

export const login = async (
  credentials: LoginRequest,
): Promise<{ message: string; session: AuthSession }> => {
  if (!credentials.tenantCode || !credentials.userId || !credentials.password) {
    throw new Error('필수 값이 누락되었습니다.');
  }

  const response = await fetch(`${API_BASE_URL}/auth/login-jwt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tenantCode: credentials.tenantCode,
      id: credentials.userId,
      password: credentials.password,
    }),
  });

  const body = (await response.json()) as LoginJwtResponse;

  if (!response.ok || body.resultCode !== '200' || !body.jToken) {
    throw new Error(body.resultMessage || '로그인에 실패했습니다.');
  }

  const session: AuthSession = {
    tenantCode: credentials.tenantCode,
    userId: credentials.userId,
    accessToken: body.jToken,
    refreshToken: body.refreshToken ?? '',
    expiresAt: new Date(Date.now() + ACCESS_TOKEN_VALIDITY_MS).toISOString(),
  };

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  syncBrowserLocation('/dashboard');
  notifyAuthChange();

  return {
    message: body.resultMessage || '로그인 성공',
    session,
  };
};

export const logout = (): void => {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  syncBrowserLocation('/login');
  notifyAuthChange();
};

export const subscribeAuthChange = (listener: () => void): (() => void) => {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  window.addEventListener(AUTH_CHANGE_EVENT, listener);
  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, listener);
  };
};
