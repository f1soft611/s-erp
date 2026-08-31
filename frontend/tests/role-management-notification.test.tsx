import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RoleManagementPage } from '../src/pages/settings/system/roles/RoleManagementPage';
import { NotificationProvider } from '../src/shared/context/NotificationContext';

const apiMocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
}));

vi.mock('../src/shared/services/apiClient', () => apiMocks);

const pageProps = {
  selectedModule: {
    id: 'settings',
    name: '환경설정',
    icon: null,
    tree: [],
    menus: [],
  },
  currentMenuName: '권한관리',
  content: {
    title: '권한관리',
    description: '역할을 관리합니다.',
    cards: [],
    items: [],
  },
};

function renderPage() {
  return render(
    <NotificationProvider>
      <RoleManagementPage {...pageProps} />
    </NotificationProvider>,
  );
}

async function createRole() {
  fireEvent.click(await screen.findByRole('button', { name: '권한 등록' }));
  fireEvent.change(screen.getByLabelText('역할 코드'), {
    target: { value: 'OPERATOR' },
  });
  fireEvent.change(screen.getByLabelText('역할명'), {
    target: { value: '운영자' },
  });
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
}

describe('RoleManagementPage notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a page error when loading roles fails', async () => {
    apiMocks.apiGet.mockRejectedValueOnce(new Error('역할 목록 조회 실패'));

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '역할 목록 조회 실패',
    );
  });

  it('shows a success toast after role creation and refresh', async () => {
    apiMocks.apiGet.mockResolvedValue({ resultList: [] });
    apiMocks.apiPost.mockResolvedValue({});

    renderPage();
    await createRole();

    expect(await screen.findByText('역할을 저장했습니다.')).toBeVisible();
    expect(apiMocks.apiPost).toHaveBeenCalledWith('/api/v1/system/roles', {
      useAt: 'Y',
      roleCode: 'OPERATOR',
      roleNm: '운영자',
      roleDc: '',
    });
  });

  it('shows a page error when role creation fails', async () => {
    apiMocks.apiGet.mockResolvedValue({ resultList: [] });
    apiMocks.apiPost.mockRejectedValueOnce(new Error('역할 저장 실패'));

    renderPage();
    await createRole();

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('역할 저장 실패'),
    );
  });
});
