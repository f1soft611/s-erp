import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  authenticated: false,
  listeners: new Set<() => void>(),
}));
vi.mock('../src/shared/services/authService', () => ({
  isAuthenticated: () => auth.authenticated,
  subscribeAuthChange: (listener: () => void) => {
    auth.listeners.add(listener);
    return () => auth.listeners.delete(listener);
  },
  readSessionNotice: () => null,
  setSessionNotice: vi.fn(),
}));
vi.mock('../src/pages/auth/hooks/useLoginForm', () => ({
  useLoginForm: () => ({
    handleSubmit: async (event: React.FormEvent) => {
      event.preventDefault();
      auth.authenticated = true;
      auth.listeners.forEach((listener) => listener());
      return { ok: true };
    },
  }),
}));
vi.mock('../src/pages/auth/components/LoginForm', () => ({
  LoginForm: ({ onSubmit }: { onSubmit: React.FormEventHandler }) => (
    <form onSubmit={onSubmit}><button type="submit">로그인</button></form>
  ),
}));
vi.mock('../src/pages/dashboard/DashboardPage', () => ({
  default: function DashboardPreview() {
    const location = useLocation();
    return <div>destination:{location.pathname}{location.search}</div>;
  },
}));

import AppRouter from '../src/routes/AppRouter';

beforeEach(() => {
  auth.authenticated = false;
  auth.listeners.clear();
});

it('preserves a valid push notification through login without a caller URL', async () => {
  render(<MemoryRouter initialEntries={[
    '/groupware/notifications?pushNotificationId=14',
  ]}><AppRouter /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: '로그인' }, { timeout: 10000 }));
  expect(await screen.findByText(
    'destination:/groupware/notifications?pushNotificationId=14',
    {}, { timeout: 10000 })).toBeVisible();
}, 25000);

it('does not use an arbitrary return URL from login state', async () => {
  render(<MemoryRouter initialEntries={[{
    pathname: '/login', state: { returnUrl: 'https://evil.test', pushNotificationId: -1 },
  }]}><AppRouter /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: '로그인' }, { timeout: 10000 }));
  expect(await screen.findByText('destination:/', {}, { timeout: 10000 })).toBeVisible();
}, 25000);
