import { useEffect, useRef, type KeyboardEvent, type MouseEvent } from 'react';
import { Box, Checkbox } from '@mui/material';
import { GridCell } from './GridCell';
import type { F1GridColumn, F1GridRowId } from '../types/grid.types';

type GridRowProps<T extends object> = {
  row: T;
  rowId: F1GridRowId;
  rowIndex: number;
  columns: F1GridColumn<T>[];
  columnLine: boolean;
  isSelected: boolean;
  rowHeight: number;
  defaultRowHeight: number;
  minRowHeight: number;
  maxRowHeight: number;
  resizableRows: boolean;
  focusedCell?: { rowId: F1GridRowId; columnIndex: number };
  editingCell?: { rowId: F1GridRowId; columnIndex: number };
  draftValue: string;
  mergeInfoByColumn: Array<
    Array<{ isStart: boolean; span: number } | undefined>
  >;
  visibleRows: T[];
  rowKey: keyof T;
  onSelectRow: (rowId: F1GridRowId, event: MouseEvent<HTMLElement>) => void;
  onSetRowSelection: (rowId: F1GridRowId, checked: boolean) => void;
  onSetFocusedCell: (cell: { rowId: F1GridRowId; columnIndex: number }) => void;
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
};

function getStateKey(rowId: F1GridRowId): string {
  return String(rowId);
}

export function GridRow<T extends object>({
  row,
  rowId,
  rowIndex,
  columns,
  columnLine,
  isSelected,
  rowHeight,
  defaultRowHeight,
  minRowHeight,
  maxRowHeight,
  resizableRows,
  focusedCell,
  editingCell,
  draftValue,
  mergeInfoByColumn,
  onSelectRow,
  onSetRowSelection,
  onSetFocusedCell,
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
}: GridRowProps<T>) {
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
      first?.rowId === second.rowId && first.columnIndex === second.columnIndex
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
      sx={{ display: 'contents' }}
    >
      <Box
        sx={{
          gridColumn: 1,
          gridRow: rowIndex + 1,
          display: 'flex',
          justifyContent: 'center',
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: isSelected ? 'action.selected' : 'background.paper',
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
      {columns.map((column, columnIndex) => {
        const cell = getCell(rowId, columnIndex);
        const editing = isSameCell(editingCell, cell);
        const focused = isSameCell(focusedCell, cell);
        const value = row[column.field];
        const mergeEditing = getMergeEditing(columnIndex);
        const mergeInfo = mergeEditing
          ? undefined
          : mergeInfoByColumn[columnIndex]?.[rowIndex];
        const merged = getMerged(rowIndex, columnIndex, value);

        return (
          <GridCell
            key={String(column.field)}
            row={row}
            rowId={rowId}
            column={column}
            columnIndex={columnIndex}
            columnLine={columnLine}
            focused={focused}
            editing={editing}
            merged={merged}
            mergeInfo={mergeInfo}
            rowHeight={rowHeight}
            defaultRowHeight={defaultRowHeight}
            rowIndex={rowIndex}
            draftValue={draftValue}
            onFocus={() => {
              onSetFocusedCell(cell);
              onSelectRow(rowId, {} as MouseEvent<HTMLElement>);
            }}
            onDoubleClick={() => onStartEdit(rowId, columnIndex)}
            onDraftChange={onDraftChange}
            onKeyDown={onKeyDown}
            onSelectChange={(selectedValue) => {
              onDraftChange(String(selectedValue));
              onUpdateCell(column.field, selectedValue);
              onStopEdit();
            }}
            onCheckboxChange={(checked) => {
              onUpdateCell(column.field, checked);
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
            onCellRef={(node) => {
              onCellRef(rowId, columnIndex, node);
              if (editing) onEditingCellRef(node);
            }}
          />
        );
      })}
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
            gridRow: rowIndex + 1,
            alignSelf: 'end',
            justifySelf: 'stretch',
            height: 6,
            minHeight: 6,
            p: 0,
            border: 0,
            bgcolor: 'transparent',
            cursor: 'row-resize',
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
}
