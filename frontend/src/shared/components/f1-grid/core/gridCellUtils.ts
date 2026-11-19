export function getGridCellBottomBorder(
  isLastRow: boolean | undefined,
  merged: boolean,
  isMergeStart: boolean | undefined,
  mergeSpan?: number,
  mergeEndsAtLastRow = false,
) {
  if (merged && !isMergeStart) return 0;
  if (isLastRow || mergeEndsAtLastRow) return 1;
  if (isMergeStart && mergeSpan && mergeSpan > 1) return 0;
  return undefined;
}
