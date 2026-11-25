import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiGet, apiGetEventStream, apiGetWithExactDecimals, apiPostWithExactDecimals } from '../src/shared/services/apiClient';
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
  it('preserves selected decimal JSON tokens without changing identifiers or quoted strings', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      '{"resultCode":"200","result":{"id":17,"unitPrice":1234567890123.100001,"note":"\\"unitPrice\\": 3.14","details":[{"unitPrice":1.234567e-3,"id":2}]}}',
    )));
    await expect(apiGetWithExactDecimals('/synthetic', ['unitPrice'])).resolves.toEqual({
      id: 17,
      unitPrice: '1234567890123.100001',
      note: '"unitPrice": 3.14',
      details: [{ unitPrice: '0.001234567', id: 2 }],
    });
  });

  it('still rejects malformed JSON when exact decimal parsing is requested', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      '{"result":{"unitPrice":123.4x}}',
    )));
    await expect(apiGetWithExactDecimals('/synthetic', ['unitPrice'])).rejects.toBeInstanceOf(SyntaxError);
  });

  it('sends exact decimal request strings and preserves decimal tokens in the response', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(
      '{"resultCode":"200","result":{"unitPrice":1234567890123.100001}}',
    ));
    vi.stubGlobal('fetch', fetch);
    await expect(apiPostWithExactDecimals('/synthetic', {
      unitPrice: '1234567890123.100001',
    }, ['unitPrice'])).resolves.toEqual({ unitPrice: '1234567890123.100001' });
    expect(fetch).toHaveBeenCalledWith('/synthetic', expect.objectContaining({
      method: 'POST', body: '{"unitPrice":"1234567890123.100001"}',
    }));
  });

  it('does not start a stream when its account was aborted during authorization', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const abort = new AbortController();
    const stream = apiGetEventStream('/synthetic-stream', abort.signal);
    abort.abort();
    await expect(stream).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns the streaming body without consuming it', async () => {
    const response = new Response('event: ready\ndata: {}\n\n', {
      headers: { 'Content-Type': 'text/event-stream' },
    });
    const fetch = vi.fn().mockResolvedValue(response);
    vi.stubGlobal('fetch', fetch);
    expect(await apiGetEventStream('/synthetic-stream', new AbortController().signal)).toBe(response);
    expect(response.bodyUsed).toBe(false);
    expect(fetch).toHaveBeenCalledWith('/synthetic-stream', expect.objectContaining({
      signal: expect.any(AbortSignal), cache: 'no-store',
      headers: expect.objectContaining({ Accept: 'text/event-stream' }),
    }));
  });

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
