import type { LoginFormValues } from '../../pages/auth/types/auth';

export interface LoginRequest extends LoginFormValues {}

export interface AuthSession {
  tenantCode: string;
  userId: string;
  accessToken: string;
  expiresAt: string;
}

const AUTH_STORAGE_KEY = 's-erp-auth';
const AUTH_CHANGE_EVENT = 's-erp-auth-change';

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

export const login = async (
  credentials: LoginRequest,
): Promise<{ message: string; session: AuthSession }> => {
  await new Promise((resolve) => {
    window.setTimeout(resolve, 400);
  });

  if (!credentials.tenantCode || !credentials.userId || !credentials.password) {
    throw new Error('필수 값이 누락되었습니다.');
  }

  const session: AuthSession = {
    tenantCode: credentials.tenantCode,
    userId: credentials.userId,
    accessToken: 'mock-token-for-erp-session',
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
  };

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  console.log('login service set auth, before sync', window.location.pathname);
  syncBrowserLocation('/dashboard');
  console.log('login service after sync', window.location.pathname);
  notifyAuthChange();

  return {
    message: '로그인 성공',
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
