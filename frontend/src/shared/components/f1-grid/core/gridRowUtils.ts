import type { F1GridColumn, F1GridRowId } from '../types/grid.types';

export function getMergeGroupStartIndex<T extends object>(
  rows: T[],
  rowIndex: number,
  field: keyof T,
): number {
  let startIndex = rowIndex;

  while (
    startIndex > 0 &&
    Object.is(rows[startIndex - 1][field], rows[rowIndex][field])
  ) {
    startIndex -= 1;
  }

  return startIndex;
}

export function getActiveMergeGroupStartKeys<T extends object>({
  columns,
  mergeInfoByColumn,
  visibleRows,
  rowKey,
  selectedIds,
  focusedCell,
  editingCell,
}: {
  columns: F1GridColumn<T>[];
  mergeInfoByColumn: Array<
    Array<{ isStart: boolean; span: number } | undefined>
  >;
  visibleRows: T[];
  rowKey: keyof T;
  selectedIds: F1GridRowId[];
  focusedCell?: { rowId: F1GridRowId; columnIndex: number };
  editingCell?: { rowId: F1GridRowId; columnIndex: number };
}): Set<string> {
  const activeKeys = new Set<string>();
  const rowIds = new Set<string>(
    [editingCell?.rowId, focusedCell?.rowId, ...selectedIds]
      .filter((rowId): rowId is F1GridRowId => rowId !== undefined)
      .map(String),
  );

  rowIds.forEach((rowId) => {
    const rowIndex = visibleRows.findIndex(
      (item) => String(item[rowKey]) === rowId,
    );
    if (rowIndex < 0) return;

    columns.forEach((column, columnIndex) => {
      if (!column.mergeRows) return;

      const groupStartIndex = getMergeGroupStartIndex(
        visibleRows,
        rowIndex,
        column.field,
      );
      const groupStartInfo = mergeInfoByColumn[columnIndex]?.[groupStartIndex];

      if (groupStartInfo && groupStartInfo.span > 1) {
        activeKeys.add(`${columnIndex}:${groupStartIndex}`);
      }
    });
  });

  return activeKeys;
}
