import type { KeyboardEvent, MouseEvent } from 'react';
import { Box } from '@mui/material';
import { GridRow } from './GridRow';
import type { F1GridColumn, F1GridRowId } from '../types/grid.types';

type GridBodyProps<T extends object> = {
  visibleRows: T[];
  columns: F1GridColumn<T>[];
  rowKey: keyof T;
  columnLine: boolean;
  columnWidths?: Record<string, number>;
  defaultRowHeight: number;
  minRowHeight: number;
  maxRowHeight: number;
  rowHeights: Record<string, number>;
  resizableRows: boolean;
  selectedIds: F1GridRowId[];
  focusedCell?: { rowId: F1GridRowId; columnIndex: number };
  editingCell?: { rowId: F1GridRowId; columnIndex: number };
  draftValue: string;
  mergeInfoByColumn: Array<
    Array<{ isStart: boolean; span: number } | undefined>
  >;
  getRowId: (row: T) => F1GridRowId;
  onSelectRow: (rowId: F1GridRowId, event: MouseEvent<HTMLElement>) => void;
  onSetRowSelection: (rowId: F1GridRowId, checked: boolean) => void;
  onSetFocusedCell: (cell: { rowId: F1GridRowId; columnIndex: number }) => void;
  onStartEdit: (rowId: F1GridRowId, columnIndex: number) => void;
  onDraftChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  onUpdateRow: (rowId: F1GridRowId, field: keyof T, value: unknown) => void;
  onPatchRow: (rowId: F1GridRowId, changes: Partial<T>) => void;
  getCellError: (rowId: F1GridRowId, field: keyof T) => string | undefined;
  onStopEdit: () => void;
  onCellRef: (
    rowId: F1GridRowId,
    columnIndex: number,
    node: HTMLElement | null,
  ) => void;
  onEditingCellRef: (node: HTMLElement | null) => void;
  onUpdateRowHeight: (rowId: F1GridRowId, height: number) => void;
  getPinOffset: (
    column: F1GridColumn<T>,
  ) => { side: 'left' | 'right'; offset: number } | undefined;
};

function getStateKey(rowId: F1GridRowId): string {
  return String(rowId);
}

function getMergeGroupStart<T extends object>(
  rows: T[],
  rowIndex: number,
  field: keyof T,
): number {
  let start = rowIndex;
  while (
    start > 0 &&
    Object.is(rows[start - 1][field], rows[rowIndex][field])
  ) {
    start -= 1;
  }
  return start;
}

export function GridBody<T extends object>({
  visibleRows,
  columns,
  rowKey,
  columnLine,
  columnWidths,
  defaultRowHeight,
  minRowHeight,
  maxRowHeight,
  rowHeights,
  resizableRows,
  selectedIds,
  focusedCell,
  editingCell,
  draftValue,
  mergeInfoByColumn,
  getRowId,
  onSelectRow,
  onSetRowSelection,
  onSetFocusedCell,
  onStartEdit,
  onDraftChange,
  onKeyDown,
  onUpdateRow,
  onPatchRow,
  getCellError,
  onStopEdit,
  onCellRef,
  onEditingCellRef,
  onUpdateRowHeight,
  getPinOffset,
}: GridBodyProps<T>) {
  function getMergeEditing(rowIndex: number, columnIndex: number): boolean {
    const column = columns[columnIndex];
    if (
      !column.mergeRows ||
      !editingCell ||
      editingCell.columnIndex !== columnIndex
    ) {
      return false;
    }

    const editingRowIndex = visibleRows.findIndex(
      (item) => getRowId(item) === editingCell.rowId,
    );

    if (editingRowIndex < 0) return false;

    return (
      getMergeGroupStart(visibleRows, rowIndex, column.field) ===
      getMergeGroupStart(visibleRows, editingRowIndex, column.field)
    );
  }

  function getMerged(
    rowIndex: number,
    columnIndex: number,
    value: unknown,
  ): boolean {
    const column = columns[columnIndex];
    const mergeEditing = getMergeEditing(rowIndex, columnIndex);
    const editing =
      editingCell?.rowId === getRowId(visibleRows[rowIndex]) &&
      editingCell?.columnIndex === columnIndex;

    return Boolean(
      column.mergeRows &&
      rowIndex > 0 &&
      !mergeEditing &&
      !editing &&
      Object.is(visibleRows[rowIndex - 1][column.field], value),
    );
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `44px ${columns
          .map(
            (column) =>
              `${columnWidths?.[String(column.field)] ?? column.width ?? 140}px`,
          )
          .join(' ')}`,
        gridTemplateRows: visibleRows
          .map(
            (row) =>
              `${rowHeights[String(getRowId(row))] ?? defaultRowHeight}px`,
          )
          .join(' '),
        minWidth: 'max-content',
      }}
    >
      {visibleRows.map((row, rowIndex) => {
        const rowId = getRowId(row);
        const isSelected = selectedIds.includes(rowId);

        return (
          <GridRow
            key={getStateKey(rowId)}
            row={row}
            rowId={rowId}
            rowIndex={rowIndex}
            columns={columns}
            columnLine={columnLine}
            isSelected={isSelected}
            focusedCell={focusedCell}
            editingCell={editingCell}
            draftValue={draftValue}
            mergeInfoByColumn={mergeInfoByColumn}
            visibleRows={visibleRows}
            rowKey={rowKey}
            onSelectRow={onSelectRow}
            onSetRowSelection={onSetRowSelection}
            onSetFocusedCell={onSetFocusedCell}
            onStartEdit={onStartEdit}
            onDraftChange={onDraftChange}
            onKeyDown={onKeyDown}
            onUpdateCell={(field, value) => onUpdateRow(rowId, field, value)}
            onUpdateRow={(changes) => onPatchRow(rowId, changes)}
            getCellError={getCellError}
            onStopEdit={onStopEdit}
            onCellRef={onCellRef}
            onEditingCellRef={onEditingCellRef}
            rowHeight={rowHeights[String(rowId)] ?? defaultRowHeight}
            defaultRowHeight={defaultRowHeight}
            minRowHeight={minRowHeight}
            maxRowHeight={maxRowHeight}
            resizableRows={resizableRows}
            onUpdateRowHeight={onUpdateRowHeight}
            getMergeEditing={(columnIndex) =>
              getMergeEditing(rowIndex, columnIndex)
            }
            getMerged={(ri, ci, val) => getMerged(ri, ci, val)}
            getPinOffset={getPinOffset}
          />
        );
      })}
    </Box>
  );
}
