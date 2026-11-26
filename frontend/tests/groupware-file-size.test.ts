import { afterEach, expect, it, vi } from 'vitest';
import { formatFileSize, resolveFileSizeRule } from '../src/pages/groupware/shared/utils/formatFileSize';
import * as decimalColumns from '../src/shared/services/decimalColumnContract';

afterEach(() => vi.restoreAllMocks());

const rule = { places: 2, rounding: 'HALF_UP' as const, trailingZeros: 'FIXED' as const };

it('converts bytes to units and rounds the converted number with the policy rule', () => {
  expect(formatFileSize(512, rule)).toBe('512 B');
  expect(formatFileSize(1500, rule)).toBe('1.46 KB');
  expect(formatFileSize(1572864, rule)).toBe('1.50 MB');
  expect(formatFileSize(5 * 1024 ** 3, rule)).toBe('5.00 GB');
});

it('follows the policy places, rounding and trailing zero handling', () => {
  expect(formatFileSize(1500, { ...rule, places: 1 })).toBe('1.5 KB');
  expect(formatFileSize(1500, { ...rule, places: 0 })).toBe('1 KB');
  expect(formatFileSize(1535, { ...rule, places: 1, rounding: 'DOWN' })).toBe('1.4 KB');
  expect(formatFileSize(1572864, { ...rule, trailingZeros: 'AUTO' })).toBe('1.5 MB');
});

it('does not apply a fixed number of digits when no policy rule exists', () => {
  expect(formatFileSize(1500)).toBe('1,500 B');
  expect(resolveFileSizeRule(undefined)).toBeUndefined();
});

it('uses the groupware file contract and passes a contract exception to the size rule', () => {
  const policy = {
    number: { ...rule, places: 0 }, decimal: { ...rule, places: 2 }, currency: { ...rule, places: 2 },
  };
  expect(resolveFileSizeRule(policy)).toEqual(rule);
  vi.spyOn(decimalColumns, 'getDecimalColumnContract').mockReturnValue({
    fileSize: { type: 'decimal', places: 1, rounding: 'DOWN' },
  });
  expect(resolveFileSizeRule(policy)).toEqual({ ...rule, places: 1, rounding: 'DOWN' });
});
