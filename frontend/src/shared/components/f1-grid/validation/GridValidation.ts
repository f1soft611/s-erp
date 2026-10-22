import type { F1GridColumn } from '../types/grid.types';
import { isF1GridInputDigitCountValid } from '../editing/inputFormat';

function buildInputFormatErrorMessage<T extends object>(
  headerName: string,
  column: F1GridColumn<T>,
) {
  const inputFormat = column.inputFormat;
  if (!inputFormat) return '';

  if (inputFormat.type === 'digits' && inputFormat.validDigitCounts?.length) {
    const expectedLengths = [...new Set(inputFormat.validDigitCounts)]
      .sort((left, right) => left - right)
      .join(' 또는 ');
    return `${headerName}은(는) ${expectedLengths}자리여야 합니다.`;
  }

  if (inputFormat.type === 'korean-phone') {
    return `${headerName}은(는) 02는 9자리 또는 10자리, 그 외는 10자리 또는 11자리여야 합니다.`;
  }

  return '';
}

export function validateGridRow<T extends object>(
  row: T,
  columns: F1GridColumn<T>[],
): Record<string, string> {
  const errors: Record<string, string> = {};

  columns.forEach((column) => {
    const value = row[column.field];
    const key = String(column.field);
    const isEmpty =
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '');

    if (column.required && isEmpty) {
      errors[key] = `${column.headerName}은(는) 필수입니다.`;
      return;
    }

    if (!isEmpty && typeof value === 'string' && column.inputFormat) {
      if (!isF1GridInputDigitCountValid(value, column.inputFormat)) {
        errors[key] = buildInputFormatErrorMessage(column.headerName, column);
        return;
      }
    }

    const numericValue = Number(value);
    if (
      column.min !== undefined &&
      Number.isFinite(numericValue) &&
      numericValue < column.min
    ) {
      errors[key] =
        `${column.headerName}은(는) ${column.min} 이상이어야 합니다.`;
      return;
    }

    if (
      column.max !== undefined &&
      Number.isFinite(numericValue) &&
      numericValue > column.max
    ) {
      errors[key] = `${column.headerName}은(는) ${column.max} 이하여야 합니다.`;
      return;
    }

    const customResult = column.validate?.(value, row);
    if (typeof customResult === 'string') errors[key] = customResult;
    if (customResult === false)
      errors[key] = `${column.headerName} 값이 올바르지 않습니다.`;
  });

  return errors;
}
