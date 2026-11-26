import { afterEach, expect, it, vi } from 'vitest';
import * as decimalColumns from '../src/shared/services/decimalColumnContract';
import { createStatementSourceColumns } from '../src/pages/sales/shipment/statement/create/data/statementSourceColumns';

afterEach(() => vi.restoreAllMocks());

it('turns a contract column into grid options with its type and column exceptions', () => {
  vi.spyOn(decimalColumns, 'getDecimalColumnContract').mockReturnValue({
    qty: { type: 'number', places: 2, rounding: 'DOWN' }, plain: { type: 'decimal' },
  });
  const contract = decimalColumns.getDecimalColumnContract('doc');
  expect(decimalColumns.decimalColumnOptions(contract, 'qty'))
    .toEqual({ type: 'number', decimal: { places: 2, rounding: 'DOWN' } });
  expect(decimalColumns.decimalColumnOptions(contract, 'plain')).toEqual({ type: 'decimal', decimal: {} });
  expect(() => decimalColumns.decimalColumnOptions(contract, 'missing')).toThrow('Unknown decimal contract field');
});

it('lets a contract exception on the delivery total reach the statement source grid column', () => {
  vi.spyOn(decimalColumns, 'getDecimalColumnContract').mockReturnValue({
    deliveryTotal: { type: 'currency', places: 1, rounding: 'DOWN' },
  });
  const total = createStatementSourceColumns().find((column) => column.field === 'totalAmt');
  expect(total).toMatchObject({ type: 'currency', decimal: { places: 1, rounding: 'DOWN' }, exactDecimal: true });
});
