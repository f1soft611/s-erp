import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MenuManagementPanel } from '../src/pages/settings/system/menus/components/MenuManagementPanel';
import { MenuManagementPage } from '../src/pages/settings/system/menus/MenuManagementPage';
import { menuRows } from '../src/pages/settings/system/menus/data/menuManagement.data';
import {
  fetchActivePermissions,
  fetchMenuRows,
  fetchModules,
  replaceMenuPermissions,
  saveMenuChanges,
} from '../src/pages/settings/system/menus/services/menuManagement.service';
import type {
  MenuManagementRow,
  MenuModuleOption,
  MenuPermissionDefinition,
} from '../src/pages/settings/system/menus/types/menuManagement.types';

const apiMocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}));

vi.mock('../src/shared/services/apiClient', () => apiMocks);

beforeEach(() => {
  vi.clearAllMocks();
});

const modules: MenuModuleOption[] = [
  { moduleId: 1, moduleName: '기본' },
  { moduleId: 2, moduleName: '환경설정' },
];

const permissions: MenuPermissionDefinition[] = [
  {
    permissionId: 1,
    permissionCode: 'READ',
    permissionName: '조회',
    sortOrder: 10,
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
    tree: [],
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

const moduleOneRows: MenuManagementRow[] = [
  {
    ...menuRows[0],
    id: '1',
    moduleId: 1,
    moduleName: '기본',
    name: '대시보드',
    permissionCodes: ['READ'],
  },
];

const moduleTwoRows: MenuManagementRow[] = [
  {
    ...menuRows[1],
    id: '4',
    moduleId: 2,
    moduleName: '환경설정',
    name: '시스템 관리',
    hasChildren: true,
    permissionCodes: [],
  },
  {
    ...menuRows[4],
    id: '10',
    moduleId: 2,
    moduleName: '환경설정',
    parentMenuId: null,
    name: '메뉴관리',
    permissionCodes: ['READ'],
  },
];

describe('MenuManagementPanel F1Tree integration', () => {
  it('renders the existing menu rows through F1Tree with tree commands', () => {
    render(
      <MenuManagementPanel
        menus={menuRows}
        selectedModule={modules[1]}
        permissions={permissions}
      />,
    );

    expect(
      screen.getByRole('grid', { name: 'F1-TREE 메뉴 관리' }),
    ).toBeVisible();
    expect(screen.getByRole('gridcell', { name: 'DASH' })).toBeVisible();
    expect(
      screen.getByRole('button', { name: '루트 메뉴 추가' }),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: '하위 메뉴 추가' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: '삭제' })).toBeVisible();
    expect(screen.getByRole('button', { name: '저장' })).toBeVisible();
    expect(screen.getByRole('button', { name: '전체 펼치기' })).toBeVisible();
    expect(screen.getByRole('button', { name: '전체 접기' })).toBeVisible();
  });

  it('adds a root menu and updates the inserted count', () => {
    render(
      <MenuManagementPanel
        menus={menuRows}
        selectedModule={modules[1]}
        permissions={permissions}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '루트 메뉴 추가' }));

    expect(screen.getByRole('gridcell', { name: 'NEW1' })).toBeVisible();
    expect(screen.getByText(/신규 1건/)).toBeVisible();
  });

  it('renders ordered permission columns, allows leaf edits, disables groups, and starts new rows unchecked', () => {
    render(
      <MenuManagementPanel
        menus={moduleTwoRows}
        selectedModule={modules[1]}
        permissions={permissions}
      />,
    );

    expect(
      screen
        .getAllByRole('columnheader')
        .map((header) => header.textContent)
        .slice(-2),
    ).toEqual(['조회', '엑셀']);
    expect(screen.getByLabelText('조회 10')).toBeChecked();
    expect(screen.getByLabelText('엑셀 10')).not.toBeChecked();
    expect(screen.getByLabelText('조회 4')).toBeDisabled();

    fireEvent.click(screen.getByLabelText('엑셀 10'));
    expect(screen.getByLabelText('엑셀 10')).toBeChecked();
    expect(screen.getByText(/수정 1건/)).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: '루트 메뉴 추가' }));
    expect(screen.getByLabelText('조회 new-menu-1')).not.toBeChecked();
  });
});

describe('menu management API integration', () => {
  it('normalizes module and active permission definitions', async () => {
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/modules') {
        return Promise.resolve({
          resultList: [{ moduleId: 2, moduleNm: '환경설정', useAt: 'Y' }],
        });
      }
      if (path === '/api/v1/system/permissions') {
        return Promise.resolve({
          resultList: [
            {
              permissionId: 1,
              permissionCode: 'READ',
              permissionName: '조회',
              sortOrder: 10,
            },
          ],
        });
      }
      return Promise.reject(new Error(`unexpected ${path}`));
    });

    await expect(fetchModules()).resolves.toEqual([
      { moduleId: 2, moduleName: '환경설정' },
    ]);
    await expect(fetchActivePermissions()).resolves.toEqual(
      permissions.slice(0, 1),
    );
  });

  it('maps menu identity and hierarchy fields returned by the API', async () => {
    apiMocks.apiGet.mockResolvedValue({
      resultList: [
        {
          menuId: 10,
          moduleId: 2,
          moduleNm: '환경설정',
          parentMenuId: 4,
          parentMenuNm: '시스템 관리',
          menuCode: 'MENU',
          menuNm: '메뉴관리',
          menuUrl: '/settings/system/menus',
          iconNm: 'Menu',
          sortOrder: 2,
          useAt: 'Y',
          hasChildren: true,
          permissionCodes: ['READ'],
        },
      ],
    });

    await expect(fetchMenuRows(2)).resolves.toEqual([
      expect.objectContaining({
        id: '10',
        moduleId: 2,
        parentMenuId: '4',
        hasChildren: true,
        permissionCodes: ['READ'],
      }),
    ]);
    expect(apiMocks.apiGet).toHaveBeenCalledWith(
      '/api/v1/system/menus?moduleId=2',
    );
  });

  it('sends inserted, updated, then deleted menu changes using their API routes', async () => {
    apiMocks.apiPost.mockResolvedValue({ item: { menuId: 12 } });
    apiMocks.apiPut.mockResolvedValue({});
    apiMocks.apiDelete.mockResolvedValue({});

    await expect(
      saveMenuChanges({
        insertedRows: [
          {
            ...menuRows[0],
            id: 'new-menu-1',
            parentMenuId: null,
            moduleId: 2,
          },
        ],
        updatedRows: [
          { ...menuRows[1], id: '10', parentMenuId: null, moduleId: 2 },
        ],
        deletedRows: [
          { ...menuRows[2], id: '11', parentMenuId: '10', moduleId: 2 },
        ],
      }),
    ).resolves.toEqual({ insertedMenuIds: { 'new-menu-1': '12' } });

    expect(apiMocks.apiPost).toHaveBeenCalledWith('/api/v1/system/menus', {
      moduleId: 2,
      parentMenuId: null,
      menuCode: 'DASH',
      menuNm: '대시보드',
      menuUrl: '/dashboard',
      iconNm: null,
      sortOrder: 1,
      useAt: 'Y',
    });
    expect(apiMocks.apiPut).toHaveBeenCalledWith('/api/v1/system/menus/10', {
      moduleId: 2,
      parentMenuId: null,
      menuCode: 'SET',
      menuNm: '환경설정',
      menuUrl: '/settings',
      iconNm: null,
      sortOrder: 2,
      useAt: 'Y',
    });
    expect(apiMocks.apiDelete).toHaveBeenCalledWith('/api/v1/system/menus/11');
  });

  it('uses the server ID of an inserted parent when saving its new child', async () => {
    apiMocks.apiPost
      .mockResolvedValueOnce({ item: { menuId: 21 } })
      .mockResolvedValueOnce({ item: { menuId: 22 } });

    await expect(
      saveMenuChanges({
        insertedRows: [
          { ...menuRows[0], id: 'new-parent', parentMenuId: null, moduleId: 2 },
          {
            ...menuRows[1],
            id: 'new-child',
            parentMenuId: 'new-parent',
            moduleId: 2,
          },
        ],
        updatedRows: [],
        deletedRows: [],
      }),
    ).resolves.toEqual({
      insertedMenuIds: { 'new-parent': '21', 'new-child': '22' },
    });

    expect(apiMocks.apiPost).toHaveBeenLastCalledWith('/api/v1/system/menus', {
      moduleId: 2,
      parentMenuId: 21,
      menuCode: 'SET',
      menuNm: '환경설정',
      menuUrl: '/settings',
      iconNm: null,
      sortOrder: 2,
      useAt: 'Y',
    });
  });
});

describe('MenuManagementPanel F1Tree workflow', () => {
  it('notifies its page after saving menu changes', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const onSaveSuccess = vi.fn();
    apiMocks.apiPut.mockResolvedValue({});
    render(
      <MenuManagementPanel
        menus={moduleTwoRows}
        selectedModule={modules[1]}
        permissions={permissions}
        onRefresh={onRefresh}
        onSaveSuccess={onSaveSuccess}
      />,
    );

    fireEvent.click(screen.getByLabelText('엑셀 10'));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(onRefresh).toHaveBeenCalledWith(2, true));
    expect(onSaveSuccess).toHaveBeenCalledWith('메뉴 변경사항을 저장했습니다.');
  });

  it('saves permissions for an edited leaf after its ancestor is collapsed', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const nestedRows: MenuManagementRow[] = [
      {
        ...moduleTwoRows[0],
        id: '4',
        name: '시스템 관리',
        parentMenuId: null,
        hasChildren: true,
      },
      {
        ...moduleTwoRows[1],
        id: '10',
        name: '메뉴관리',
        parentMenuId: '4',
        hasChildren: false,
      },
    ];
    apiMocks.apiPut.mockResolvedValue({});
    render(
      <MenuManagementPanel
        menus={nestedRows}
        selectedModule={modules[1]}
        permissions={permissions}
        onRefresh={onRefresh}
      />,
    );

    fireEvent.click(screen.getByLabelText('엑셀 10'));
    fireEvent.click(screen.getByRole('button', { name: '시스템 관리 접기' }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(onRefresh).toHaveBeenCalledWith(2, true));
    expect(apiMocks.apiPut).toHaveBeenCalledWith(
      '/api/v1/system/menus/10/permissions',
      { permissionCodes: ['READ', 'EXCEL'] },
    );
  });

  it('does not repeat a completed menu creation when permission save is retried', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    apiMocks.apiPost.mockResolvedValue({ item: { menuId: 77 } });
    apiMocks.apiPut
      .mockRejectedValueOnce(new Error('권한 저장 실패'))
      .mockResolvedValueOnce({});
    render(
      <MenuManagementPanel
        menus={moduleTwoRows}
        selectedModule={modules[1]}
        permissions={permissions}
        onRefresh={onRefresh}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '루트 메뉴 추가' }));
    fireEvent.click(screen.getByLabelText('조회 new-menu-1'));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findByText('권한 저장 실패')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(onRefresh).toHaveBeenCalledWith(2, true));
    expect(apiMocks.apiPost).toHaveBeenCalledOnce();
    expect(apiMocks.apiPut).toHaveBeenCalledWith(
      '/api/v1/system/menus/77/permissions',
      { permissionCodes: ['READ'] },
    );
    expect(apiMocks.apiPut).toHaveBeenCalledTimes(2);
  });

  it('does not repeat completed menu or permission requests when automatic refresh is retried', async () => {
    const onRefresh = vi
      .fn()
      .mockRejectedValueOnce(new Error('메뉴 목록 요청 실패'))
      .mockResolvedValueOnce(undefined);
    apiMocks.apiPost.mockResolvedValue({ item: { menuId: 77 } });
    apiMocks.apiPut.mockResolvedValue({});
    render(
      <MenuManagementPanel
        menus={moduleTwoRows}
        selectedModule={modules[1]}
        permissions={permissions}
        onRefresh={onRefresh}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '루트 메뉴 추가' }));
    fireEvent.click(screen.getByLabelText('조회 new-menu-1'));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findByText('메뉴 목록 요청 실패')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(2));
    expect(apiMocks.apiPost).toHaveBeenCalledOnce();
    expect(apiMocks.apiPut).toHaveBeenCalledOnce();
  });

  it('adds a child, blocks parent deletion, and refreshes after saving changes', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    apiMocks.apiPost.mockResolvedValue({ item: { menuId: 12 } });
    render(
      <MenuManagementPanel
        menus={menuRows}
        selectedModule={modules[1]}
        permissions={permissions}
        onRefresh={onRefresh}
      />,
    );

    fireEvent.click(screen.getByLabelText('system 행 선택'));
    fireEvent.click(screen.getByRole('button', { name: '삭제' }));
    expect(
      screen.getByText('하위 메뉴가 존재하는 메뉴는 삭제할 수 없습니다.'),
    ).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: '하위 메뉴 추가' }));
    expect(screen.getByRole('gridcell', { name: '새 메뉴' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(onRefresh).toHaveBeenCalledOnce());
  });

  it('saves a new leaf menu before its permissions and then refreshes the selected module', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    apiMocks.apiPost.mockResolvedValue({ item: { menuId: 77 } });
    apiMocks.apiPut.mockResolvedValue({});
    render(
      <MenuManagementPanel
        menus={moduleTwoRows}
        selectedModule={modules[1]}
        permissions={permissions}
        onRefresh={onRefresh}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '루트 메뉴 추가' }));
    fireEvent.click(screen.getByLabelText('조회 new-menu-1'));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(onRefresh).toHaveBeenCalledWith(2, true));
    expect(apiMocks.apiPost).toHaveBeenCalledWith(
      '/api/v1/system/menus',
      expect.any(Object),
    );
    expect(apiMocks.apiPut).toHaveBeenCalledWith(
      '/api/v1/system/menus/77/permissions',
      { permissionCodes: ['READ'] },
    );
    expect(apiMocks.apiPost.mock.invocationCallOrder[0]).toBeLessThan(
      apiMocks.apiPut.mock.invocationCallOrder[0],
    );
    expect(apiMocks.apiPut.mock.invocationCallOrder[0]).toBeLessThan(
      onRefresh.mock.invocationCallOrder[0],
    );
  });

  it('replaces permissions for an updated existing leaf', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    apiMocks.apiPut.mockResolvedValue({});
    render(
      <MenuManagementPanel
        menus={moduleTwoRows}
        selectedModule={modules[1]}
        permissions={permissions}
        onRefresh={onRefresh}
      />,
    );

    fireEvent.click(screen.getByLabelText('엑셀 10'));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(onRefresh).toHaveBeenCalledWith(2, true));
    expect(apiMocks.apiPut).toHaveBeenCalledWith(
      '/api/v1/system/menus/10/permissions',
      { permissionCodes: ['READ', 'EXCEL'] },
    );
  });

  it('keeps changed permissions visible and does not refresh when permission save fails', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    apiMocks.apiPut.mockRejectedValue(new Error('권한 저장 실패'));
    render(
      <MenuManagementPanel
        menus={moduleTwoRows}
        selectedModule={modules[1]}
        permissions={permissions}
        onRefresh={onRefresh}
      />,
    );

    fireEvent.click(screen.getByLabelText('엑셀 10'));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(await screen.findByText('권한 저장 실패')).toBeVisible();
    expect(screen.getByLabelText('엑셀 10')).toBeChecked();
    expect(screen.getByText(/수정 1건/)).toBeVisible();
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('keeps local changes when the automatic refresh fails after menu and permission saves', async () => {
    const onRefresh = vi
      .fn()
      .mockRejectedValue(new Error('메뉴 목록 요청 실패'));
    apiMocks.apiPut.mockResolvedValue({});
    render(
      <MenuManagementPanel
        menus={moduleTwoRows}
        selectedModule={modules[1]}
        permissions={permissions}
        onRefresh={onRefresh}
      />,
    );

    fireEvent.click(screen.getByLabelText('엑셀 10'));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(await screen.findByText('메뉴 목록 요청 실패')).toBeVisible();
    expect(screen.getByLabelText('엑셀 10')).toBeChecked();
    expect(screen.getByText(/수정 1건/)).toBeVisible();
    expect(apiMocks.apiPut).toHaveBeenCalledWith(
      '/api/v1/system/menus/10/permissions',
      { permissionCodes: ['READ', 'EXCEL'] },
    );
    expect(onRefresh).toHaveBeenCalledWith(2, true);
  });

  it('does not replace permissions for a deleted menu', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    apiMocks.apiDelete.mockResolvedValue({});
    render(
      <MenuManagementPanel
        menus={moduleTwoRows}
        selectedModule={modules[1]}
        permissions={permissions}
        onRefresh={onRefresh}
      />,
    );

    fireEvent.click(screen.getByLabelText('10 행 선택'));
    fireEvent.click(screen.getByRole('button', { name: '삭제' }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(onRefresh).toHaveBeenCalledWith(2, true));
    expect(apiMocks.apiDelete).toHaveBeenCalledWith('/api/v1/system/menus/10');
    expect(apiMocks.apiPut).not.toHaveBeenCalled();
  });
});

describe('MenuManagementPage module selection', () => {
  function mockMenuPageRequests({
    failModuleOneReload = false,
  }: { failModuleOneReload?: boolean } = {}) {
    let moduleOneRequestCount = 0;
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/system/modules')
        return Promise.resolve({
          resultList: modules.map((module) => ({
            ...module,
            moduleNm: module.moduleName,
            useAt: 'Y',
          })),
        });
      if (path === '/api/v1/system/permissions')
        return Promise.resolve({ resultList: permissions });
      if (path === '/api/v1/system/menus?moduleId=1') {
        moduleOneRequestCount += 1;
        if (failModuleOneReload && moduleOneRequestCount > 1) {
          return Promise.reject(new Error('메뉴 목록 요청 실패'));
        }
        return Promise.resolve({
          resultList: moduleOneRows.map((row) => ({
            menuId: Number(row.id),
            moduleId: row.moduleId,
            moduleNm: row.moduleName,
            parentMenuId: row.parentMenuId,
            parentMenuNm: row.parent,
            menuCode: row.code,
            menuNm: row.name,
            menuUrl: row.path,
            iconNm: row.iconName,
            sortOrder: row.order,
            useAt: 'Y',
            hasChildren: row.hasChildren,
            permissionCodes: row.permissionCodes,
          })),
        });
      }
      if (path === '/api/v1/system/menus?moduleId=2')
        return Promise.resolve({
          resultList: moduleTwoRows.map((row) => ({
            menuId: Number(row.id),
            moduleId: row.moduleId,
            moduleNm: row.moduleName,
            parentMenuId: row.parentMenuId,
            parentMenuNm: row.parent,
            menuCode: row.code,
            menuNm: row.name,
            menuUrl: row.path,
            iconNm: row.iconName,
            sortOrder: row.order,
            useAt: 'Y',
            hasChildren: row.hasChildren,
            permissionCodes: row.permissionCodes,
          })),
        });
      return Promise.reject(new Error(`unexpected ${path}`));
    });
  }

  it('keeps the completed creation checkpoint after a confirmed same-module refresh', async () => {
    mockMenuPageRequests();
    apiMocks.apiPost.mockResolvedValue({ item: { menuId: 77 } });
    apiMocks.apiPut
      .mockRejectedValueOnce(new Error('권한 저장 실패'))
      .mockResolvedValueOnce({});
    render(<MenuManagementPage {...pageProps} />);

    expect(
      await screen.findByRole('gridcell', { name: '대시보드' }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '루트 메뉴 추가' }));
    fireEvent.click(screen.getByLabelText('조회 new-menu-1'));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findByText('권한 저장 실패')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: '새로고침' }));
    fireEvent.click(screen.getByRole('button', { name: '계속' }));
    await waitFor(() =>
      expect(apiMocks.apiGet).toHaveBeenCalledWith(
        '/api/v1/system/menus?moduleId=1',
      ),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(apiMocks.apiPost).toHaveBeenCalledOnce());
    expect(apiMocks.apiPut).toHaveBeenLastCalledWith(
      '/api/v1/system/menus/77/permissions',
      { permissionCodes: ['READ'] },
    );
  });

  it('fetches and switches the menu tree for the selected module', async () => {
    mockMenuPageRequests();

    render(<MenuManagementPage {...pageProps} />);

    expect(
      await screen.findByRole('gridcell', { name: '대시보드' }),
    ).toBeVisible();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '모듈 선택' }));
    fireEvent.click(screen.getByRole('option', { name: '환경설정' }));

    expect(
      await screen.findByRole('gridcell', { name: '메뉴관리' }),
    ).toBeVisible();
    expect(
      screen.queryByRole('gridcell', { name: '대시보드' }),
    ).not.toBeInTheDocument();
    expect(apiMocks.apiGet).toHaveBeenCalledWith(
      '/api/v1/system/menus?moduleId=2',
    );
  });

  it('hides previous module rows while the next module menu request is pending', async () => {
    let resolveModuleTwo:
      | ((value: { resultList: unknown[] }) => void)
      | undefined;
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
      if (path === '/api/v1/system/permissions') {
        return Promise.resolve({ resultList: permissions });
      }
      if (path === '/api/v1/system/menus?moduleId=1') {
        return Promise.resolve({
          resultList: moduleOneRows.map((row) => ({
            menuId: Number(row.id),
            moduleId: row.moduleId,
            moduleNm: row.moduleName,
            parentMenuId: row.parentMenuId,
            parentMenuNm: row.parent,
            menuCode: row.code,
            menuNm: row.name,
            menuUrl: row.path,
            iconNm: row.iconName,
            sortOrder: row.order,
            useAt: 'Y',
            hasChildren: row.hasChildren,
            permissionCodes: row.permissionCodes,
          })),
        });
      }
      if (path === '/api/v1/system/menus?moduleId=2') {
        return new Promise((resolve) => {
          resolveModuleTwo = resolve;
        });
      }
      return Promise.reject(new Error(`unexpected ${path}`));
    });
    render(<MenuManagementPage {...pageProps} />);

    expect(
      await screen.findByRole('gridcell', { name: '대시보드' }),
    ).toBeVisible();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '모듈 선택' }));
    fireEvent.click(screen.getByRole('option', { name: '환경설정' }));

    await waitFor(() =>
      expect(
        screen.queryByRole('gridcell', { name: '대시보드' }),
      ).not.toBeInTheDocument(),
    );

    resolveModuleTwo?.({
      resultList: moduleTwoRows.map((row) => ({
        menuId: Number(row.id),
        moduleId: row.moduleId,
        moduleNm: row.moduleName,
        parentMenuId: row.parentMenuId,
        parentMenuNm: row.parent,
        menuCode: row.code,
        menuNm: row.name,
        menuUrl: row.path,
        iconNm: row.iconName,
        sortOrder: row.order,
        useAt: 'Y',
        hasChildren: row.hasChildren,
        permissionCodes: row.permissionCodes,
      })),
    });

    expect(
      await screen.findByRole('gridcell', { name: '메뉴관리' }),
    ).toBeVisible();
  });

  it('disables module selection during a deferred save and prevents stale module requests', async () => {
    mockMenuPageRequests();
    let resolveSave:
      | ((value: { item: { menuId: number } }) => void)
      | undefined;
    apiMocks.apiPost.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        }),
    );
    render(<MenuManagementPage {...pageProps} />);

    expect(
      await screen.findByRole('gridcell', { name: '대시보드' }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '루트 메뉴 추가' }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(apiMocks.apiPost).toHaveBeenCalledOnce());
    const moduleSelector = screen.getByRole('combobox', { name: '모듈 선택' });
    expect(moduleSelector).toHaveAttribute('aria-disabled', 'true');
    fireEvent.mouseDown(moduleSelector);
    expect(
      screen.queryByRole('option', { name: '환경설정' }),
    ).not.toBeInTheDocument();
    expect(apiMocks.apiGet).not.toHaveBeenCalledWith(
      '/api/v1/system/menus?moduleId=2',
    );

    resolveSave?.({ item: { menuId: 12 } });

    await waitFor(() =>
      expect(moduleSelector).not.toHaveAttribute('aria-disabled', 'true'),
    );
    expect(screen.getByRole('gridcell', { name: '대시보드' })).toBeVisible();
    expect(
      screen.queryByRole('gridcell', { name: '시스템 관리' }),
    ).not.toBeInTheDocument();
  });

  it('disables module selection while a clean refresh is loading', async () => {
    let resolveReload: ((value: { resultList: unknown[] }) => void) | undefined;
    let moduleOneRequestCount = 0;
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
      if (path === '/api/v1/system/permissions') {
        return Promise.resolve({ resultList: permissions });
      }
      if (path === '/api/v1/system/menus?moduleId=1') {
        moduleOneRequestCount += 1;
        if (moduleOneRequestCount === 1)
          return Promise.resolve({ resultList: [] });
        return new Promise((resolve) => {
          resolveReload = resolve;
        });
      }
      return Promise.resolve({ resultList: [] });
    });
    render(<MenuManagementPage {...pageProps} />);

    await screen.findByRole('grid', { name: 'F1-TREE 메뉴 관리' });
    fireEvent.click(screen.getByRole('button', { name: '새로고침' }));

    await waitFor(() =>
      expect(
        screen.getByRole('combobox', { name: '모듈 선택' }),
      ).toHaveAttribute('aria-disabled', 'true'),
    );

    resolveReload?.({ resultList: [] });
    await waitFor(() =>
      expect(
        screen.getByRole('combobox', { name: '모듈 선택' }),
      ).not.toHaveAttribute('aria-disabled', 'true'),
    );
  });

  it('keeps the active module and local menu when a dirty module switch is cancelled, then reloads the confirmed module', async () => {
    mockMenuPageRequests();
    render(<MenuManagementPage {...pageProps} />);

    expect(
      await screen.findByRole('gridcell', { name: '대시보드' }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '루트 메뉴 추가' }));
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '모듈 선택' }));
    fireEvent.click(screen.getByRole('option', { name: '환경설정' }));

    expect(screen.getByRole('dialog')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('gridcell', { name: '대시보드' })).toBeVisible();
    expect(screen.getByRole('gridcell', { name: 'NEW1' })).toBeVisible();
    expect(apiMocks.apiGet).not.toHaveBeenCalledWith(
      '/api/v1/system/menus?moduleId=2',
    );

    fireEvent.mouseDown(screen.getByRole('combobox', { name: '모듈 선택' }));
    fireEvent.click(screen.getByRole('option', { name: '환경설정' }));
    fireEvent.click(screen.getByRole('button', { name: '계속' }));

    expect(
      await screen.findByRole('gridcell', { name: '메뉴관리' }),
    ).toBeVisible();
    expect(apiMocks.apiGet).toHaveBeenCalledWith(
      '/api/v1/system/menus?moduleId=2',
    );
  });

  it('reloads active permissions and dynamic columns only after confirming a dirty module switch', async () => {
    let permissionRequestCount = 0;
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
      if (path === '/api/v1/system/permissions') {
        permissionRequestCount += 1;
        return Promise.resolve({
          resultList:
            permissionRequestCount === 1 ? [permissions[0]] : [permissions[1]],
        });
      }
      if (path === '/api/v1/system/menus?moduleId=1') {
        return Promise.resolve({ resultList: [] });
      }
      if (path === '/api/v1/system/menus?moduleId=2') {
        return Promise.resolve({ resultList: [] });
      }
      return Promise.reject(new Error(`unexpected ${path}`));
    });
    render(<MenuManagementPage {...pageProps} />);

    await screen.findByRole('columnheader', { name: /조회/ });
    fireEvent.click(screen.getByRole('button', { name: '루트 메뉴 추가' }));
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '모듈 선택' }));
    fireEvent.click(screen.getByRole('option', { name: '환경설정' }));
    fireEvent.click(screen.getByRole('button', { name: '취소' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(apiMocks.apiGet).toHaveBeenCalledTimes(3);
    expect(screen.getByRole('columnheader', { name: /조회/ })).toBeVisible();

    fireEvent.mouseDown(screen.getByRole('combobox', { name: '모듈 선택' }));
    fireEvent.click(screen.getByRole('option', { name: '환경설정' }));
    fireEvent.click(screen.getByRole('button', { name: '계속' }));

    await waitFor(() => expect(apiMocks.apiGet).toHaveBeenCalledTimes(5));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(apiMocks.apiGet).toHaveBeenCalledTimes(5);
    expect(
      screen.queryByRole('columnheader', { name: /조회/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /엑셀/ })).toBeVisible();
  });

  it('keeps local changes when a dirty refresh is cancelled and reloads after confirmation', async () => {
    mockMenuPageRequests();
    render(<MenuManagementPage {...pageProps} />);

    expect(
      await screen.findByRole('gridcell', { name: '대시보드' }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '루트 메뉴 추가' }));
    fireEvent.click(screen.getByRole('button', { name: '새로고침' }));

    expect(screen.getByRole('dialog')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('gridcell', { name: 'NEW1' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: '새로고침' }));
    fireEvent.click(screen.getByRole('button', { name: '계속' }));
    await waitFor(() => expect(apiMocks.apiGet).toHaveBeenCalledTimes(4));
    expect(
      screen.queryByRole('gridcell', { name: 'NEW1' }),
    ).not.toBeInTheDocument();
  });

  it('shows a menu reload error while retaining local visible changes', async () => {
    mockMenuPageRequests({ failModuleOneReload: true });
    render(<MenuManagementPage {...pageProps} />);

    expect(
      await screen.findByRole('gridcell', { name: '대시보드' }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '루트 메뉴 추가' }));
    fireEvent.click(screen.getByRole('button', { name: '새로고침' }));
    fireEvent.click(screen.getByRole('button', { name: '계속' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '메뉴 목록 요청 실패',
    );
    expect(screen.getByRole('gridcell', { name: 'NEW1' })).toBeVisible();
  });

  it('shows a clean refresh error without leaving its rejection unhandled', async () => {
    mockMenuPageRequests({ failModuleOneReload: true });
    render(<MenuManagementPage {...pageProps} />);

    expect(
      await screen.findByRole('gridcell', { name: '대시보드' }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '새로고침' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '메뉴 목록 요청 실패',
    );
  });
});
