import type { StatementDetail } from '../types/salesStatement.types';

export const ROWS_PER_PAGE = 12;
export const text = (value: string | null | undefined) => value || '-';
export const amount = (value: number) => Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 2 });
export const rowLines = (row: StatementDetail) =>
  Math.max(1, Math.ceil(`${text(row.materialName)} [${text(row.materialSpec)}] ${text(row.materialCode)}`.length / 25));

export const emptyPrintRowCount = (rows: StatementDetail[]) =>
  Math.max(0, ROWS_PER_PAGE - rows.reduce((sum, row) => sum + rowLines(row), 0));

export function amountInKorean(value: number): string {
  const number = Number(value);
  if (!Number.isSafeInteger(number)) return '';
  if (number === 0) return '영원 정';
  const digits = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
  const units = ['', '십', '백', '천'];
  const groups = ['', '만', '억', '조'];
  let rest = Math.abs(number);
  let result = '';
  for (let group = 0; rest > 0; group += 1) {
    let part = rest % 10000;
    rest = Math.floor(rest / 10000);
    let word = '';
    for (let place = 0; part > 0; place += 1) {
      const digit = part % 10;
      part = Math.floor(part / 10);
      if (digit) word = (digit === 1 && place > 0 ? '' : digits[digit]) + units[place] + word;
    }
    if (word) result = word + groups[group] + result;
  }
  return `${number < 0 ? '마이너스 ' : ''}${result}원 정`;
}

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
