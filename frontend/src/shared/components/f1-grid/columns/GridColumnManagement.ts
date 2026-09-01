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

export function reorderGridColumns<T extends object>(
  columns: F1GridColumn<T>[],
  order: string[],
): F1GridColumn<T>[] {
  const columnsByField = new Map(
    columns.map((column) => [String(column.field), column]),
  );
  const ordered = order
    .map((field) => columnsByField.get(field))
    .filter((column): column is F1GridColumn<T> => Boolean(column));
  const orderedFields = new Set(order);
  const remaining = columns.filter(
    (column) => !orderedFields.has(String(column.field)),
  );
  return [...ordered, ...remaining];
}

export function moveGridColumnOrder(
  order: string[],
  sourceField: string,
  targetField: string,
): string[] {
  if (sourceField === targetField) return order;
  const withoutSource = order.filter((field) => field !== sourceField);
  const targetIndex = withoutSource.indexOf(targetField);
  if (targetIndex < 0) return order;
  return [
    ...withoutSource.slice(0, targetIndex),
    sourceField,
    ...withoutSource.slice(targetIndex),
  ];
}
