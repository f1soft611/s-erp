import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getStoredAuth, login, logout, refreshAccessToken } from '../src/shared/services/authService';

const credentials = { tenantCode: 'synthetic', userId: 'synthetic-reader', password: 'synthetic-only' };
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true, json: async () => ({ resultCode: '200', jToken: 'synthetic-access', refreshToken: 'synthetic-refresh' }),
  }));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('notice popup login session identity', () => {
  it('creates a new opaque identity on login but preserves it on token refresh', async () => {
    const first = await login(credentials);
    await refreshAccessToken();
    expect(getStoredAuth()?.popupSessionId).toBe(first.session.popupSessionId);
    const second = await login(credentials);
    expect(second.session.popupSessionId).toBeTruthy();
    expect(second.session.popupSessionId).not.toBe(first.session.popupSessionId);
  });

  it('does not require secure-context randomUUID for an HTTP deployment', async () => {
    vi.stubGlobal('crypto', { getRandomValues: (values: Uint32Array) => {
      values.set([1, 2, 3, 4]); return values;
    } });
    expect((await login(credentials)).session.popupSessionId).toBeTruthy();
  });

  it('cleans only popup queue keys during logout', async () => {
    await login(credentials);
    sessionStorage.setItem('s-erp-notice-popups:synthetic', '{}');
    sessionStorage.setItem('unrelated-feature', 'keep');
    logout();
    expect(getStoredAuth()).toBeNull();
    expect(sessionStorage.getItem('s-erp-notice-popups:synthetic')).toBeNull();
    expect(sessionStorage.getItem('unrelated-feature')).toBe('keep');
  });

  it('still logs out when popup progress storage is unavailable and reports it', async () => {
    await login(credentials);
    const storage = vi.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => {
      throw new DOMException('Storage unavailable', 'SecurityError');
    });
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(() => logout()).not.toThrow();
    expect(getStoredAuth()).toBeNull();
    expect(warning).toHaveBeenCalled();
    storage.mockRestore();
  });
});
