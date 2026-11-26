import { describe, expect, it } from 'vitest';
import { getDecimalColumnContract, resolveDecimalColumn, type DecimalColumn } from '../src/shared/services/decimalColumnContract';

describe('shared decimal column contract', () => {
  const policy = {
    number: { places: 0, rounding: 'DOWN' as const, trailingZeros: 'FIXED' as const },
    decimal: { places: 6, rounding: 'UP' as const, trailingZeros: 'AUTO' as const },
    currency: { places: 3, rounding: 'DOWN' as const, trailingZeros: 'FIXED' as const },
  };

  it('uses the column override only for its specified properties', () => {
    expect(resolveDecimalColumn({ type: 'currency', places: 2, rounding: 'HALF_UP' }, policy)).toEqual({
      places: 2, rounding: 'HALF_UP', trailingZeros: 'FIXED',
    });
    expect(resolveDecimalColumn({ type: 'decimal', trailingZeros: 'FIXED' }, policy)).toEqual({
      places: 6, rounding: 'UP', trailingZeros: 'FIXED',
    });
  });

  it('preserves legacy module policies for unspecified column properties', () => {
    expect(resolveDecimalColumn({ type: 'number', places: 2 },
      { places: 3, rounding: 'DOWN', trailingZeros: 'AUTO' })).toEqual({
      places: 2, rounding: 'DOWN', trailingZeros: 'AUTO',
    });
  });

  it('uses the shared document contract and rejects unknown documents', () => {
    expect(getDecimalColumnContract('sales.order').unitPrice).toEqual({ type: 'decimal' });
    expect(() => getDecimalColumnContract('unknown')).toThrow();
  });

  it('rejects invalid column definitions instead of falling back to policy', () => {
    const invalid = [
      { type: 'wrong' }, { type: 'number', places: 7 }, { type: 'number', places: 1.5 },
      { type: 'number', places: null }, { type: 'number', rounding: 'wrong' },
      { type: 'number', trailingZeros: 'wrong' }, { type: 'number', extra: 1 },
    ];
    for (const column of invalid) {
      expect(() => resolveDecimalColumn(column as DecimalColumn, policy)).toThrow();
    }
  });
});
