import { expect, it } from 'vitest';
import { validateGridRow } from '../src/shared/components/f1-grid/validation/GridValidation';
import type { F1GridColumn } from '../src/shared/components/f1-grid';

it('compares exact decimal values against numeric bounds without losing fractional digits', () => {
  const max: F1GridColumn<{ amount: string }>[] = [{
    field: 'amount', headerName: '금액', type: 'decimal', exactDecimal: true, max: 1234567890123.1,
  }];
  const min: F1GridColumn<{ amount: string }>[] = [{
    field: 'amount', headerName: '금액', type: 'decimal', exactDecimal: true, min: 1234567890123.1,
  }];
  expect(validateGridRow({ amount: '1234567890123.100001' }, max)).toHaveProperty('amount');
  expect(validateGridRow({ amount: '1234567890123.099999' }, min)).toHaveProperty('amount');
  expect(validateGridRow({ amount: '1234567890123.100000' }, max)).toEqual({});
});

it('compares exact values against bounds represented as exponential numbers', () => {
  const columns: F1GridColumn<{ amount: string }>[] = [{
    field: 'amount', headerName: '금액', type: 'decimal', exactDecimal: true, min: 1e-7,
  }];
  expect(validateGridRow({ amount: '0.000000099999999999999999' }, columns)).toHaveProperty('amount');
  expect(validateGridRow({ amount: '0.0000001' }, columns)).toEqual({});
});
