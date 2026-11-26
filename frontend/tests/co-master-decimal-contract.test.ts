import { afterEach, expect, it, vi } from 'vitest';
import { createItemPartnerPriceColumns } from '../src/pages/co/master/item-partner-prices/components/itemPartnerPriceGridModel';
import { createMaterialColumns } from '../src/pages/co/master/materials/data/materialGridData';
import * as decimalColumns from '../src/shared/services/decimalColumnContract';

afterEach(() => vi.restoreAllMocks());

const priceColumn = (field: string) => createItemPartnerPriceColumns(true).find((column) => column.field === field);
const materialColumn = (field: string) => createMaterialColumns(true).find((column) => column.field === field);

it('uses the contract types for the item price and material quantity, price and weight columns', () => {
  expect(priceColumn('unitPrice')).toMatchObject({ type: 'decimal', decimal: {} });
  expect(priceColumn('foreignUnitPrice')).toMatchObject({ type: 'decimal', decimal: {} });
  expect(materialColumn('materialWeight')).toMatchObject({ type: 'number', decimal: {} });
  expect(materialColumn('safeInvoice')).toMatchObject({ type: 'number', decimal: {} });
  expect(materialColumn('expiryedCount')).toMatchObject({ type: 'number', decimal: {} });
});

it('does not set decimal places on the columns directly so the policy decides', () => {
  for (const column of [priceColumn('unitPrice'), priceColumn('foreignUnitPrice'),
    materialColumn('materialWeight'), materialColumn('safeInvoice'), materialColumn('expiryedCount')]) {
    expect(column?.decimalPlaces).toBeUndefined();
    expect(column?.rounding).toBeUndefined();
    expect(column?.trailingZeros).toBeUndefined();
  }
});

it('passes a contract exception of the unit price column to the grid', () => {
  vi.spyOn(decimalColumns, 'getDecimalColumnContract').mockReturnValue({
    unitPrice: { type: 'decimal', places: 2, rounding: 'DOWN' },
    foreignUnitPrice: { type: 'decimal' },
  });
  expect(priceColumn('unitPrice')).toMatchObject({ decimal: { places: 2, rounding: 'DOWN' } });
  expect(priceColumn('foreignUnitPrice')).toMatchObject({ decimal: {} });
});
