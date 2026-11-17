import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import DashboardPage from '../src/pages/dashboard/DashboardPage';
import { AppSettingsProvider } from '../src/shared/context/AppSettingsContext';
import { NotificationProvider } from '../src/shared/context/NotificationContext';
import { login } from '../src/shared/services/authService';

vi.mock('../src/pages/dashboard/components/DashboardContent', () => ({
  DashboardContent: () => null,
}));

describe('Theme settings', () => {
  it('lets the user switch theme and display size from icon-only dashboard header controls', async () => {
    const defaultFetch = window.fetch;
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await defaultFetch(input, init);
      if (!String(input).includes('/api/v1/menus/my')) return response;

      const body = await response.json();
      for (const root of body.result.menus) {
        root.children = [{ ...root, menuId: 'dashboard-home', children: [] }];
      }
      return new Response(JSON.stringify(body), { status: 200 });
    }));
    await login({ tenantCode: 'A001', userId: 'admin', password: '1234' });

    render(
      <MemoryRouter>
        <AppSettingsProvider>
          <NotificationProvider>
            <DashboardPage />
          </NotificationProvider>
        </AppSettingsProvider>
      </MemoryRouter>,
    );

    const themeButton = await screen.findByRole('button', {
      name: /테마 설정/i,
    });
    const displayScaleButton = await screen.findByRole('button', {
      name: /화면크기 설정/i,
    });

    expect(themeButton).toBeInTheDocument();
    expect(displayScaleButton).toBeInTheDocument();
    expect(
      screen.queryByRole('combobox', { name: /테마/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('combobox', { name: /화면크기/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(themeButton);
    fireEvent.click(screen.getByRole('menuitem', { name: /다크 테마/i }));
    expect(window.localStorage.getItem('erp-theme')).toBe('dark');

    fireEvent.click(displayScaleButton);
    fireEvent.click(screen.getByRole('menuitem', { name: /^크게$/i }));
    expect(window.localStorage.getItem('erp-display-scale')).toBe('1.2');
  });
});
