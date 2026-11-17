import type { StatementDetail } from '../types/salesStatement.types';

export const ROWS_PER_PAGE = 12;
export const text = (value: string | null | undefined) => value || '-';
export const amount = (value: number) => Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 2 });
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
