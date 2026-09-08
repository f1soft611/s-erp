import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ModuleManagementPage } from '../src/pages/settings/system/modules/ModuleManagementPage';
import {
  MODULE_ICON_OPTIONS,
  canEditModuleCode,
} from '../src/pages/settings/system/modules/components/ModuleManagementPanel';
import {
  fetchModuleRows,
  updateModule,
} from '../src/pages/settings/system/modules/services/moduleManagement.service';

const apiMocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}));

vi.mock('../src/shared/services/apiClient', () => apiMocks);

const settingsModule = {
  id: 'settings',
  name: '환경설정',
  icon: null,
  tree: [],
  menus: [],
};

const content = {
  title: '모듈관리',
  description: '모듈을 관리합니다.',
  cards: [],
  items: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ModuleManagementPage', () => {
  it('renders module rows from the system module API', async () => {
    apiMocks.apiGet.mockResolvedValue({
      resultList: [
        {
          moduleId: 1,
          moduleCode: 'GROUPWARE',
          moduleNm: '그룹웨어',
          iconNm: 'FileText',
          moduleUrl: '/groupware',
          sortOrder: 1,
          useAt: 'Y',
          menuCount: 2,
        },
      ],
    });

    render(
      <ModuleManagementPage
        selectedModule={settingsModule}
        currentMenuName="모듈관리"
        content={content}
        selectedMenuPermissions={{
          read: true,
          create: true,
          update: true,
          delete: true,
          excel: true,
        }}
      />,
    );

    expect(
      await screen.findByRole('gridcell', { name: '그룹웨어' }),
    ).toBeVisible();
    expect(screen.getByText('/groupware')).toBeVisible();
  });

  it('normalizes api data and sends the write payload in the expected schema', async () => {
    apiMocks.apiGet.mockResolvedValue({
      resultList: [
        {
          moduleId: 7,
          moduleCode: 'QUALITY',
          moduleNm: '품질관리',
          iconNm: 'ClipboardCheck',
          moduleUrl: '/quality',
          sortOrder: '3',
          useAt: 'Y',
          menuCount: '4',
        },
      ],
    });

    const rows = await fetchModuleRows();
    expect(rows[0]).toMatchObject({
      id: '7',
      moduleCode: 'QUALITY',
      moduleName: '품질관리',
      iconName: 'ClipboardCheck',
      moduleUrl: '/quality',
      sortOrder: 3,
      menuCount: 4,
      use: true,
    });

    apiMocks.apiPut.mockResolvedValue({});
    await updateModule('7', {
      moduleCode: 'QUALITY',
      moduleNm: '품질관리',
      iconNm: 'ClipboardCheck',
      moduleUrl: '/quality',
      sortOrder: 3,
      useAt: 'Y',
    });

    expect(apiMocks.apiPut).toHaveBeenCalledWith('/api/v1/system/modules/7', {
      moduleCode: 'QUALITY',
      moduleNm: '품질관리',
      iconNm: 'ClipboardCheck',
      moduleUrl: '/quality',
      sortOrder: 3,
      useAt: 'Y',
    });
  });

  it('shows a known icon select list and locks saved module codes from editing', () => {
    expect(MODULE_ICON_OPTIONS.length).toBeGreaterThan(0);
    expect(
      canEditModuleCode({
        id: '7',
        moduleCode: 'QUALITY',
        moduleName: '품질관리',
        iconName: 'ClipboardCheck',
        moduleUrl: '/quality',
        sortOrder: 3,
        menuCount: 4,
        use: true,
      }),
    ).toBe(false);
    expect(
      canEditModuleCode({
        id: 'new-module-1',
        moduleCode: '',
        moduleName: '신규 모듈',
        iconName: 'Folder',
        moduleUrl: '/new',
        sortOrder: 1,
        menuCount: 0,
        use: true,
      }),
    ).toBe(true);
  });
});
