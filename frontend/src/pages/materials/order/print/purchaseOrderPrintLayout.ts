import type { PurchaseOrderPrintDetail } from './types/purchaseOrderPrint.types';

/** 한 페이지의 품목 줄 수(사용자 제공 발주서 양식 기준) */
export const ROWS_PER_PAGE = 24;
const NAME_CHARS_PER_LINE = 34;

const text = (value: string | null | undefined) => (value && value.trim() ? value : '-');

/** 품명이 길면 여러 줄을 차지하므로 페이지 분할에 줄 수를 반영한다. */
export function rowLines(row: PurchaseOrderPrintDetail): number {
  const label = `${text(row.materialName)} [${text(row.materialSpec)}]`;
  return Math.max(1, Math.ceil(label.length / NAME_CHARS_PER_LINE));
}

/** 줄 수 기준으로 품목을 페이지에 나눈다. 빈 발주도 한 페이지는 만든다. */
export function paginateRows(rows: PurchaseOrderPrintDetail[]): PurchaseOrderPrintDetail[][] {
  const pages: PurchaseOrderPrintDetail[][] = [[]];
  let used = 0;
  for (const row of rows) {
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
