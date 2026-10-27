import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiGet } from '../src/shared/services/apiClient';
import { ApiNetworkError, ApiResponseError } from '../src/shared/services/apiErrors';

vi.mock('../src/shared/services/authService', () => ({
  getStoredAuth: () => ({}),
  isAccessTokenExpiringSoon: () => false,
  isTokenExpired: () => false,
  logout: vi.fn(),
  refreshAccessToken: vi.fn(),
  resolveApiBaseUrl: () => '',
}));

afterEach(() => vi.unstubAllGlobals());

describe('API connection failure classification', () => {
  it('types fetch rejection as a connection failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(apiGet('/synthetic')).rejects.toBeInstanceOf(ApiNetworkError);
  });

  it('types an interrupted response body as a connection failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      text: () => Promise.reject(new TypeError('connection closed')),
    }));
    await expect(apiGet('/synthetic')).rejects.toBeInstanceOf(ApiNetworkError);
  });

  it('preserves cancellation rather than typing it as a connection failure', async () => {
    const aborted = new DOMException('cancelled', 'AbortError');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(aborted));
    await expect(apiGet('/synthetic')).rejects.toBe(aborted);
  });

  it('keeps HTTP errors typed even when the response is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Bad Gateway', { status: 502 })));
    await expect(apiGet('/synthetic')).rejects.toMatchObject({
      name: 'ApiResponseError', status: 502,
    });
  });

  it('does not mistake malformed successful JSON for no response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('not json')));
    await expect(apiGet('/synthetic')).rejects.toBeInstanceOf(SyntaxError);
  });

  it('keeps ordinary HTTP errors separate from connection failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ resultCode: '403', resultMessage: 'denied' }),
      { status: 403 },
    )));
    await expect(apiGet('/synthetic')).rejects.toBeInstanceOf(ApiResponseError);
  });
});
