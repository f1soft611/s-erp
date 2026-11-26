import { afterEach, expect, it, vi } from 'vitest';
import { createRevenueClosingColumns } from '../src/pages/sales/revenue/closing/components/RevenueClosingDetailGrid';
import * as decimalColumns from '../src/shared/services/decimalColumnContract';

afterEach(() => vi.restoreAllMocks());

const columnOf = (field: string) => createRevenueClosingColumns().find((column) => column.field === field);

it('follows the delivery contract columns without exceptions by default', () => {
  expect(columnOf('quantity')).toMatchObject({ type: 'number', decimal: {}, exactDecimal: true });
  expect(columnOf('salesAmount')).toMatchObject({ type: 'currency', decimal: {}, exactDecimal: true });
  expect(columnOf('vatAmount')).toMatchObject({ type: 'currency', decimal: {}, exactDecimal: true });
  expect(columnOf('totalAmount')).toMatchObject({ type: 'currency', decimal: {}, exactDecimal: true });
});

it('applies the delivery contract exceptions of the matching fields to the closing columns', () => {
  vi.spyOn(decimalColumns, 'getDecimalColumnContract').mockReturnValue({
    deliveryQty: { type: 'number', places: 1, rounding: 'DOWN' },
    unitPrice: { type: 'decimal' },
    supplyAmt: { type: 'currency', places: 1, rounding: 'DOWN' },
    vatAmt: { type: 'currency', places: 0, rounding: 'UP' },
    totalAmt: { type: 'currency', places: 3, trailingZeros: 'AUTO' },
    deliveryTotal: { type: 'currency' },
  });
  expect(columnOf('quantity')).toMatchObject({ type: 'number', decimal: { places: 1, rounding: 'DOWN' } });
  expect(columnOf('salesAmount')).toMatchObject({ decimal: { places: 1, rounding: 'DOWN' } });
  expect(columnOf('vatAmount')).toMatchObject({ decimal: { places: 0, rounding: 'UP' } });
  expect(columnOf('totalAmount')).toMatchObject({ decimal: { places: 3, trailingZeros: 'AUTO' } });
});
