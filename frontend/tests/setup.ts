import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

beforeEach(() => {
  window.localStorage.clear();
  window.history.pushState({}, '', '/login');
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            resultCode: '200',
            resultMessage: '성공 !!!',
            jToken: 'test-access-token',
            refreshToken: 'test-refresh-token',
          }),
          { status: 200 },
        ),
    ),
  );
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.history.pushState({}, '', '/login');
  vi.unstubAllGlobals();
});
