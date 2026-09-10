import {
  memo,
  useEffect,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { Box, Checkbox } from '@mui/material';
import { GridCell } from './GridCell';
import { GridFormActionCell } from '../form/GridFormActionCell';
import type { F1GridColumn, F1GridRowId } from '../types/grid.types';
import type {
  F1GridCellRange,
  F1GridCellRangeBounds,
} from '../selection/GridSelection';

type GridRowProps<T extends object> = {
  row: T;
  rowId: F1GridRowId;
  rowIndex: number;
  renderIndex: number;
  columns: F1GridColumn<T>[];
  renderedColumnIndexes?: Set<number>;
  columnLine: boolean;
  isSelected: boolean;
  rowHeight: number;
  defaultRowHeight: number;
  minRowHeight: number;
  maxRowHeight: number;
  resizableRows: boolean;
  focusedCell?: { rowId: F1GridRowId; columnIndex: number };
  editingCell?: { rowId: F1GridRowId; columnIndex: number };
  selectedCellRange?: F1GridCellRange;
  selectedCellRangeBounds?: F1GridCellRangeBounds;
  isCellSelectionDragging?: boolean;
  copiedCellRange?: F1GridCellRange;
  draftValue: string;
  dirtyCellMap?: Record<string, boolean>;
  mergeInfoByColumn: Array<
    Array<{ isStart: boolean; span: number } | undefined>
  >;
  visibleRows: T[];
  selectedIds: F1GridRowId[];
  rowKey: keyof T;
  onSelectRow: (rowId: F1GridRowId, event: MouseEvent<HTMLElement>) => void;
  onSetRowSelection: (rowId: F1GridRowId, checked: boolean) => void;
  onSetFocusedCell: (cell: { rowId: F1GridRowId; columnIndex: number }) => void;
  onCellSelectionStart: (cell: {
    rowId: F1GridRowId;
    columnIndex: number;
  }) => void;
  onCellSelectionDrag: (cell: {
    rowId: F1GridRowId;
    columnIndex: number;
  }) => void;
  onCellSelectionEnd: () => void;
  onCommitEdit: () => void;
  onStartEdit: (rowId: F1GridRowId, columnIndex: number) => void;
  onDraftChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  onUpdateCell: (field: keyof T, value: unknown) => void;
  onUpdateRow: (changes: Partial<T>) => void;
  getCellError: (rowId: F1GridRowId, field: keyof T) => string | undefined;
  onStopEdit: () => void;
  onCellRef: (
    rowId: F1GridRowId,
    columnIndex: number,
    node: HTMLElement | null,
  ) => void;
  onEditingCellRef: (node: HTMLElement | null) => void;
  onUpdateRowHeight: (rowId: F1GridRowId, height: number) => void;
  getMergeEditing: (columnIndex: number) => boolean;
  getMerged: (rowIndex: number, columnIndex: number, value: unknown) => boolean;
  getPinOffset: (
    column: F1GridColumn<T>,
  ) => { side: 'left' | 'right'; offset: number; shadow?: boolean } | undefined;
  cellAdornment?: (row: T, column: F1GridColumn<T>) => ReactNode;
  showCheckbox?: boolean;
  showFormAction?: boolean;
  formActionPinnedShadow?: boolean;
  onOpenRowForm?: (row: T) => void;
};

function getStateKey(rowId: F1GridRowId): string {
  return String(rowId);
}

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

const areGridRowPropsEqual = <T extends object>(
  prev: Readonly<GridRowProps<T>>,
  next: Readonly<GridRowProps<T>>,
): boolean => {
  return (
    prev.row === next.row &&
    prev.rowId === next.rowId &&
    prev.rowIndex === next.rowIndex &&
    prev.renderIndex === next.renderIndex &&
    prev.columns === next.columns &&
    prev.renderedColumnIndexes === next.renderedColumnIndexes &&
    prev.columnLine === next.columnLine &&
    prev.isSelected === next.isSelected &&
    prev.rowHeight === next.rowHeight &&
    prev.defaultRowHeight === next.defaultRowHeight &&
    prev.minRowHeight === next.minRowHeight &&
    prev.maxRowHeight === next.maxRowHeight &&
    prev.resizableRows === next.resizableRows &&
    Object.is(prev.focusedCell, next.focusedCell) &&
    Object.is(prev.editingCell, next.editingCell) &&
    Object.is(prev.selectedCellRange, next.selectedCellRange) &&
    Object.is(prev.selectedCellRangeBounds, next.selectedCellRangeBounds) &&
    prev.isCellSelectionDragging === next.isCellSelectionDragging &&
    Object.is(prev.copiedCellRange, next.copiedCellRange) &&
    prev.draftValue === next.draftValue &&
    prev.dirtyCellMap === next.dirtyCellMap &&
    prev.mergeInfoByColumn === next.mergeInfoByColumn &&
    prev.visibleRows === next.visibleRows &&
    prev.selectedIds === next.selectedIds &&
    prev.rowKey === next.rowKey &&
    Object.is(prev.getCellError, next.getCellError) &&
    prev.getMergeEditing === next.getMergeEditing &&
    prev.getMerged === next.getMerged &&
    Object.is(prev.getPinOffset, next.getPinOffset) &&
    Object.is(prev.cellAdornment, next.cellAdornment) &&
    prev.showCheckbox === next.showCheckbox &&
    prev.showFormAction === next.showFormAction &&
    prev.formActionPinnedShadow === next.formActionPinnedShadow &&
    Object.is(prev.onOpenRowForm, next.onOpenRowForm)
  );
};

const GridRowInner = <T extends object>({
  row,
  rowId,
  rowIndex,
  renderIndex,
  columns,
  renderedColumnIndexes,
  columnLine,
  isSelected,
  rowHeight,
  defaultRowHeight,
  minRowHeight,
  maxRowHeight,
  resizableRows,
  focusedCell,
  editingCell,
  selectedCellRange,
  selectedCellRangeBounds,
  isCellSelectionDragging = false,
  copiedCellRange,
  draftValue,
  dirtyCellMap = {},
  mergeInfoByColumn,
  visibleRows,
  rowKey,
  onSelectRow,
  onSetRowSelection,
  onSetFocusedCell,
  onCellSelectionStart,
  onCellSelectionDrag,
  onCellSelectionEnd,
  onCommitEdit,
  onStartEdit,
  onDraftChange,
  onKeyDown,
  onUpdateCell,
  onUpdateRow,
  getCellError,
  onStopEdit,
  onCellRef,
  onEditingCellRef,
  onUpdateRowHeight,
  getMergeEditing,
  getMerged,
  getPinOffset,
  cellAdornment,
  showCheckbox = true,
  showFormAction = false,
  formActionPinnedShadow = true,
  onOpenRowForm,
}: GridRowProps<T>) => {
    const resizeStateRef = useRef<{
      startY: number;
      startHeight: number;
    } | null>(null);

    useEffect(() => {
      function handlePointerMove(event: PointerEvent) {
        const resizeState = resizeStateRef.current;
        if (!resizeState) return;
        onUpdateRowHeight(
          rowId,
          Math.min(
            maxRowHeight,
            Math.max(
              minRowHeight,
              resizeState.startHeight + event.clientY - resizeState.startY,
            ),
          ),
        );
      }

      function handlePointerUp() {
        resizeStateRef.current = null;
      }

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };
    }, [maxRowHeight, minRowHeight, onUpdateRowHeight, rowId]);

    function isSameCell(
      first: { rowId: F1GridRowId; columnIndex: number } | undefined,
      second: { rowId: F1GridRowId; columnIndex: number },
    ) {
      return (
        first?.rowId === second.rowId &&
        first.columnIndex === second.columnIndex
      );
    }

    function isActiveMergeGroup(
      column: F1GridColumn<T>,
      columnIndex: number,
      mergeInfo: { isStart: boolean; span: number } | undefined,
    ): boolean {
      if (!column.mergeRows || !mergeInfo?.isStart || mergeInfo.span <= 1) {
        return false;
      }

      const activeCells = [focusedCell, editingCell].filter(
        (
          activeCell,
        ): activeCell is { rowId: F1GridRowId; columnIndex: number } =>
          activeCell?.columnIndex === columnIndex,
      );

      return activeCells.some((activeCell) =>
        visibleRows
          .slice(rowIndex, rowIndex + mergeInfo.span)
          .some((item) => String(item[rowKey]) === String(activeCell.rowId)),
      );
    }

    function getCell(
      rowId: F1GridRowId,
      columnIndex: number,
    ): { rowId: F1GridRowId; columnIndex: number } {
      return { rowId, columnIndex };
    }

    return (
      <Box
        key={getStateKey(rowId)}
        role="row"
        aria-selected={isSelected}
        data-f1-grid-row-id={String(rowId)}
        sx={{ display: 'contents' }}
      >
        {showCheckbox ? (
          <Box
            sx={{
              gridColumn: 1,
              gridRow: renderIndex + 1,
              display: 'flex',
              justifyContent: 'center',
              borderTop: 1,
              borderBottom: rowIndex === visibleRows.length - 1 ? 1 : 0,
              borderColor: 'divider',
              position: 'sticky',
              left: 0,
              zIndex: 6,
              backgroundColor: (theme) =>
                isSelected
                  ? theme.palette.mode === 'dark'
                    ? 'rgb(30, 48, 80)'
                    : 'rgb(232, 238, 252)'
                  : theme.palette.background.paper,
            }}
          >
            <Checkbox
              size="small"
              aria-label={`${rowId} 행 선택`}
              checked={isSelected}
              onClick={(event) => {
                event.stopPropagation();
                onSetRowSelection(rowId, !isSelected);
              }}
            />
          </Box>
        ) : null}
        {columns.map((column, columnIndex) => {
          if (
            renderedColumnIndexes &&
            !renderedColumnIndexes.has(columnIndex)
          ) {
            return null;
          }

          const cell = getCell(rowId, columnIndex);
          const editing = isSameCell(editingCell, cell);
          const focused = isSameCell(focusedCell, cell);
          const isLastRow = rowIndex === visibleRows.length - 1;
          const selectedRangeHasMultipleCells =
            !!selectedCellRange &&
            (selectedCellRange.anchor.rowId !== selectedCellRange.focus.rowId ||
              selectedCellRange.anchor.columnIndex !==
                selectedCellRange.focus.columnIndex);
          const copiedRangeHasMultipleCells =
            !!copiedCellRange &&
            (copiedCellRange.anchor.rowId !== copiedCellRange.focus.rowId ||
              copiedCellRange.anchor.columnIndex !==
                copiedCellRange.focus.columnIndex);
          const selected =
            !!selectedCellRangeBounds &&
            rowIndex >= selectedCellRangeBounds.minRowIndex &&
            rowIndex <= selectedCellRangeBounds.maxRowIndex &&
            columnIndex >= selectedCellRangeBounds.minColumnIndex &&
            columnIndex <= selectedCellRangeBounds.maxColumnIndex;
          const isSelectedRangeStart =
            selectedRangeHasMultipleCells &&
            String(rowId) === String(selectedCellRange.anchor.rowId) &&
            columnIndex === selectedCellRange.anchor.columnIndex;
          const isCopiedRangeStart =
            copiedRangeHasMultipleCells &&
            String(rowId) === String(copiedCellRange.anchor.rowId) &&
            columnIndex === copiedCellRange.anchor.columnIndex;
          const value = column.getValue?.(row) ?? row[column.field];
          const mergeEditing = getMergeEditing(columnIndex);
          const mergeInfo = mergeEditing
            ? undefined
            : mergeInfoByColumn[columnIndex]?.[rowIndex];
          const merged = getMerged(rowIndex, columnIndex, value);
          const mergeEndsAtLastRow =
            mergeInfo?.isStart &&
            mergeInfo.span > 1 &&
            rowIndex + mergeInfo.span === visibleRows.length;
          const mergeGroupActive = isActiveMergeGroup(
            column,
            columnIndex,
            mergeInfo,
          );

          return (
            <GridCell
              key={String(column.field)}
              row={row}
              rowId={rowId}
              column={column}
              columnIndex={columnIndex}
              showCheckbox={showCheckbox}
              columnLine={columnLine}
              focused={focused}
              editing={editing}
              selected={Boolean(selected)}
              selectionRangeActive={selectedRangeHasMultipleCells}
              rangeStart={isSelectedRangeStart || isCopiedRangeStart}
              merged={merged}
              mergeInfo={mergeInfo}
              mergeEndsAtLastRow={mergeEndsAtLastRow}
              mergeGroupActive={mergeGroupActive}
              rowHeight={rowHeight}
              defaultRowHeight={defaultRowHeight}
              rowIndex={rowIndex}
              renderRowIndex={renderIndex}
              isLastRow={isLastRow}
              draftValue={draftValue}
              dirtyCell={Boolean(
                dirtyCellMap[`${String(rowId)}:${String(column.field)}`],
              )}
              onFocus={() => {
                const focusRowIndex =
                  column.mergeRows && merged
                    ? getMergeGroupStartIndex(
                        visibleRows,
                        rowIndex,
                        column.field,
                      )
                    : rowIndex;
                const focusRow = visibleRows[focusRowIndex];
                onSetFocusedCell({
                  rowId: focusRow[rowKey] as F1GridRowId,
                  columnIndex,
                });
                onSelectRow(rowId, {} as MouseEvent<HTMLElement>);
              }}
              onMouseDown={(event: MouseEvent<HTMLElement>) => {
                if (event.button === 2) {
                  onSetFocusedCell(cell);
                  onSelectRow(
                    rowId,
                    event as unknown as MouseEvent<HTMLElement>,
                  );
                }
                onCellSelectionStart(cell);
              }}
              onMouseEnter={() => {
                if (selectedCellRange) onCellSelectionDrag(cell);
              }}
              onMouseUp={onCellSelectionEnd}
              onBlur={onCommitEdit}
              onDoubleClick={() => onStartEdit(rowId, columnIndex)}
              onDraftChange={onDraftChange}
              onKeyDown={onKeyDown}
              onSelectChange={(selectedValue: unknown) => {
                onDraftChange(String(selectedValue));
                onUpdateCell(column.field, selectedValue);
                onStopEdit();
              }}
              onCheckboxChange={(checked: boolean) => {
                const patch = column.onValueChange?.(row, checked);
                if (patch) {
                  onUpdateRow(patch);
                } else {
                  onUpdateCell(column.field, checked);
                }
              }}
              onCodePick={() => {
                const applyPatch = (patch: Partial<T>) => {
                  onUpdateRow(patch);
                };
                const patch = column.onOpenCodePicker?.(row, applyPatch);
                onStopEdit();
                if (patch) applyPatch(patch);
              }}
              errorMessage={getCellError(rowId, column.field)}
              onCellRef={(node: HTMLElement | null) => {
                onCellRef(rowId, columnIndex, node);
                if (editing) onEditingCellRef(node);
              }}
              pinOffset={getPinOffset(column)}
              adornment={cellAdornment?.(row, column)}
            />
          );
        })}
        {showFormAction && onOpenRowForm ? (
          <GridFormActionCell
            rowId={rowId}
            rowIndex={renderIndex}
            columnIndex={(showCheckbox ? 2 : 1) + columns.length}
            isLastRow={rowIndex === visibleRows.length - 1}
            pinnedShadow={formActionPinnedShadow}
            onEdit={() => onOpenRowForm(row)}
          />
        ) : null}
        {resizableRows ? (
          <Box
            component="button"
            type="button"
            role="button"
            aria-label={`${rowId} 행 높이 조절`}
            aria-valuemin={minRowHeight}
            aria-valuemax={maxRowHeight}
            aria-valuenow={rowHeight}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => {
              if (isCellSelectionDragging) {
                event.preventDefault();
                event.stopPropagation();
                return;
              }

              event.preventDefault();
              event.stopPropagation();
              resizeStateRef.current = {
                startY: event.clientY,
                startHeight: rowHeight,
              };
            }}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
              event.preventDefault();
              event.stopPropagation();
              const direction = event.key === 'ArrowDown' ? 4 : -4;
              onUpdateRowHeight(rowId, rowHeight + direction);
            }}
            sx={{
              gridColumn: '1 / -1',
              gridRow: renderIndex + 1,
              alignSelf: 'end',
              justifySelf: 'stretch',
              height: 6,
              minHeight: 6,
              p: 0,
              border: 0,
              bgcolor: 'transparent',
              cursor: isCellSelectionDragging ? 'default' : 'row-resize',
              pointerEvents: isCellSelectionDragging ? 'none' : 'auto',
              zIndex: 2,
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'primary.main',
              },
            }}
          />
        ) : null}
      </Box>
    );
};

export const GridRow = memo(
  GridRowInner as any,
  (prev: any, next: any) =>
    areGridRowPropsEqual(
      prev as GridRowProps<object>,
      next as GridRowProps<object>,
    ),
) as any;
