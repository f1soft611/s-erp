import { act, renderHook } from '@testing-library/react';
import type { FormEvent } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useLoginForm } from '../src/pages/auth/hooks/useLoginForm';
import { login } from '../src/shared/services/authService';

vi.mock('../src/shared/services/authService', () => ({
  login: vi.fn(async () => undefined),
}));

const storageKey = 's-erp-remembered-login';
const identifiers = { tenantCode: 'TEST-COMPANY', userId: 'test-user' };
const submitEvent = () =>
  ({ preventDefault: vi.fn() }) as unknown as FormEvent<HTMLFormElement>;

function fillForm(result: { current: ReturnType<typeof useLoginForm> }) {
  act(() => result.current.handleChange('tenantCode', identifiers.tenantCode));
  act(() => result.current.handleChange('userId', identifiers.userId));
  act(() => result.current.handleChange('password', 'synthetic-password'));
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(login).mockClear();
});

describe('remembered login identifiers', () => {
  it('starts unchecked with empty fields without saved identifiers', () => {
    const { result } = renderHook(useLoginForm);

    expect(result.current.rememberLogin).toBe(false);
    expect(result.current.values).toEqual({
      tenantCode: '',
      userId: '',
      password: '',
    });
  });

  it('restores only identifiers and the checked state on a new visit', () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ ...identifiers, password: 'must-not-restore' }),
    );
    const { result } = renderHook(useLoginForm);

    expect(result.current.rememberLogin).toBe(true);
    expect(result.current.values).toEqual({ ...identifiers, password: '' });
  });

  it('saves only trimmed identifiers after an opted-in successful login', async () => {
    const { result } = renderHook(useLoginForm);
    fillForm(result);
    act(() => result.current.handleChange('tenantCode', ' TEST-COMPANY '));
    act(() => result.current.handleChange('userId', ' test-user '));
    act(() => result.current.handleRememberLoginChange(true));
    expect(localStorage.getItem(storageKey)).toBeNull();

    await act(async () => {
      expect(await result.current.handleSubmit(submitEvent())).toEqual({ ok: true });
    });

    expect(JSON.parse(localStorage.getItem(storageKey)!)).toEqual(identifiers);
  });

  it('deletes saved identifiers immediately when unchecked without clearing inputs', () => {
    localStorage.setItem(storageKey, JSON.stringify(identifiers));
    localStorage.setItem('unrelated-preference', 'keep');
    const { result } = renderHook(useLoginForm);

    act(() => result.current.handleRememberLoginChange(false));

    expect(localStorage.getItem(storageKey)).toBeNull();
    expect(localStorage.getItem('unrelated-preference')).toBe('keep');
    expect(result.current.values).toEqual({ ...identifiers, password: '' });
    expect(result.current.rememberLogin).toBe(false);
  });

  it('does not save identifiers when login is not opted in', async () => {
    const { result } = renderHook(useLoginForm);
    fillForm(result);

    await act(async () => {
      await result.current.handleSubmit(submitEvent());
    });

    expect(localStorage.getItem(storageKey)).toBeNull();
  });

  it('does not update remembered identifiers after rejected login', async () => {
    localStorage.setItem(storageKey, JSON.stringify(identifiers));
    vi.mocked(login).mockRejectedValueOnce(new Error('Synthetic login rejection'));
    const { result } = renderHook(useLoginForm);
    fillForm(result);
    act(() => result.current.handleChange('userId', 'different-user'));

    await act(async () => {
      expect(await result.current.handleSubmit(submitEvent())).toEqual({
        ok: false,
        error: 'Synthetic login rejection',
      });
    });

    expect(JSON.parse(localStorage.getItem(storageKey)!)).toEqual(identifiers);
  });

  it('does not save or call authentication when required fields are missing', async () => {
    const { result } = renderHook(useLoginForm);
    act(() => result.current.handleRememberLoginChange(true));

    await act(async () => {
      await result.current.handleSubmit(submitEvent());
    });

    expect(login).not.toHaveBeenCalled();
    expect(localStorage.getItem(storageKey)).toBeNull();
  });

  it.each([
    'invalid-json',
    'null',
    '[]',
    JSON.stringify({ tenantCode: 123, userId: 'test-user' }),
    JSON.stringify({ tenantCode: 'TEST-COMPANY', userId: ' ' }),
  ])('ignores malformed remembered identifiers (%#)', (stored) => {
    localStorage.setItem(storageKey, stored);
    const { result } = renderHook(useLoginForm);

    expect(result.current.rememberLogin).toBe(false);
    expect(result.current.values).toEqual({
      tenantCode: '',
      userId: '',
      password: '',
    });
  });

  it('still renders when storage access is denied', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });

    const { result } = renderHook(useLoginForm);

    expect(result.current.rememberLogin).toBe(false);
    expect(result.current.values.password).toBe('');
  });

  it.each([true, false])('does not turn storage failure into login failure (remember=%s)', async (remember) => {
    const { result } = renderHook(useLoginForm);
    fillForm(result);
    act(() => result.current.handleRememberLoginChange(remember));
    vi.spyOn(Storage.prototype, remember ? 'setItem' : 'removeItem')
      .mockImplementation(() => { throw new Error('Storage unavailable'); });

    await act(async () => {
      expect(await result.current.handleSubmit(submitEvent())).toEqual({ ok: true });
    });

    expect(result.current.submitMessage).toBeNull();
  });

  it('keeps the unchecked UI usable even when deletion is denied', () => {
    localStorage.setItem(storageKey, JSON.stringify(identifiers));
    const { result } = renderHook(useLoginForm);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });

    act(() => result.current.handleRememberLoginChange(false));

    expect(result.current.rememberLogin).toBe(false);
    expect(result.current.values.tenantCode).toBe(identifiers.tenantCode);
  });
});
