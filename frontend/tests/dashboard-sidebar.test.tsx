import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { DashboardContent } from '../src/pages/dashboard/components/DashboardContent';
import { DashboardMenuTree } from '../src/pages/dashboard/components/DashboardMenuTree';
import { buildModuleDescriptors } from '../src/pages/dashboard/services/menuService';
import { preloadDashboardPages } from '../src/pages/dashboard/components/dashboardPages';

// 대시보드 업무 화면은 지연 로딩된다. 기존 동기 렌더링 단언을 유지하도록 화면 모듈을 미리 불러온다.
beforeAll(() => preloadDashboardPages(), 60_000);

vi.mock('../src/pages/groupware/community/notice/components/NoticeLoginPopupHost', () => ({
  NoticeLoginPopupHost: () => null,
}));

async function loginAsAdmin() {
  fireEvent.change(await screen.findByLabelText(/업체코드/i), {
    target: { value: 'A001' },
  });
  fireEvent.change(screen.getByLabelText(/사용자 ID/i), {
    target: { value: 'admin' },
  });
  fireEvent.change(screen.getByLabelText(/비밀번호/i), {
    target: { value: '1234' },
  });
  fireEvent.click(screen.getByRole('button', { name: /로그인/i }));

  await screen.findByRole('button', { name: /프로필 메뉴 열기/i });
}

function renderAuthenticatedApp(path: string) {
  window.localStorage.setItem('s-erp-auth', JSON.stringify({
    tenantCode: 'A001',
    userId: 'admin',
    accessToken: 'mock-token',
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  }));
  window.history.pushState({}, '', path);
  return render(<App />);
}

describe('Dashboard sidebar', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    const defaultFetch = window.fetch;
    const permissions = { read: true, create: true, update: true, delete: true, excel: true };
    const response = (result: unknown) => new Response(
      JSON.stringify({ resultCode: '200', result }),
      { status: 200 },
    );
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/boards/notice/login-popups')) {
        return response({ resultList: [] });
      }
      if (url.includes('/api/v1/menus/my')) {
        const body = await (await defaultFetch(input, init)).json();
        return response({
          ...body.result,
          menus: [
            { menuId: 1, name: '그룹웨어', path: '/groupware', children: [
              { menuId: 11, name: '종합현황', path: '/groupware/overview', permissions },
              { menuId: 12, name: '문서관리', path: '/groupware/documents', permissions },
            ] },
            { menuId: 2, name: '환경설정', path: '/settings', children: [
              { menuId: 21, name: '권한관리', path: '/settings/roles', permissions },
              { menuId: 22, name: '메뉴관리', path: '/settings/menus', permissions },
            ] },
          ],
        });
      }
      if (url.includes('/api/v1/system/modules')) {
        return response({ resultList: [
          { moduleId: 1, moduleCode: 'groupware', moduleNm: '그룹웨어', moduleUrl: '/groupware', useAt: 'Y' },
          { moduleId: 2, moduleCode: 'settings', moduleNm: '환경설정', moduleUrl: '/settings', useAt: 'Y' },
        ] });
      }
      if (/\/api\/v1\/system\/roles(?:\?|$)/.test(url)) {
        return response({ resultList: [{ roleId: 1, roleCode: 'ADMIN', roleNm: '관리자', useAt: 'Y' }] });
      }
      if (/\/api\/v1\/system\/roles\/\d+\/users/.test(url)) {
        return response({ assignedUsers: [], unassignedUsers: [] });
      }
      if (url.includes('/api/v1/system/permissions')) {
        return response({ resultList: [{ permissionId: 1, permissionCode: 'READ', permissionName: '조회' }] });
      }
      if (url.includes('/api/v1/system/menus?')) {
        return response({ resultList: [{
          menuId: 41, moduleId: 1, moduleNm: '그룹웨어', parentMenuId: null,
          menuCode: 'SYNTHETIC', menuNm: '검증용 메뉴', menuUrl: '/groupware/synthetic',
          sortOrder: 1, useAt: 'Y', permissionCodes: ['READ'],
        }] });
      }
      return defaultFetch(input, init);
    });
  });

  it('shows only the groupware and settings modules with their menus', async () => {
    render(<App />);
    await loginAsAdmin();

    expect(document.body).toHaveTextContent('iPlusMES');
    expect(await screen.findByText(/모듈 선택/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '그룹웨어' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /환경설정/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /영업관리/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /생산관리/i }),
    ).not.toBeInTheDocument();

    expect(
      await screen.findByRole('treeitem', { name: /^종합현황$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('treeitem', { name: /^문서관리$/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('treeitem', { name: /^문서관리$/i }));

    expect(
      await screen.findByRole('heading', { name: /^문서관리$/i }),
    ).toBeInTheDocument();
  });

  it('switches menus when another module is selected', async () => {
    render(<App />);
    await loginAsAdmin();

    fireEvent.click(screen.getByRole('button', { name: /환경설정/i }));

    expect(
      await screen.findByRole('treeitem', { name: /^권한관리$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('treeitem', { name: /^메뉴관리$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /^권한관리$/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('treeitem', { name: /^메뉴관리$/i }));

    expect(
      await screen.findByRole('heading', { name: /^메뉴관리$/i }),
    ).toBeInTheDocument();
  });

  it('shows recent menu history in the sidebar footer', () => {
    render(
      <DashboardMenuTree
        selectedModule={{
          id: 'settings',
          name: '환경설정',
          icon: <span aria-hidden="true">S</span>,
          tree: [
            {
              id: 'system',
              name: '시스템 관리',
              children: [{ id: 'roles', name: '권한관리', pageKey: 'roles' }],
            },
          ],
          menus: [{ id: 'roles', name: '권한관리', pageKey: 'roles' }],
        }}
        expandedItemIds={['system']}
        selectedMenuId="roles"
        recentMenuItems={[
          {
            menuId: 'roles',
            moduleId: 'settings',
            moduleName: '환경설정',
            label: '권한관리',
            path: '/settings/roles',
            visitedAt: Date.now(),
          },
        ]}
        onMenuSelect={() => undefined}
        onRecentMenuSelect={() => undefined}
        onToggleMenu={() => undefined}
      />,
    );

    expect(screen.getByText(/최근 사용/i)).toBeInTheDocument();
    const recentRoleButton = screen.getByRole('button', { name: /권한관리/i });
    expect(recentRoleButton).toBeInTheDocument();
    expect(within(recentRoleButton).getByText(/환경설정/i)).toBeInTheDocument();
  });

  it('shows a compact profile action menu from the top app bar avatar control', async () => {
    render(<App />);
    await loginAsAdmin();

    fireEvent.click(screen.getByRole('button', { name: /프로필 메뉴 열기/i }));

    expect(await screen.findByText(/소크라710/i)).toBeInTheDocument();
    expect(screen.getByText(/플랫폼개발팀/i)).toBeInTheDocument();
    expect(screen.getByText(/사원/i)).toBeInTheDocument();
    expect(screen.queryByText(/플랫폼관리자/i)).not.toBeInTheDocument();
    expect(screen.getByText(/admin@f1soft.com/i)).toBeInTheDocument();
    expect(screen.getByText(/내 정보 관리/i)).toBeInTheDocument();
    expect(screen.getByText(/보안 설정/i)).toBeInTheDocument();
    expect(screen.getByText(/로그아웃/i)).toBeInTheDocument();

    const profileAvatars = screen.getAllByTestId('profile-avatar');
    expect(profileAvatars).toHaveLength(2);
    expect(getComputedStyle(profileAvatars[0]).backgroundColor).toBe(
      getComputedStyle(profileAvatars[1]).backgroundColor,
    );
  });

  describe('persistent recent menus', () => {
    beforeEach(() => {
      const defaultFetch = window.fetch;
      vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input).includes('/boards/notice/login-popups')) {
          return new Response(JSON.stringify({
            resultCode: '200', result: { resultList: [] },
          }), { status: 200 });
        }
        if (String(input).includes('/api/v1/menus/my')) {
          return new Response(JSON.stringify({
            resultCode: '200',
            result: {
              user: { userId: 'test-user', roles: [] },
              menus: [{
                menuId: 1, name: '그룹웨어', path: '/groupware',
                children: [{
                  menuId: 2, name: '종합현황', path: '/groupware/overview',
                  permissions: { read: true, create: false, update: false, delete: false },
                }],
              }],
            },
          }), { status: 200 });
        }
        return defaultFetch(input, init);
      });
    });

    async function loginRecentMenuUser() {
      await screen.findByLabelText(/업체코드/i);
      await loginAsAdmin();
    }

    it('keeps recent menus across logout, login and a new browser session', async () => {
      const historyKey = 's-erp:recent-menu-history';
      window.sessionStorage.clear();
      window.localStorage.setItem(historyKey, JSON.stringify([{
        menuId: 'previous-menu',
        moduleId: 'dashboard',
        label: '이전 메뉴',
        path: '/',
        visitedAt: Date.now() - 60_000,
      }]));
      const view = render(<App />);
      await loginRecentMenuUser();

      expect(await screen.findByRole('button', { name: /이전 메뉴/i })).toBeInTheDocument();
      await waitFor(() => {
        const entries = JSON.parse(window.localStorage.getItem(historyKey) ?? '[]');
        expect(entries[0].path).toBe('/groupware/overview');
      });
      const savedHistory = window.localStorage.getItem(historyKey);
      fireEvent.click(screen.getByRole('button', { name: /프로필 메뉴 열기/i }));
      fireEvent.click(screen.getByText(/로그아웃/i));
      await screen.findByLabelText(/업체코드/i);
      expect(window.localStorage.getItem(historyKey)).toBe(savedHistory);

      await loginRecentMenuUser();
      expect(await screen.findByRole('button', { name: /이전 메뉴/i })).toBeInTheDocument();
      view.unmount();
      window.sessionStorage.clear();
      render(<App />);
      expect(await screen.findByRole('button', { name: /이전 메뉴/i })).toBeInTheDocument();
    }, 15_000);

    it('migrates existing session history to persistent storage', async () => {
      const historyKey = 's-erp:recent-menu-history';
      window.sessionStorage.clear();
      window.sessionStorage.setItem(historyKey, JSON.stringify([{
        menuId: 'previous-menu',
        moduleId: 'dashboard',
        label: '이관 메뉴',
        path: '/',
        visitedAt: Date.now() - 60_000,
      }]));
      render(<App />);
      await loginRecentMenuUser();

      expect(await screen.findByRole('button', { name: /이관 메뉴/i })).toBeInTheDocument();
      await waitFor(() => expect(window.localStorage.getItem(historyKey)).toContain('이관 메뉴'));
      expect(window.sessionStorage.getItem(historyKey)).toBeNull();
    });

    it('prefers persistent history and keeps only the latest five distinct menus', async () => {
      const historyKey = 's-erp:recent-menu-history';
      window.sessionStorage.clear();
      window.sessionStorage.setItem(historyKey, JSON.stringify([{
        menuId: 'stale-menu', moduleId: 'dashboard', label: '과거 세션 메뉴',
        path: '/', visitedAt: Date.now() - 60_000,
      }]));
      window.localStorage.setItem(historyKey, JSON.stringify(
        Array.from({ length: 8 }, (_, index) => ({
          menuId: `previous-${index}`, moduleId: 'dashboard', label: `저장 메뉴 ${index}`,
          path: '/', visitedAt: Date.now() - (index + 1) * 60_000,
        })),
      ));
      render(<App />);
      await loginRecentMenuUser();
      expect(await screen.findByRole('button', { name: /저장 메뉴 0/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /과거 세션 메뉴/i })).not.toBeInTheDocument();
      await waitFor(() => {
        const entries = JSON.parse(window.localStorage.getItem(historyKey) ?? '[]');
        expect(entries).toHaveLength(5);
        expect(new Set(entries.map((entry: { menuId: string }) => entry.menuId)).size).toBe(5);
        expect(entries[0].label).toBe('종합현황');
      });
    });

    it.each(['{broken', '{}', '[null, {"menuId":"invalid"}]'])(
      'recovers from invalid persistent recent menus: %s',
      async (rawHistory) => {
        const historyKey = 's-erp:recent-menu-history';
        window.sessionStorage.clear();
        window.localStorage.setItem(historyKey, rawHistory);
        render(<App />);
        await loginRecentMenuUser();
        await waitFor(() => {
          const entries = JSON.parse(window.localStorage.getItem(historyKey) ?? '[]');
          expect(entries).toHaveLength(1);
          expect(entries[0].label).toBe('종합현황');
        });
      },
    );
  });

  it('clears the menu management page session when logging out', async () => {
    const menuPageSessionKey = 's-erp:page:menu-management';
    render(<App />);
    await loginAsAdmin();
    window.sessionStorage.setItem(menuPageSessionKey, JSON.stringify({
      version: 1,
      value: { selectedModuleId: 1, selectedRoleId: '1', searchQuery: 'logout-check' },
    }));
    await screen.findByRole('button', { name: /프로필 메뉴 열기/i });

    fireEvent.click(screen.getByRole('button', { name: /프로필 메뉴 열기/i }));
    fireEvent.click(screen.getByText(/로그아웃/i));

    await screen.findByLabelText(/업체코드/i);
    expect(window.sessionStorage.getItem(menuPageSessionKey)).toBeNull();
  });

  it('shows a submenu indicator for menu groups that contain child items', () => {
    render(
      <DashboardMenuTree
        selectedModule={{
          id: 'settings',
          name: '환경설정',
          icon: <span aria-hidden="true">S</span>,
          tree: [
            {
              id: 'system',
              name: '시스템 관리',
              children: [
                { id: 'roles', name: '권한관리', pageKey: 'roles' },
                { id: 'menus', name: '메뉴관리', pageKey: 'menus' },
              ],
            },
          ],
          menus: [],
        }}
        expandedItemIds={['system']}
        selectedMenuId="roles"
        onMenuSelect={() => undefined}
        onToggleMenu={() => undefined}
      />,
    );

    const systemGroup = screen.getByRole('treeitem', { name: /시스템 관리/i });

    expect(systemGroup).toHaveAttribute('aria-expanded', 'true');
    expect(systemGroup.querySelector('.MuiTreeItem-iconContainer svg')).toBeVisible();
    const children = within(systemGroup).getByRole('group');
    expect(children).toHaveStyle({ borderLeftWidth: '1px' });
    expect(within(children).getAllByRole('treeitem')).toHaveLength(2);
  });

  it('collapses only the menu panel while keeping module selection visible', async () => {
    render(<App />);
    await loginAsAdmin();

    const collapseButton = screen.getByRole('button', {
      name: /메뉴 패널 접기/i,
    });
    expect(collapseButton).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByRole('button', { name: /환경설정/i }),
    ).toBeInTheDocument();

    fireEvent.click(collapseButton);

    expect(
      screen.getByRole('button', { name: /메뉴 패널 펼치기/i }),
    ).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.getByRole('button', { name: /그룹웨어/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/모듈 선택/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /메뉴 패널 펼치기/i }));
    expect(screen.getByText(/모듈 선택/i)).toBeInTheDocument();
  });

  it('opens and closes only the menu panel on mobile', async () => {
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query: string) => ({
        matches: query === '(max-width: 767px)',
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });

    try {
      render(<App />);
      await loginAsAdmin();

      expect(
        screen.getByRole('button', { name: /그룹웨어/i }),
      ).toBeInTheDocument();
      expect(screen.queryByRole('tree')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: '메뉴 열기' }));
      expect(screen.getByRole('tree')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: '메뉴 닫기' }));
      expect(screen.queryByRole('tree')).not.toBeInTheDocument();
    } finally {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: originalMatchMedia,
      });
    }
  });

  it('selects the routed leaf menu on direct dashboard navigation', async () => {
    window.localStorage.setItem(
      's-erp-auth',
      JSON.stringify({
        tenantCode: 'A001',
        userId: 'admin',
        accessToken: 'mock-token',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      }),
    );
    window.history.pushState({}, '', '/groupware/documents');

    render(<App />);

    expect(
      await screen.findByRole('heading', { name: /^문서관리$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('treeitem', { name: /^문서관리$/i }),
    ).toHaveAttribute('aria-checked', 'true');
  });

  it('shows the active menu title in the fixed header without duplicate page titles', async () => {
    render(<App />);
    await loginAsAdmin();

    fireEvent.click(screen.getByRole('button', { name: /환경설정/i }));
    fireEvent.click(screen.getByRole('treeitem', { name: /^메뉴관리$/i }));

    expect(
      await screen.findByRole('heading', { name: /^메뉴관리$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('heading', { name: /^메뉴관리$/i }),
    ).toHaveLength(1);
    expect(
      screen.queryByRole('heading', { name: /^대시보드$/i }),
    ).not.toBeInTheDocument();
  });

  it('renders a coming soon state when a menu exists but the page is not implemented yet', () => {
    render(
      <DashboardContent
        selectedModule={{
          id: 'sales',
          name: '영업관리',
          icon: <span aria-hidden="true">S</span>,
          tree: [],
          menus: [],
          path: '/sales',
        }}
        currentMenuName="수주 관리"
        currentPageKey="sales-order"
        breadcrumbItems={['영업관리', '수주 관리']}
        content={{
          title: '수주 관리',
          description: '수주 관리 화면입니다.',
          cards: [],
          items: [],
        }}
      />,
    );

    expect(
      screen.getByText(/요청하신 페이지는 현재 준비 중입니다/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/수주 관리 메뉴는 추후 서비스될 예정입니다/i),
    ).toBeInTheDocument();
  });

  it('keeps DB-backed leaf menus in the selectable list even without a mapped page key', () => {
    const descriptors = buildModuleDescriptors({
      user: { userId: 'admin', roles: ['ADMIN'] },
      menus: [
        {
          menuId: 200,
          parentMenuId: null,
          name: '환경설정',
          icon: 'Settings',
          path: '/settings',
          children: [
            {
              menuId: 210,
              parentMenuId: 200,
              name: '시스템 관리',
              path: '/settings/system',
              children: [
                {
                  menuId: 220,
                  parentMenuId: 210,
                  name: '창고관리',
                  path: '/settings/system/warehouse',
                  permissions: {
                    read: true,
                    create: true,
                    update: true,
                    delete: true,
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    expect(descriptors[0].menus).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'warehouse',
          name: '창고관리',
          pageKey: 'warehouse',
        }),
      ]),
    );
  });

  it('renders a coming soon state for an unimplemented leaf menu without a mapped page key', () => {
    render(
      <DashboardContent
        selectedModule={{
          id: 'sales',
          name: '영업관리',
          icon: <span aria-hidden="true">S</span>,
          tree: [
            {
              id: 'purchase-order',
              name: '발주 관리',
              pageKey: 'unmapped-leaf-menu',
            },
          ],
          menus: [
            {
              id: 'purchase-order',
              name: '발주 관리',
              pageKey: 'unmapped-leaf-menu',
            },
          ],
          path: '/sales',
        }}
        currentMenuName="발주 관리"
        currentPageKey="unmapped-leaf-menu"
        breadcrumbItems={['영업관리', '발주 관리']}
        content={{
          title: '발주 관리',
          description: '발주 관리 화면입니다.',
          cards: [],
          items: [],
        }}
      />,
    );

    expect(
      screen.getByText(/발주 관리 메뉴는 추후 서비스될 예정입니다\./i),
    ).toBeInTheDocument();
  });

  it('renders the ERP-style role management screen', async () => {
    renderAuthenticatedApp('/settings/roles');

    expect(
      await screen.findByRole('heading', { name: /^권한관리$/i }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('grid', { name: 'F1-GRID 권한 관리' })).toBeVisible();
    expect((await screen.findAllByText(/ADMIN/i)).length).toBeGreaterThan(0);
    expect(screen.getByRole('grid', { name: 'F1-GRID 사용자 매핑' })).toBeVisible();

  });

  it('renders the ERP-style menu management screen', async () => {
    renderAuthenticatedApp('/settings/menus');

    expect(
      await screen.findByRole('heading', { name: /^메뉴관리$/i }),
    ).toBeInTheDocument();
    fireEvent.mouseDown(await screen.findByRole('combobox', { name: '권한 선택' }));
    fireEvent.click(screen.getByRole('option', { name: '관리자' }));
    expect(await screen.findByText('검증용 메뉴')).toBeVisible();
    const menuGrid = screen.getByRole('grid', { name: 'F1-TREE 메뉴 관리' });
    expect(screen.getByRole('combobox', { name: '모듈 선택' })).toBeVisible();
    expect(screen.getAllByText(/사용 여부/i).length).toBeGreaterThan(0);
    fireEvent.contextMenu(menuGrid.lastElementChild as HTMLElement);
    expect(screen.getByRole('menuitem', { name: '루트 추가' })).toBeVisible();
  });
});
