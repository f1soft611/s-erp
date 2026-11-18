import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MenuManagementPage } from '../src/pages/settings/system/menus/MenuManagementPage';
import { createAppTheme } from '../src/theme/theme';

const apiMocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}));

vi.mock('../src/shared/services/apiClient', () => apiMocks);

const modules = [
  { moduleId: 1, moduleName: '기본' },
  { moduleId: 2, moduleName: '환경설정' },
];

const roles = [
  { roleId: 1, roleNm: '관리자', useAt: 'Y', roleCode: 'ADMIN' },
  { roleId: 2, roleNm: '운영자', useAt: 'Y', roleCode: 'OPERATOR' },
];

const permissions = [
  {
    permissionId: 1,
    permissionCode: 'READ',
    permissionName: '조회',
    sortOrder: 10,
  },
  {
    permissionId: 2,
    permissionCode: 'CREATE',
    permissionName: '등록',
    sortOrder: 20,
  },
  {
    permissionId: 3,
    permissionCode: 'UPDATE',
    permissionName: '수정',
    sortOrder: 30,
  },
  {
    permissionId: 5,
    permissionCode: 'EXCEL',
    permissionName: '엑셀',
    sortOrder: 50,
  },
];

const pageProps = {
  selectedModule: {
    id: 'settings',
    name: '환경설정',
    icon: null,
    tree: [
      {
        id: 'menus',
        name: '메뉴관리',
        pageKey: 'menus',
        permissions: {
          read: true,
          create: true,
          update: true,
          delete: true,
          excel: false,
        },
      },
    ],
    menus: [],
  },
  currentMenuName: '메뉴 관리',
  content: {
    title: '메뉴 관리',
    description: '메뉴를 관리합니다.',
    cards: [],
    items: [],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  apiMocks.apiGet.mockImplementation((path: string) => {
    if (path === '/api/v1/system/modules') {
      return Promise.resolve({
        resultList: modules.map((module) => ({
          ...module,
          moduleNm: module.moduleName,
          useAt: 'Y',
        })),
      });
    }
    if (path === '/api/v1/system/roles') {
      return Promise.resolve({ resultList: roles });
    }
    if (path === '/api/v1/system/permissions') {
      return Promise.resolve({ resultList: permissions });
    }
    if (path === '/api/v1/system/menus?moduleId=1&roleId=1') {
      return Promise.resolve({ resultList: [] });
    }
    if (path === '/api/v1/system/menus?moduleId=1&roleId=2') {
      return Promise.resolve({ resultList: [] });
    }
    if (path === '/api/v1/system/menus?moduleId=2&roleId=2') {
      return Promise.resolve({ resultList: [] });
    }
    return Promise.reject(new Error(`unexpected call: ${path}`));
  });
});

function renderPage() {
  return render(
    <ThemeProvider theme={createAppTheme()}>
      <MenuManagementPage {...pageProps} />
    </ThemeProvider>,
  );
}

function deferNextMenuRequest() {
  const defaultGet = apiMocks.apiGet.getMockImplementation();
  if (!defaultGet) throw new Error('Missing default menu API mock');
  const response = Promise.withResolvers<{
    resultList: {
      menuId: number;
      moduleId: number;
      menuCode: string;
      menuNm: string;
      menuUrl: string;
      useAt: string;
    }[];
  }>();
  const path = '/api/v1/system/menus?moduleId=1&roleId=1';
  apiMocks.apiGet.mockImplementation((requestPath: string) => {
    if (requestPath === path) {
      apiMocks.apiGet.mockImplementation(defaultGet);
      return response.promise;
    }
    return defaultGet(requestPath);
  });
  return {
    path,
    resolve: (name: string) => response.resolve({
      resultList: [
        {
          menuId: 1,
          moduleId: 1,
          menuCode: 'DASH',
          menuNm: name,
          menuUrl: '/dashboard',
          useAt: 'Y',
        },
      ],
    }),
  };
}

async function selectAdministrator() {
  const roleSelector = await screen.findByRole('combobox', { name: '권한 선택' });
  await waitFor(() => {
    expect(roleSelector).not.toHaveAttribute('aria-disabled', 'true');
  });
  fireEvent.mouseDown(roleSelector);
  fireEvent.click(screen.getByRole('option', { name: '관리자' }));
}

function getMenuGrid() {
  return screen.getByRole('grid', { name: 'F1-TREE 메뉴 관리' });
}

describe('MenuManagementPage required selection', () => {
  it('blocks the menu query until both module and role are selected', async () => {
    renderPage();

    const moduleSelector = await screen.findByRole('combobox', {
      name: '모듈 선택',
    });
    await waitFor(() => {
      expect(moduleSelector).not.toBeDisabled();
    });
    expect(moduleSelector).toBeVisible();
    expect(screen.getByRole('combobox', { name: '권한 선택' })).toBeVisible();

    await waitFor(() => {
      expect(screen.getByText('모듈과 권한을 모두 선택하세요.')).toBeVisible();
    });

    const requests = apiMocks.apiGet.mock.calls.map(([path]) => path);
    expect(requests).not.toContainEqual(
      expect.stringMatching(/^\/api\/v1\/system\/menus(?:\?|$)/),
    );

    fireEvent.mouseDown(screen.getByRole('combobox', { name: '모듈 선택' }));
    fireEvent.click(screen.getByRole('option', { name: '기본' }));
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '권한 선택' }));
    fireEvent.click(screen.getByRole('option', { name: '관리자' }));

    await waitFor(() => {
      expect(apiMocks.apiGet).toHaveBeenCalledWith(
        '/api/v1/system/menus?moduleId=1&roleId=1',
      );
    });
  });

  it('restores the saved module, role, and search query on entry', async () => {
    window.sessionStorage.setItem(
      's-erp:page:menu-management',
      JSON.stringify({
        version: 1,
        value: {
          selectedModuleId: 2,
          selectedRoleId: '2',
          searchQuery: '사용자',
        },
      }),
    );

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole('combobox', { name: '모듈 선택' }).textContent,
      ).toContain('환경설정');
      expect(
        screen.getByRole('combobox', { name: '권한 선택' }).textContent,
      ).toContain('운영자');
    });
    expect(screen.getByRole('textbox', { name: '메뉴 검색' })).toHaveValue(
      '사용자',
    );
    await waitFor(() => {
      expect(apiMocks.apiGet).toHaveBeenCalledWith(
        '/api/v1/system/menus?moduleId=2&roleId=2',
      );
    });
  });

  it('keeps the cleared search query empty on re-entry without changing the saved selection', async () => {
    window.sessionStorage.setItem(
      's-erp:page:menu-management',
      JSON.stringify({
        version: 1,
        value: {
          selectedModuleId: 2,
          selectedRoleId: '2',
          searchQuery: '사용자',
        },
      }),
    );
    const page = renderPage();
    expect(await screen.findByRole('textbox', { name: '메뉴 검색' })).toHaveValue('사용자');

    fireEvent.click(screen.getByRole('button', { name: '검색어 초기화' }));
    expect(screen.getByRole('textbox', { name: '메뉴 검색' })).toHaveValue('');
    await waitFor(() => {
      expect(
        JSON.parse(window.sessionStorage.getItem('s-erp:page:menu-management') ?? '{}').value,
      ).toEqual({
        selectedModuleId: 2,
        selectedRoleId: '2',
        searchQuery: '',
      });
    });

    page.unmount();
    renderPage();
    expect(await screen.findByRole('textbox', { name: '메뉴 검색' })).toHaveValue('');
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: '모듈 선택' })).toHaveTextContent('환경설정');
      expect(screen.getByRole('combobox', { name: '권한 선택' })).toHaveTextContent('운영자');
    });
  });

  it('does not query menus when the saved role no longer exists', async () => {
    window.sessionStorage.setItem(
      's-erp:page:menu-management',
      JSON.stringify({
        version: 1,
        value: {
          selectedModuleId: 2,
          selectedRoleId: 'missing-role',
          searchQuery: '사용자',
        },
      }),
    );

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole('combobox', { name: '모듈 선택' }).textContent,
      ).toContain('환경설정');
      expect(
        screen.getByRole('combobox', { name: '권한 선택' }).textContent,
      ).toContain('권한 선택');
    });
    expect(apiMocks.apiGet.mock.calls).not.toContainEqual([
      '/api/v1/system/menus?moduleId=2&roleId=missing-role',
    ]);
  });

  it('falls back to the first module when the saved module no longer exists', async () => {
    window.sessionStorage.setItem(
      's-erp:page:menu-management',
      JSON.stringify({
        version: 1,
        value: {
          selectedModuleId: 999,
          selectedRoleId: '2',
          searchQuery: '사용자',
        },
      }),
    );

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole('combobox', { name: '모듈 선택' }).textContent,
      ).toContain('기본');
      expect(
        screen.getByRole('combobox', { name: '권한 선택' }).textContent,
      ).toContain('운영자');
    });
    expect(screen.getByRole('textbox', { name: '메뉴 검색' })).toHaveValue(
      '사용자',
    );
    await waitFor(() => {
      expect(apiMocks.apiGet).toHaveBeenCalledWith(
        '/api/v1/system/menus?moduleId=1&roleId=2',
      );
    });
  });

  it('discards a saved session with an invalid field type', async () => {
    window.sessionStorage.setItem(
      's-erp:page:menu-management',
      JSON.stringify({
        version: 1,
        value: {
          selectedModuleId: 2,
          selectedRoleId: 2,
          searchQuery: '사용자',
        },
      }),
    );

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole('combobox', { name: '모듈 선택' }).textContent,
      ).toContain('기본');
      expect(
        screen.getByRole('combobox', { name: '권한 선택' }).textContent,
      ).toContain('권한 선택');
    });
    expect(screen.getByRole('textbox', { name: '메뉴 검색' })).toHaveValue('');
    expect(apiMocks.apiGet.mock.calls).not.toContainEqual([
      '/api/v1/system/menus?moduleId=2&roleId=2',
    ]);
  });

  it('persists module, role, and search changes to the page session', async () => {
    renderPage();

    const moduleSelector = await screen.findByRole('combobox', {
      name: '모듈 선택',
    });
    await waitFor(() => expect(moduleSelector).not.toBeDisabled());
    fireEvent.mouseDown(moduleSelector);
    fireEvent.click(screen.getByRole('option', { name: '환경설정' }));

    const roleSelector = screen.getByRole('combobox', { name: '권한 선택' });
    fireEvent.mouseDown(roleSelector);
    fireEvent.click(screen.getByRole('option', { name: '운영자' }));
    fireEvent.change(screen.getByRole('textbox', { name: '메뉴 검색' }), {
      target: { value: '권한' },
    });

    await waitFor(() => {
      const storedSession = window.sessionStorage.getItem(
        's-erp:page:menu-management',
      );
      expect(storedSession).not.toBeNull();
      expect(JSON.parse(storedSession ?? '{}')).toEqual({
        version: 1,
        value: {
          selectedModuleId: 2,
          selectedRoleId: '2',
          searchQuery: '권한',
        },
      });
    });
  });

  it('shows the grid loading overlay until the first menu request completes', async () => {
    const request = deferNextMenuRequest();
    renderPage();
    await selectAdministrator();

    expect(apiMocks.apiGet).toHaveBeenCalledWith(request.path);
    expect(getMenuGrid()).toHaveAttribute('aria-busy', 'true');
    expect(within(getMenuGrid()).getByRole('progressbar')).toBeVisible();
    expect(within(getMenuGrid()).queryByRole('gridcell', { name: '대시보드' })).not.toBeInTheDocument();

    request.resolve('대시보드');
    expect(await screen.findByRole('gridcell', { name: '대시보드' })).toBeVisible();
    expect(getMenuGrid()).not.toHaveAttribute('aria-busy');
    expect(within(getMenuGrid()).queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('shows the grid loading overlay until the read action completes', async () => {
    const initialRequest = deferNextMenuRequest();
    renderPage();
    await selectAdministrator();

    initialRequest.resolve('대시보드');
    expect(await screen.findByRole('gridcell', { name: '대시보드' })).toBeVisible();
    expect(getMenuGrid()).not.toHaveAttribute('aria-busy');
    expect(within(getMenuGrid()).queryByRole('progressbar')).not.toBeInTheDocument();

    const request = deferNextMenuRequest();
    const initialCallCount = apiMocks.apiGet.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: '조회' }));

    expect(apiMocks.apiGet).toHaveBeenNthCalledWith(initialCallCount + 1, request.path);
    expect(getMenuGrid()).toHaveAttribute('aria-busy', 'true');
    expect(within(getMenuGrid()).getByRole('progressbar')).toBeVisible();

    request.resolve('새 대시보드');
    expect(await screen.findByRole('gridcell', { name: '새 대시보드' })).toBeVisible();
    expect(getMenuGrid()).not.toHaveAttribute('aria-busy');
    expect(within(getMenuGrid()).queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('disables save while the module and role criteria are incomplete', async () => {
    renderPage();

    const saveButton = await screen.findByRole('button', { name: '저장' });
    expect(saveButton).toBeDisabled();
  });
});
