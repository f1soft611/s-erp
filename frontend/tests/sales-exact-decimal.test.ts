import { describe, expect, it } from 'vitest';
import {
  addExactSalesDecimals,
  calculateExactSalesAmounts,
  formatExactSalesDecimal,
  isExactSalesPolicyNumber,
  sumExactSalesAmounts,
  subtractExactSalesDecimals,
} from '../src/pages/sales/order/create/data/salesOrderAmounts';

describe('sales exact decimal values', () => {
  it('calculates without losing fractional digits at the storage limit', () => {
    expect(calculateExactSalesAmounts('1', '1234567890123.100001', {
      places: 6, rounding: 'DOWN',
    })).toEqual({
      supplyAmount: '1234567890123.100001',
      vatAmount: '123456789012.310000',
      totalAmount: '1358024679135.410001',
    });
  });

  it('rounds products and VAT according to the policy', () => {
    expect(calculateExactSalesAmounts('1.234', '1.235', { places: 3, rounding: 'DOWN' }))
      .toEqual({ supplyAmount: '1.523', vatAmount: '0.152', totalAmount: '1.675' });
    expect(calculateExactSalesAmounts('1.234', '1.235', { places: 3, rounding: 'UP' }))
      .toEqual({ supplyAmount: '1.524', vatAmount: '0.153', totalAmount: '1.677' });
    expect(calculateExactSalesAmounts('1', '1.234567', { places: 6, rounding: 'HALF_UP' }))
      .toEqual({ supplyAmount: '1.234567', vatAmount: '0.123457', totalAmount: '1.358024' });
  });

  it('rounds each calculated column with its own rule after exact arithmetic', () => {
    expect(calculateExactSalesAmounts('1', '1.235', { places: 3, rounding: 'DOWN' }, {
      supplyAmount: { places: 2, rounding: 'HALF_UP' },
      vatAmount: { places: 1, rounding: 'HALF_UP' },
      totalAmount: { places: 3, rounding: 'DOWN' },
    })).toEqual({ supplyAmount: '1.24', vatAmount: '0.1', totalAmount: '1.340' });
    expect(addExactSalesDecimals('0.05', '0.05', { places: 1, rounding: 'HALF_UP' })).toBe('0.1');
  });

  it('adds and formats exact decimal strings without a number conversion', () => {
    expect(addExactSalesDecimals('1234567890123.100001', '0.000002', {
      places: 6, rounding: 'DOWN',
    })).toBe('1234567890123.100003');
    expect(formatExactSalesDecimal('1234567890123.100001', {
      places: 6, rounding: 'DOWN', trailingZeros: 'AUTO',
    })).toBe('1,234,567,890,123.100001');
    expect(formatExactSalesDecimal('1.2', {
      places: 3, rounding: 'DOWN', trailingZeros: 'FIXED',
    })).toBe('1.200');
  });

  it('displays a stored value even when policy rounding carries into an extra integer digit', () => {
    expect(formatExactSalesDecimal('9999999999999.999999', {
      places: 0, rounding: 'HALF_UP',
    })).toBe('10,000,000,000,000');
  });

  it('sums exact line amounts without discarding fractional digits', () => {
    expect(sumExactSalesAmounts([
      { supplyAmount: '1234567890123.100001', vatAmount: '1.000001', totalAmount: '1234567890124.100002' },
      { supplyAmount: '0.000002', vatAmount: '0.000001', totalAmount: '0.000003' },
    ], { places: 6, rounding: 'DOWN' })).toEqual({
      supplyAmount: '1234567890123.100003',
      vatAmount: '1.000002',
      totalAmount: '1234567890124.100005',
    });
  });

  it('sums all line values before applying the summary column rules', () => {
    const lines = [
      { supplyAmount: '0.05', vatAmount: '0.05', totalAmount: '0.10' },
      { supplyAmount: '0.05', vatAmount: '0.05', totalAmount: '0.10' },
    ];
    expect(sumExactSalesAmounts(lines, { places: 3, rounding: 'DOWN' }, {
      supplyAmount: { places: 1, rounding: 'HALF_UP' },
      vatAmount: { places: 2, rounding: 'DOWN' },
      totalAmount: { places: 3, rounding: 'DOWN' },
    })).toEqual({ supplyAmount: '0.1', vatAmount: '0.10', totalAmount: '0.200' });
  });

  it('subtracts quantities without losing small differences and clamps negatives to zero', () => {
    const rule = { places: 6, rounding: 'DOWN' as const };
    expect(subtractExactSalesDecimals('1234567890123.100001', '1234567890123.100000', rule)).toBe('0.000001');
    expect(subtractExactSalesDecimals('1', '2', rule)).toBe('0.000000');
  });

  it('rejects invalid input, excess precision, and values beyond numeric(19,6)', () => {
    expect(isExactSalesPolicyNumber('1234567890123.100001', 6)).toBe(true);
    expect(isExactSalesPolicyNumber('1.500', 0)).toBe(false);
    expect(isExactSalesPolicyNumber('1.000', 0)).toBe(true);
    expect(isExactSalesPolicyNumber('10000000000000', 6)).toBe(false);
    expect(isExactSalesPolicyNumber('-1', 6)).toBe(false);
    expect(isExactSalesPolicyNumber('invalid', 6)).toBe(false);
  });
});
