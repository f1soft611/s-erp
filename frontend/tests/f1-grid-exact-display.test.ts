import { expect, it } from 'vitest';
import { getCellDisplayValue } from '../src/shared/components/f1-grid/utils/grid.utils';
import type { F1GridColumn } from '../src/shared/components/f1-grid';

it('rounds a read-only exact value according to the column policy without changing the source', () => {
  const column: F1GridColumn<{ amount: string }> = {
    field: 'amount', headerName: '금액', type: 'decimal', exactDecimal: true, decimalPlaces: 3, rounding: 'HALF_UP',
  };
  expect(getCellDisplayValue(column, '1234567890123.100501')).toBe('1,234,567,890,123.101');
  expect(getCellDisplayValue({ ...column, rounding: 'DOWN' }, '1234567890123.100501')).toBe('1,234,567,890,123.100');
  expect(getCellDisplayValue({ ...column, rounding: 'UP' }, '-1.000001')).toBe('-1.001');
});

it('retains excess input digits visibly in an editable exact column', () => {
  const column: F1GridColumn<{ amount: string }> = {
    field: 'amount', headerName: '금액', type: 'decimal', exactDecimal: true, decimalPlaces: 3, editable: true,
  };
  expect(getCellDisplayValue(column, '1.2345')).toBe('1.2345');
});
