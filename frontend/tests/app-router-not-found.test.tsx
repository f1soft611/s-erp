import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import AppRouter from '../src/routes/AppRouter';
import { AppSettingsProvider } from '../src/shared/context/AppSettingsContext';

beforeEach(() => {
  window.localStorage.clear();
});

describe('AppRouter not found fallback', () => {
  it('renders the NotFound page for unknown routes', () => {
    render(
      <AppSettingsProvider>
        <MemoryRouter initialEntries={['/does-not-exist']}>
          <AppRouter />
        </MemoryRouter>
      </AppSettingsProvider>,
    );

    expect(
      screen.getByText('요청하신 페이지를 찾을 수 없습니다'),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: '돌아가기' })).toBeVisible();
  });

  it('renders the NotFound page for invalid dashboard menu paths', async () => {
    window.localStorage.setItem(
      's-erp-auth',
      JSON.stringify({
        tenantCode: 'tenant',
        userId: 'admin',
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
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
      await screen.findByText('요청하신 페이지를 찾을 수 없습니다'),
    ).toBeVisible();
  });
});
