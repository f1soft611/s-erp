import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { apiGet } from '../src/shared/services/apiClient';
import {
  getSessionRemainingLabel,
  isAccessTokenExpiringSoon,
  readSessionNotice,
  setSessionNotice,
} from '../src/shared/services/authService';

describe('Login page', () => {
  it('renders the enterprise login fields', () => {
    render(<App />);

    expect(screen.getByLabelText(/업체코드/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/사용자 ID/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/비밀번호/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /로그인/i })).toBeInTheDocument();
  });

  it('shows validation errors when required values are missing', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /로그인/i }));

    expect(screen.getByText(/업체코드를 입력해주세요/i)).toBeInTheDocument();
    expect(screen.getByText(/사용자 ID를 입력해주세요/i)).toBeInTheDocument();
    expect(screen.getByText(/비밀번호를 입력해주세요/i)).toBeInTheDocument();
  });

  it('applies the dark-theme login styling when the app is in dark mode', () => {
    window.localStorage.setItem('erp-theme', 'dark');

    render(<App />);

    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(document.body.style.backgroundColor).toBe('rgb(15, 23, 42)');
    expect(screen.getByText(/통합 ERP 시스템 로그인/i)).toBeInTheDocument();
  });

  it('redirects to login when the stored JWT is expired and no refresh token exists', async () => {
    window.localStorage.setItem(
      's-erp-auth',
      JSON.stringify({
        tenantCode: 'T1358606250',
        userId: 'admin',
        accessToken: 'expired-token',
        refreshToken: '',
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      }),
    );
    window.history.pushState({}, '', '/dashboard');

    render(<App />);

    expect(await screen.findByLabelText(/업체코드/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /^종합현황$/i }),
    ).not.toBeInTheDocument();
  });

  it('shows an expiring warning when the session is within one minute', () => {
    const auth = {
      tenantCode: 'T1358606250',
      userId: 'admin',
      accessToken: 'expiring-token',
      refreshToken: 'refresh-token',
      expiresAt: new Date(Date.now() + 30_000).toISOString(),
    };

    expect(isAccessTokenExpiringSoon(auth, 60_000)).toBe(true);
    expect(getSessionRemainingLabel(auth)).toBe('00:30');
  });

  it('stores the refresh-failure message for the next login screen', () => {
    setSessionNotice('세션이 만료되어 다시 로그인해야 합니다.');

    expect(readSessionNotice()).toBe('세션이 만료되어 다시 로그인해야 합니다.');
  });

  it('refreshes an expiring access token before making API requests', async () => {
    window.localStorage.setItem(
      's-erp-auth',
      JSON.stringify({
        tenantCode: 'T1358606250',
        userId: 'admin',
        accessToken: 'expiring-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      }),
    );

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);

        if (url.includes('/auth/refresh')) {
          return new Response(
            JSON.stringify({
              resultCode: '200',
              resultMessage: '토큰 리프레쉬 성공',
              jToken: 'refreshed-token',
            }),
            { status: 200 },
          );
        }

        return new Response(
          JSON.stringify({
            resultCode: '200',
            resultMessage: '성공',
            result: { ok: true },
          }),
          { status: 200 },
        );
      }),
    );

    await expect(apiGet('/api/test')).resolves.toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/refresh'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('navigates to the dashboard after successful login', async () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText(/업체코드/i), {
      target: { value: 'T1358606250' },
    });
    fireEvent.change(screen.getByLabelText(/사용자 ID/i), {
      target: { value: 'admin' },
    });
    fireEvent.change(screen.getByLabelText(/비밀번호/i), {
      target: { value: 'f1soft@611' },
    });

    fireEvent.click(screen.getByRole('button', { name: /로그인/i }));

    expect(
      await screen.findByRole('heading', { name: /^종합현황$/i }),
    ).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login-jwt'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('shows an error message when the backend rejects the login', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ resultCode: '300', resultMessage: '로그인 실패' }),
            { status: 200 },
          ),
      ),
    );

    render(<App />);

    fireEvent.change(screen.getByLabelText(/업체코드/i), {
      target: { value: 'T1358606250' },
    });
    fireEvent.change(screen.getByLabelText(/사용자 ID/i), {
      target: { value: 'admin' },
    });
    fireEvent.change(screen.getByLabelText(/비밀번호/i), {
      target: { value: 'wrong-password' },
    });

    fireEvent.click(screen.getByRole('button', { name: /로그인/i }));

    expect(await screen.findByText(/로그인 실패/i)).toBeInTheDocument();
  });
});
