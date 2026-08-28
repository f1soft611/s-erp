import type { F1GridColumn } from '../types/grid.types';

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
