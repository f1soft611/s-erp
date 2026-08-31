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
const ACCESS_TOKEN_VALIDITY_MS = 3 * 60 * 60 * 1000;

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

export const isAuthenticated = (): boolean => Boolean(getStoredAuth());

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
