import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountManagementPage } from '../src/pages/settings/system/accounts/AccountManagementPage';
import { resolveAccountStatus } from '../src/pages/settings/system/accounts/data/accountStatus';
import { normalizeAccountRow } from '../src/pages/settings/system/accounts/services/account.service';
import type { AccountRow } from '../src/pages/settings/system/accounts/types/account.types';

const mocks = vi.hoisted(() => ({
  fetchAccounts: vi.fn(),
  fetchRoleOptions: vi.fn(),
  updateAccountStatus: vi.fn(),
  resetAccountPassword: vi.fn(),
  unlockAccount: vi.fn(),
  updateAccountRoles: vi.fn(),
}));

vi.mock('../src/pages/settings/system/accounts/services/account.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/pages/settings/system/accounts/services/account.service')>()),
  fetchAccounts: mocks.fetchAccounts,
  fetchRoleOptions: mocks.fetchRoleOptions,
  updateAccountStatus: mocks.updateAccountStatus,
  resetAccountPassword: mocks.resetAccountPassword,
  unlockAccount: mocks.unlockAccount,
  updateAccountRoles: mocks.updateAccountRoles,
}));
vi.mock('../src/shared/services/authService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/shared/services/authService')>()),
  getStoredAuth: () => ({ userId: 'admin', tenantCode: 'T1', accessToken: 'a', refreshToken: 'r', expiresAt: '' }),
}));

function row(overrides: Partial<AccountRow> = {}): AccountRow {
  return {
    loginId: 55, loginCode: 'hong.gd', userId: 5, userNm: '홍길동', employeeNo: '261101', departmentNm: '생산1팀',
    positionNm: '과장', useAt: 'Y', locked: false, retired: false, passwordChangeRequired: false,
    passwordChangedAt: '2026-11-01 09:00', hasPhoto: false,
    roles: [{ roleId: 4, roleCode: 'DEFAULT_USER', roleNm: '일반 사용자' }],
    ...overrides,
  };
}

const PAGE_PROPS = {
  selectedModule: { id: 'settings', name: '환경설정', icon: null, tree: [], menus: [] },
  currentMenuName: '계정관리',
  content: { title: '계정관리', description: '계정을 관리합니다.', cards: [], items: [] },
  selectedMenuPermissions: { read: true, create: true, update: true, delete: false, excel: true },
  isTenantAdmin: true,
};

describe('계정관리 페이지', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchAccounts.mockResolvedValue([
      row(),
      row({ loginId: 56, loginCode: 'kim.lock', userNm: '김잠김', locked: true }),
      row({ loginId: 57, loginCode: 'lee.off', userNm: '이미사용', useAt: 'N' }),
      row({ loginId: 9, loginCode: 'admin', userNm: '관리자', roles: [{ roleId: 2, roleCode: 'ADMIN', roleNm: '시스템 관리자' }] }),
    ]);
    mocks.fetchRoleOptions.mockResolvedValue([
      { roleId: 2, roleCode: 'ADMIN', roleNm: '시스템 관리자' },
      { roleId: 4, roleCode: 'DEFAULT_USER', roleNm: '일반 사용자' },
    ]);
  });

  async function renderPage(overrides: Partial<typeof PAGE_PROPS> = {}) {
    render(<AccountManagementPage {...PAGE_PROPS} {...overrides} />);
    await screen.findByRole('button', { name: '홍길동 권한 변경' });
  }

  it('전체 상태로 계정 목록을 조회하고 상태 칩과 관리 버튼을 보여 준다', async () => {
    await renderPage();
    expect(mocks.fetchAccounts).toHaveBeenCalledWith({ keyword: '', status: 'ALL' });
    expect(screen.getByText('잠김')).toBeInTheDocument();
    expect(screen.getByText('미허용')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '이미사용 계정 허용' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '홍길동 계정 미허용' })).toBeEnabled();
  });

  it('입력한 검색어를 조회 버튼으로 적용한다', async () => {
    await renderPage();
    fireEvent.change(screen.getByRole('textbox', { name: '계정 검색' }), { target: { value: '홍' } });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    await waitFor(() => expect(mocks.fetchAccounts).toHaveBeenLastCalledWith({ keyword: '홍', status: 'ALL' }));
  });

  it('자기 자신의 계정은 미허용 버튼이 비활성이다', async () => {
    await renderPage();
    expect(screen.getByRole('button', { name: '관리자 계정 미허용' })).toBeDisabled();
  });

  it('잠금 해제는 잠긴 계정만 활성이고 누르면 API를 호출한다', async () => {
    mocks.unlockAccount.mockResolvedValue(row({ loginId: 56 }));
    await renderPage();
    expect(screen.getByRole('button', { name: '홍길동 잠금 해제' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '김잠김 잠금 해제' }));
    await waitFor(() => expect(mocks.unlockAccount).toHaveBeenCalledWith(56));
  });

  it('미허용은 확인 후에만 적용한다', async () => {
    mocks.updateAccountStatus.mockResolvedValue(row({ useAt: 'N' }));
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: '홍길동 계정 미허용' }));
    const dialog = await screen.findByRole('dialog', { name: '계정 미허용' });
    expect(mocks.updateAccountStatus).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: '미허용' }));
    await waitFor(() => expect(mocks.updateAccountStatus).toHaveBeenCalledWith(55, 'N'));
  });

  it('허용은 확인 없이 바로 적용한다', async () => {
    mocks.updateAccountStatus.mockResolvedValue(row({ loginId: 57 }));
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: '이미사용 계정 허용' }));
    await waitFor(() => expect(mocks.updateAccountStatus).toHaveBeenCalledWith(57, 'Y'));
  });

  it('비밀번호 초기화는 확인 후 임시 비밀번호를 한 번 보여 주고 닫으면 사라진다', async () => {
    mocks.resetAccountPassword.mockResolvedValue({ loginId: 55, loginCode: 'hong.gd', temporaryPassword: 'Ab3dEfGh7Jk9' });
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: '홍길동 비밀번호 초기화' }));
    const confirmDialog = await screen.findByRole('dialog', { name: '비밀번호 초기화' });
    fireEvent.click(within(confirmDialog).getByRole('button', { name: '초기화' }));

    const dialog = await screen.findByRole('dialog', { name: '임시 비밀번호' });
    expect(within(dialog).getByLabelText('임시 비밀번호 값')).toHaveTextContent('Ab3dEfGh7Jk9');
    expect(within(dialog).getByText(/다시 볼 수 없습니다/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: '확인' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '임시 비밀번호' })).toBeNull());
    expect(screen.queryByText('Ab3dEfGh7Jk9')).toBeNull();
  });

  it('권한 변경 팝업에서 역할을 바꿔 저장하고 역할이 없으면 막는다', async () => {
    mocks.updateAccountRoles.mockResolvedValue(row());
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: '홍길동 권한 변경' }));
    const dialog = await screen.findByRole('dialog', { name: '권한 변경' });
    const defaultUser = within(dialog).getByRole('checkbox', { name: '일반 사용자' });
    expect(defaultUser).toBeChecked();

    fireEvent.click(defaultUser);
    fireEvent.click(within(dialog).getByRole('button', { name: '저장' }));
    expect(await within(dialog).findByText('역할을 1개 이상 선택해 주세요.')).toBeInTheDocument();
    expect(mocks.updateAccountRoles).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('checkbox', { name: '시스템 관리자' }));
    fireEvent.click(within(dialog).getByRole('button', { name: '저장' }));
    await waitFor(() => expect(mocks.updateAccountRoles).toHaveBeenCalledWith(55, [2]));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '권한 변경' })).toBeNull());
  });

  it('수정 권한이 없으면 관리 버튼이 모두 비활성이다', async () => {
    await renderPage({ selectedMenuPermissions: { read: true, create: false, update: false, delete: false, excel: true } });
    expect(screen.getByRole('button', { name: '홍길동 권한 변경' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '홍길동 비밀번호 초기화' })).toBeDisabled();
  });

  it('저장에 실패하면 화면 상단에 서버 메시지를 보여 준다', async () => {
    mocks.updateAccountStatus.mockRejectedValue(new Error('마지막 관리자 계정은 미허용으로 바꿀 수 없습니다.'));
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: '이미사용 계정 허용' }));
    expect(await screen.findByText('마지막 관리자 계정은 미허용으로 바꿀 수 없습니다.')).toBeInTheDocument();
  });
});

describe('계정 상태 규칙', () => {
  it('퇴직 > 미허용 > 잠김 > 사용 순으로 표시한다', () => {
    expect(resolveAccountStatus({ retired: true, useAt: 'N', locked: true })).toBe('RETIRED');
    expect(resolveAccountStatus({ retired: false, useAt: 'N', locked: true })).toBe('DISABLED');
    expect(resolveAccountStatus({ retired: false, useAt: 'Y', locked: true })).toBe('LOCKED');
    expect(resolveAccountStatus({ retired: false, useAt: 'Y', locked: false })).toBe('ACTIVE');
  });

  it('서버 응답을 계정 행으로 바꾸고 계정 ID가 없으면 거부한다', () => {
    const normalized = normalizeAccountRow({
      loginId: '55', loginCode: 'hong.gd', userId: 5, userNm: '홍길동', useAt: 'N', locked: true,
      passwordChangeRequired: true, roles: [{ roleId: 4, roleCode: 'DEFAULT_USER', roleNm: '일반 사용자' }],
    });
    expect(normalized).toMatchObject({ loginId: 55, useAt: 'N', locked: true, passwordChangeRequired: true });
    expect(normalized.roles).toHaveLength(1);
    expect(() => normalizeAccountRow({ loginCode: 'x' })).toThrow('계정 ID');
  });
});
