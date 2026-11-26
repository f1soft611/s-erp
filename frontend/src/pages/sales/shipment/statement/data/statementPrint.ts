import type { StatementDetail } from '../types/salesStatement.types';
import { addExactSalesDecimals, addSalesOrderAmounts, formatSalesOrderAmount, type SalesAmountRule } from '../../../order/create/data/salesOrderAmounts';

export const ROWS_PER_PAGE = 12;
export const text = (value: string | null | undefined) => value || '-';
export const amount = (value: number | string, rule?: SalesAmountRule) => formatSalesOrderAmount(value, rule);
export function printSum(values: (number | string)[], rule?: SalesAmountRule): number | string | undefined {
  try {
    if (values.some((value) => typeof value === 'string')) {
      return values.reduce<string>((sum, value) => addExactSalesDecimals(sum, String(value),
        { places: 6, rounding: 'HALF_UP' }), '0');
    }
    if (!rule) return values.reduce<number>((sum, value) => sum + Number(value), 0);
    return values.reduce<number>((sum, value) => addSalesOrderAmounts(sum, Number(value),
      { places: 6, rounding: 'HALF_UP' }, '인쇄 합계'), 0);
  } catch {
    return undefined;
  }
}
export const rowLines = (row: StatementDetail) =>
  Math.max(1, Math.ceil(`${text(row.materialName)} [${text(row.materialSpec)}] ${text(row.materialCode)}`.length / 25));

export const emptyPrintRowCount = (rows: StatementDetail[]) =>
  Math.max(0, ROWS_PER_PAGE - rows.reduce((sum, row) => sum + rowLines(row), 0));

export function statementPrintPages(details: StatementDetail[]): StatementDetail[][] {
  const pages: StatementDetail[][] = [[]];
  let used = 0;
  for (const row of details) {
    const lines = rowLines(row);
    if (used && used + lines > ROWS_PER_PAGE) {
      pages.push([]);
      used = 0;
    }
    pages[pages.length - 1].push(row);
    used += lines;
  }
  return pages;
}
