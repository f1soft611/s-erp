import type { F1GridColumn } from '../f1Grid.types';

export function isCellEditable<T extends object>(
  column: F1GridColumn<T>,
  row: T,
): boolean {
  return typeof column.editable === 'function'
    ? column.editable(row)
    : Boolean(column.editable);
}

export function getCellDisplayValue<T extends object>(
  column: F1GridColumn<T>,
  value: T[keyof T],
): string {
  if (column.type === 'select') {
    return (
      column.options?.find((option) => Object.is(option.value, value))?.label ??
      String(value ?? '')
    );
  }

  return String(value ?? '');
}
