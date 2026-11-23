import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiDownload, apiGet, apiGetBlob, apiGetEventStream } from '../src/shared/services/apiClient';
import ForcePasswordChangePage, { PASSWORD_CHANGED_NOTICE } from '../src/pages/auth/ForcePasswordChangePage';
import {
  getStoredAuth,
  isPasswordChangeRequired,
  login,
  logout,
  markPasswordChangeRequired,
  readSessionNotice,
  readSessionNoticeSeverity,
} from '../src/shared/services/authService';

const mocks = vi.hoisted(() => ({ changeMyPassword: vi.fn() }));

vi.mock('../src/pages/dashboard/services/profileSettings.service', () => ({
  changeMyPassword: mocks.changeMyPassword,
}));

const SESSION = {
  tenantCode: 'T1', userId: 'hong.gd', accessToken: 'access', refreshToken: 'refresh',
  expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
};

function storeSession(extra: Record<string, unknown> = {}) {
  window.localStorage.setItem('s-erp-auth', JSON.stringify({ ...SESSION, ...extra }));
}

describe('비밀번호 변경 필요 세션', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('로그인 응답에 변경 필요가 있으면 세션에 저장한다', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ resultCode: '200', jToken: 'a', refreshToken: 'r', resultVO: { passwordChangeRequired: true } }),
    } as Response);

    const { session } = await login({ tenantCode: 'T1', userId: 'hong.gd', password: 'temp-pass' });

    expect(session.passwordChangeRequired).toBe(true);
    expect(isPasswordChangeRequired()).toBe(true);
  });

  it('응답에 표시가 없으면 변경 필요가 아니다', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ resultCode: '200', jToken: 'a', refreshToken: 'r', resultVO: {} }),
    } as Response);

    await login({ tenantCode: 'T1', userId: 'kim.gd', password: 'password1' });

    expect(isPasswordChangeRequired()).toBe(false);
  });

  it('서버가 변경 필요로 거부하면 세션에 표시하고 이미 표시했으면 다시 쓰지 않는다', () => {
    storeSession();
    expect(isPasswordChangeRequired()).toBe(false);

    markPasswordChangeRequired();
    expect(getStoredAuth()?.passwordChangeRequired).toBe(true);

    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    markPasswordChangeRequired();
    expect(setItem).not.toHaveBeenCalled();
  });

  it('로그인하지 않았으면 표시하지 않는다', () => {
    markPasswordChangeRequired();
    expect(getStoredAuth()).toBeNull();
  });

  it('안내문을 주고 로그아웃하면 로그인 화면용 안내문이 남는다', () => {
    storeSession();
    logout({ message: '안내', severity: 'info' });
    expect(getStoredAuth()).toBeNull();
    expect(readSessionNotice()).toBe('안내');
    expect(readSessionNoticeSeverity()).toBe('info');

    logout();
    expect(readSessionNotice()).toBeNull();
    expect(readSessionNoticeSeverity()).toBe('error');
  });
});

describe('API 응답의 비밀번호 변경 필요 처리', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    storeSession();
  });

  it('서버가 PASSWORD_CHANGE_REQUIRED로 거부하면 세션에 표시하고 오류를 던진다', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => JSON.stringify({
        resultCode: 'PASSWORD_CHANGE_REQUIRED', resultMessage: '비밀번호를 변경한 뒤에 이용할 수 있습니다.',
      }),
    } as Response);

    await expect(apiGet('/api/v1/hr/employees')).rejects.toThrow('비밀번호를 변경한 뒤에 이용할 수 있습니다.');

    expect(isPasswordChangeRequired()).toBe(true);
  });

  it('다른 403 오류는 변경 필요로 표시하지 않는다', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => JSON.stringify({ resultCode: '403', resultMessage: '권한이 없습니다.' }),
    } as Response);

    await expect(apiGet('/api/v1/hr/employees')).rejects.toThrow('권한이 없습니다.');

    expect(isPasswordChangeRequired()).toBe(false);
  });

  it.each([
    ['Blob', () => apiGetBlob('/file')],
    ['download', () => apiDownload('/file')],
    ['stream', () => apiGetEventStream('/events', new AbortController().signal)],
  ])('%s 요청이 변경 필요 403을 받으면 세션에 표시한다', async (_label, request) => {
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      resultCode: 'PASSWORD_CHANGE_REQUIRED', resultMessage: '비밀번호를 변경한 뒤에 이용할 수 있습니다.',
    }), { status: 403 }));

    await expect(request()).rejects.toThrow('비밀번호를 변경한 뒤에 이용할 수 있습니다.');
    expect(isPasswordChangeRequired()).toBe(true);
  });

  it.each([
    ['Blob', () => apiGetBlob('/file')],
    ['download', () => apiDownload('/file')],
    ['stream', () => apiGetEventStream('/events', new AbortController().signal)],
  ])('%s 요청의 다른 403은 변경 필요로 표시하지 않는다', async (_label, request) => {
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      resultCode: '403', resultMessage: '권한이 없습니다.',
    }), { status: 403 }));

    await expect(request()).rejects.toThrow();
    expect(isPasswordChangeRequired()).toBe(false);
  });
});

describe('비밀번호 강제 변경 화면', () => {
  beforeEach(() => {
    window.localStorage.clear();
    storeSession({ passwordChangeRequired: true });
    mocks.changeMyPassword.mockReset();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  function renderPage() {
    render(<MemoryRouter><ForcePasswordChangePage /></MemoryRouter>);
  }

  function fill(current: string, next: string, confirm: string) {
    fireEvent.change(screen.getByLabelText('현재(임시) 비밀번호'), { target: { value: current } });
    fireEvent.change(screen.getByLabelText('변경 비밀번호'), { target: { value: next } });
    fireEvent.change(screen.getByLabelText('변경 비밀번호 확인'), { target: { value: confirm } });
    fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }));
  }

  it('임시 비밀번호로 들어왔다는 안내와 입력칸을 보여 준다', () => {
    renderPage();
    expect(screen.getByText(/임시 비밀번호로 로그인했습니다/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '로그아웃' })).toBeInTheDocument();
  });

  it('입력 검증: 빈 값·불일치·8자 미만·같은 비밀번호는 서버를 호출하지 않는다', async () => {
    renderPage();

    fill('', '', '');
    expect(await screen.findByText('모든 비밀번호를 입력해 주세요.')).toBeInTheDocument();
    fill('Temp-pass-1', 'New-pass-22', 'Other-pass-3');
    expect(await screen.findByText('변경 비밀번호와 확인값이 일치하지 않습니다.')).toBeInTheDocument();
    fill('Temp-pass-1', 'short', 'short');
    expect(await screen.findByText('변경 비밀번호는 8자 이상이어야 합니다.')).toBeInTheDocument();
    fill('Temp-pass-1', 'Temp-pass-1', 'Temp-pass-1');
    expect(await screen.findByText('새 비밀번호는 현재(임시) 비밀번호와 달라야 합니다.')).toBeInTheDocument();
    expect(mocks.changeMyPassword).not.toHaveBeenCalled();
  });

  it('변경에 성공하면 로그아웃하고 로그인 화면에 안내문을 남긴다', async () => {
    mocks.changeMyPassword.mockResolvedValue(undefined);
    renderPage();

    fill('Temp-pass-1', 'New-pass-22', 'New-pass-22');

    await waitFor(() => expect(mocks.changeMyPassword).toHaveBeenCalledWith({
      currentPassword: 'Temp-pass-1', newPassword: 'New-pass-22', newPasswordConfirm: 'New-pass-22',
    }));
    await waitFor(() => expect(getStoredAuth()).toBeNull());
    expect(readSessionNotice()).toBe(PASSWORD_CHANGED_NOTICE);
    expect(readSessionNoticeSeverity()).toBe('info');
  });

  it('서버가 거부하면 메시지를 보여 주고 로그인 상태를 유지한다', async () => {
    mocks.changeMyPassword.mockRejectedValue(new Error('현재 비밀번호가 일치하지 않습니다.'));
    renderPage();

    fill('Wrong-pass-1', 'New-pass-22', 'New-pass-22');

    expect(await screen.findByText('현재 비밀번호가 일치하지 않습니다.')).toBeInTheDocument();
    expect(getStoredAuth()).not.toBeNull();
    expect(screen.getByRole('button', { name: '비밀번호 변경' })).toBeEnabled();
  });
});
