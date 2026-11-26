import { beforeEach, expect, it, vi } from 'vitest';
import { apiGet } from '../src/shared/services/apiClient';
import { fetchGridDecimalPolicyStrict, resetGridDecimalPolicyCache } from '../src/shared/services/gridDecimalPolicy.service';

vi.mock('../src/shared/services/apiClient', () => ({ apiGet: vi.fn() }));
beforeEach(() => {
  vi.resetAllMocks();
  resetGridDecimalPolicyCache();
});

it('rejects a malformed policy response instead of treating it as an unregistered policy', async () => {
  vi.mocked(apiGet).mockResolvedValueOnce({}).mockResolvedValueOnce({ item: {} });
  await expect(fetchGridDecimalPolicyStrict()).rejects.toThrow();
  await expect(fetchGridDecimalPolicyStrict()).resolves.toEqual({});
});

it('rejects an incomplete module policy instead of enabling a mismatched save', async () => {
  vi.mocked(apiGet).mockResolvedValue({ item: { SALES: { number: { places: 0 } } } });
  await expect(fetchGridDecimalPolicyStrict()).rejects.toThrow();
});

it('accepts both normalized legacy and per-type policies', async () => {
  const rule = { places: 3, rounding: 'DOWN', trailingZeros: 'AUTO' };
  const item = { OLD: rule, SALES: { number: { ...rule, places: 0 }, decimal: rule, currency: rule } };
  vi.mocked(apiGet).mockResolvedValue({ item });
  await expect(fetchGridDecimalPolicyStrict()).resolves.toEqual(item);
});
