import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AppRouter from '../src/routes/AppRouter';
import { AppSettingsProvider } from '../src/shared/context/AppSettingsContext';

beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes('/api/v1/menus/my')) {
        return new Response(
          JSON.stringify({
            resultCode: '200',
            resultMessage: 'OK',
            result: {
              user: { userId: 'admin', roles: [] },
              menus: [],
            },
          }),
          { status: 200 },
        );
      }

      if (url.includes('/api/v1/system/modules')) {
        return new Response(
          JSON.stringify({
            resultCode: '200',
            resultMessage: 'OK',
            result: { resultList: [] },
          }),
          { status: 200 },
        );
      }

      return new Response(
        JSON.stringify({
          resultCode: '200',
          resultMessage: 'OK',
          result: { ok: true },
        }),
        { status: 200 },
      );
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AppRouter not found fallback', () => {
  it('opens the authorized process management route', async () => {
    window.localStorage.setItem('s-erp-auth', JSON.stringify({
      tenantCode: 'TEST', userId: 'test', accessToken: 'token', refreshToken: '',
      expiresAt: new Date(Date.now() + 300000).toISOString(),
    }));
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/v1/menus/my')) {
        return new Response(JSON.stringify({ resultCode: '200', result: {
          user: { userId: 'test', roles: [] },
          menus: [{
            menuId: 1, name: '생산관리', path: '/pr',
            children: [{ menuId: 2, name: '기준정보', path: '/pr/master', children: [{
              menuId: 3, name: '공정관리', path: '/pr/master/process-management', children: [],
              permissions: { read: true, create: true, update: true, delete: true, excel: false },
            }] }],
          }],
        } }), { status: 200 });
      }
      return new Response(JSON.stringify({
        resultCode: '200', result: { resultList: [] },
      }), { status: 200 });
    }));
    render(
      <AppSettingsProvider>
        <MemoryRouter initialEntries={['/pr/master/process-management']}>
          <AppRouter />
        </MemoryRouter>
      </AppSettingsProvider>,
    );
    expect(await screen.findByRole('grid', { name: '공정관리' }, { timeout: 25000 })).toBeVisible();
    expect(screen.queryByText('요청하신 페이지를 찾을 수 없습니다')).not.toBeInTheDocument();
  }, 30000);

  it('opens the authorized quality module route (자재수입검사현황) instead of the NotFound page', async () => {
    window.localStorage.setItem('s-erp-auth', JSON.stringify({
      tenantCode: 'TEST', userId: 'test', accessToken: 'token', refreshToken: '',
      expiresAt: new Date(Date.now() + 300000).toISOString(),
    }));
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/v1/menus/my')) {
        return new Response(JSON.stringify({ resultCode: '200', result: {
          user: { userId: 'test', roles: [] },
          menus: [{
            menuId: 1, name: '품질관리', path: '/quality', icon: 'ClipboardCheck',
            children: [{ menuId: 2, name: '수입검사', path: '/quality/inspect', children: [{
              menuId: 3, name: '자재수입검사현황', path: '/quality/inspect/inspect-status', children: [],
              permissions: { read: true, create: false, update: false, delete: false, excel: true },
            }] }],
          }],
        } }), { status: 200 });
      }
      return new Response(JSON.stringify({
        resultCode: '200', result: { resultList: [] },
      }), { status: 200 });
    }));
    render(
      <AppSettingsProvider>
        <MemoryRouter initialEntries={['/quality/inspect/inspect-status']}>
          <AppRouter />
        </MemoryRouter>
      </AppSettingsProvider>,
    );
    // 화면이 다시 그려지며 그리드가 교체될 수 있어 찾은 요소를 쥐지 않고 매번 다시 찾는다.
    await waitFor(
      () => expect(screen.getByRole('grid', { name: '자재수입검사현황 목록' })).toBeInTheDocument(),
      { timeout: 25000 },
    );
    // 메뉴를 불러오는 동안 잠깐 보일 수 있으므로 메뉴가 도착한 뒤 NotFound가 없는지 확인한다.
    await waitFor(() => expect(screen.getAllByText('자재수입검사현황').length).toBeGreaterThan(0), { timeout: 5000 });
    await waitFor(() => expect(screen.queryByText('요청하신 페이지를 찾을 수 없습니다')).not.toBeInTheDocument(), { timeout: 5000 });
  }, 40000);

  it('redirects an unauthenticated process route to login', async () => {
    render(
      <AppSettingsProvider>
        <MemoryRouter initialEntries={['/pr/master/process-management']}>
          <AppRouter />
        </MemoryRouter>
      </AppSettingsProvider>,
    );
    expect(await screen.findByRole('heading', { name: '통합 MES 시스템 로그인' }, { timeout: 10000 })).toBeVisible();
  }, 15000);

  it.each(['/search', '/search/'])('allows the authenticated common search page without a registered database menu: %s', async (path) => {
    window.localStorage.setItem('s-erp-auth', JSON.stringify({
      tenantCode: 'TEST', userId: 'test', accessToken: 'token', refreshToken: '',
      expiresAt: new Date(Date.now() + 300000).toISOString(),
    }));
    render(
      <AppSettingsProvider>
        <MemoryRouter initialEntries={[path]}>
          <AppRouter />
        </MemoryRouter>
      </AppSettingsProvider>,
    );
    expect(await screen.findByRole('heading', { name: '통합검색 결과' }, { timeout: 25000 })).toBeVisible();
    expect(screen.getByLabelText('통합검색 검색어')).toBeVisible();
    expect(screen.queryByText('요청하신 페이지를 찾을 수 없습니다')).not.toBeInTheDocument();
  }, 30000);

  it('renders the NotFound page for unknown routes', async () => {
    render(
      <AppSettingsProvider>
        <MemoryRouter initialEntries={['/does-not-exist']}>
          <AppRouter />
        </MemoryRouter>
      </AppSettingsProvider>,
    );

    expect(
      await screen.findByText(
        '요청하신 페이지를 찾을 수 없습니다',
        {},
        { timeout: 5000 },
      ),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: '돌아가기' })).toBeVisible();
    expect(screen.getByText('© 2026 iPlusMES · F1soft')).toBeVisible();
  });

  it(
    'keeps the dashboard root path valid while the menu list is loading',
    async () => {
    window.localStorage.setItem(
      's-erp-auth',
      JSON.stringify({
        tenantCode: 'tenant',
        userId: 'admin',
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      }),
    );

    let resolveMenuResponse: ((value: Response) => void) | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);

        if (url.includes('/api/v1/menus/my')) {
          return new Promise<Response>((resolve) => {
            resolveMenuResponse = resolve;
          });
        }

        if (url.includes('/api/v1/system/modules')) {
          return new Response(
            JSON.stringify({
              resultCode: '200',
              resultMessage: 'OK',
              result: { resultList: [] },
            }),
            { status: 200 },
          );
        }

        return new Response(
          JSON.stringify({ resultCode: '200', resultMessage: 'OK' }),
          { status: 200 },
        );
      }),
    );

    render(
      <AppSettingsProvider>
        <MemoryRouter initialEntries={['/dashboard']}>
          <AppRouter />
        </MemoryRouter>
      </AppSettingsProvider>,
    );

    expect(
      screen.queryByText('요청하신 페이지를 찾을 수 없습니다'),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    await waitFor(() => expect(resolveMenuResponse).toBeDefined(), {
      timeout: 25000,
    });
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: '종합현황' }),
    ).not.toBeInTheDocument();

    resolveMenuResponse?.(
      new Response(
        JSON.stringify({
          resultCode: '200',
          resultMessage: 'OK',
          result: {
            user: { userId: 'admin', roles: [] },
            menus: [
              {
                menuId: 'dashboard-module',
                name: '대시보드',
                path: '/dashboard',
                icon: 'Dashboard',
                children: [
                  {
                    menuId: 'dashboard-home',
                    name: '종합현황',
                    path: '/dashboard/home',
                    children: [],
                    permissions: {
                      read: true,
                      create: true,
                      update: true,
                      delete: true,
                      excel: true,
                    },
                  },
                ],
              },
            ],
          },
        }),
        { status: 200 },
      ),
    );

    await waitFor(
      () => expect(screen.getByRole('heading', { name: '종합현황' })).toBeVisible(),
      { timeout: 5000 },
    );
    },
    30000,
  );

  it('renders the NotFound page for invalid dashboard menu paths', async () => {
    window.localStorage.setItem(
      's-erp-auth',
      JSON.stringify({
        tenantCode: 'tenant',
        userId: 'admin',
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      }),
    );

    render(
      <AppSettingsProvider>
        <MemoryRouter initialEntries={['/dashboard/group22ware/asdfasdf']}>
          <AppRouter />
        </MemoryRouter>
      </AppSettingsProvider>,
    );

    expect(
      await screen.findByText(
        '요청하신 페이지를 찾을 수 없습니다',
        {},
        { timeout: 15000 },
      ),
    ).toBeVisible();
  }, 20000);
});
