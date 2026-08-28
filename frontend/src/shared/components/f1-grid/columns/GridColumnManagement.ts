import type { F1GridColumn } from '../types/grid.types';

export function getVisibleGridColumns<T extends object>(
  columns: F1GridColumn<T>[],
  hiddenFields: Set<string>,
): F1GridColumn<T>[] {
  return columns.filter((column) => !hiddenFields.has(String(column.field)));
}

export function canHideGridColumn<T extends object>(
  visibleColumns: F1GridColumn<T>[],
  column: F1GridColumn<T>,
): boolean {
  return visibleColumns.length > 1 && visibleColumns.includes(column);
}
