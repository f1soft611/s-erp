import type { F1GridColumn } from '../types/grid.types';
import { getCellDisplayValue, getGridDateValue } from '../utils/grid.utils';

type ExportCellValue = string | number | boolean | Date | null;

type ExportCell = {
  value: ExportCellValue;
  numFmt?: string;
};

const DECIMAL_VALUE_PATTERN =
  /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;

function getNumberOrText(value: unknown): number | string {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : String(value);
  }

  if (typeof value === 'string' && DECIMAL_VALUE_PATTERN.test(value)) {
    const number = Number(value);
    return Number.isFinite(number) ? number : value;
  }

  return String(value);
}

function getDateTimeValue(value: unknown): Date | undefined {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : new Date(value.getTime());
  }
  if (typeof value !== 'string' || !getGridDateValue(value)) return undefined;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function getTimeValue(
  value: unknown,
): { value: number; numFmt: string } | undefined {
  if (typeof value !== 'string') return undefined;
  const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
  if (!match) return undefined;

  const seconds =
    Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3] ?? 0);
  return {
    value: seconds / 86400,
    numFmt: match[3] ? 'hh:mm:ss' : 'hh:mm',
  };
}

function getBooleanOrText(value: unknown): boolean | string {
  if (typeof value === 'boolean') return value;
  if (value === 1) return true;
  if (value === 0) return false;

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', 'y', 'yes', '1', 'on'].includes(normalized)) return true;
    if (['false', 'n', 'no', '0', 'off'].includes(normalized)) return false;
  }

  return String(value);
}

function getNumericFormat<T extends object>(
  column: Pick<F1GridColumn<T>, 'format' | 'decimalPlaces'>,
): string {
  const decimalPlaces =
    column.decimalPlaces !== undefined &&
    Number.isInteger(column.decimalPlaces)
      ? Math.max(0, column.decimalPlaces)
      : undefined;
  const digits =
    decimalPlaces === undefined
      ? column.format === 'currency'
        ? ''
        : '###'
      : '0'.repeat(decimalPlaces);
  const numberFormat = digits ? `#,##0.${digits}` : '#,##0';

  return column.format === 'currency'
    ? `"₩"${numberFormat}`
    : numberFormat;
}

function getExcelDateFormat(format?: string): string {
  const source = format || 'yyyy-mm-dd';
  const tokens = source.match(/\[[^\]]*\]|yyyy|yy|mm|m|dd|d/gi) ?? [];
  let result = '';
  let cursor = 0;

  for (const token of tokens) {
    const index = source.indexOf(token, cursor);
    const literal = source.slice(cursor, index);
    if (literal) result += `"${literal.replace(/"/g, '""')}"`;
    result += token.startsWith('[')
      ? `"${token.slice(1, -1).replace(/"/g, '""')}"`
      : token.toLowerCase();
    cursor = index + token.length;
  }

  const trailingLiteral = source.slice(cursor);
  if (trailingLiteral) {
    result += `"${trailingLiteral.replace(/"/g, '""')}"`;
  }
  return result || 'yyyy-mm-dd';
}

function getTypedExcelCell<T extends object>(
  column: F1GridColumn<T>,
  rawValue: unknown,
): ExportCell {
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return { value: null };
  }

  switch (column.type) {
    case 'number':
    case 'decimal':
    case 'currency':
      return {
        value: getNumberOrText(rawValue),
        numFmt: getNumericFormat(column),
      };
    case 'date': {
      const date = getGridDateValue(rawValue);
      return date
        ? { value: date, numFmt: getExcelDateFormat(column.format) }
        : { value: String(rawValue) };
    }
    case 'datetime': {
      const date = getDateTimeValue(rawValue);
      return date
        ? { value: date, numFmt: 'yyyy-mm-dd hh:mm:ss' }
        : { value: String(rawValue) };
    }
    case 'time': {
      const time = getTimeValue(rawValue);
      return time ?? { value: String(rawValue) };
    }
    case 'checkbox':
      return { value: getBooleanOrText(rawValue) };
    case 'rownumber':
      return { value: getNumberOrText(rawValue), numFmt: '0' };
    default:
      return { value: getCellDisplayValue(column, rawValue) };
  }
}

/** 화면에 보이는 컬럼/행 기준으로 .xlsx 파일을 생성해 즉시 다운로드한다. */
export async function exportGridRowsToExcel<T extends object>(
  columns: F1GridColumn<T>[],
  rows: T[],
  fileName: string,
): Promise<void> {
  const ExcelJS = await import('exceljs');

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sheet1');
  worksheet.columns = columns.map((column) => ({
    header: column.headerName,
    key: String(column.field),
  }));
  rows.forEach((row) => {
    const cells = columns.map((column) => {
      const rawValue = column.getValue?.(row) ?? row[column.field];
      return getTypedExcelCell(column, rawValue);
    });
    const excelRow = worksheet.addRow(cells.map((cell) => cell.value));
    cells.forEach((cell, index) => {
      if (cell.numFmt) excelRow.getCell(index + 1).numFmt = cell.numFmt;
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${fileName}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
