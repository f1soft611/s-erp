import type { F1GridRowId } from '../types/grid.types';

type SelectionIntent = {
  ctrlKey?: boolean;
  shiftKey?: boolean;
  visibleRowIds?: F1GridRowId[];
};

export function getSelectedRowIds(
  selectedIds: F1GridRowId[],
  rowId: F1GridRowId,
  intent: SelectionIntent,
): F1GridRowId[] {
  if (intent.shiftKey && intent.visibleRowIds) {
    const anchorIndex = intent.visibleRowIds.findIndex(
      (candidate) => candidate === selectedIds.at(-1),
    );
    const rowIndex = intent.visibleRowIds.findIndex(
      (candidate) => candidate === rowId,
    );

    if (anchorIndex >= 0 && rowIndex >= 0) {
      return intent.visibleRowIds.slice(
        Math.min(anchorIndex, rowIndex),
        Math.max(anchorIndex, rowIndex) + 1,
      );
    }
  }

  if (intent.ctrlKey) {
    return selectedIds.includes(rowId)
      ? selectedIds.filter((candidate) => candidate !== rowId)
      : [...selectedIds, rowId];
  }

  return [rowId];
}
