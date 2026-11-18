import type { F1GridColumn } from '../types/grid.types';
import { normalizeDateInput } from '../editing/DateEditor';

export function parseGridTsv(value: string): string[][] {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((line, index, lines) => line !== '' || index < lines.length - 1)
    .map((line) => line.split('\t'));
}

export function toGridTsv<T extends object>(
  rows: T[],
  columns: F1GridColumn<T>[],
): string {
  return rows
    .map((row) =>
      columns.map((column) => String(row[column.field] ?? '')).join('\t'),
    )
    .join('\n');
}

export function coerceClipboardValue<T extends object>(
  value: string,
  column: F1GridColumn<T>,
): unknown {
  if (column.type === 'checkbox') {
    return ['true', '1', 'y'].includes(value.trim().toLowerCase());
  }

  if (
    column.type === 'number' ||
    column.type === 'decimal' ||
    column.type === 'currency'
  ) {
    if (value.trim() === '') return '';

    const numericValue = Number(value.replace(/,/g, ''));
    return Number.isFinite(numericValue) ? numericValue : undefined;
  }

  if (column.type === 'date') {
    if (value.trim() === '') return '';
    // 유효하지 않은 날짜는 undefined로 반환해 붙여넣기에서 제외한다.
    return normalizeDateInput(value) || undefined;
  }

  return value;
}
