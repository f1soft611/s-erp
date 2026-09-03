import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  value: vi.fn((contextId: string) =>
    contextId === '2d'
      ? {
          font: '',
          measureText: (text: string) => ({ width: text.length * 7 }),
        }
      : null,
  ),
});

// jsdom은 URL.createObjectURL/revokeObjectURL을 구현하지 않는다. 엑셀/CSV 다운로드 코드가 사용한다.
URL.createObjectURL = vi.fn(() => 'blob:test-url');
URL.revokeObjectURL = vi.fn();

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
