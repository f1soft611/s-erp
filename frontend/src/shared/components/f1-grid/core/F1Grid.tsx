import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ForwardedRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type Ref,
} from 'react';
import { Box } from '@mui/material';
import { GridHeader } from './GridHeader';
import { GridBody } from './GridBody';
import {
  addGridRow,
  createGridData,
  duplicateGridRows,
  getGridChanges,
  markRowsDeleted,
  restoreGridRows,
  updateGridRow,
  type F1GridData,
} from '../state/GridState';
import type {
  F1GridChanges,
  F1GridColumn,
  F1GridRef,
  F1GridRowId,
} from '../types/grid.types';
import { getNextEditableCell } from '../keyboard/GridKeyboard';
import { getSelectedRowIds as resolveSelectedRowIds } from '../selection/GridSelection';
import { getGridMergeInfo } from '../merge/GridRowMerge';
import { getGridRowId, getStateKey, isCellEditable } from '../utils/grid.utils';

export type F1GridProps<T extends object> = {
  rows: T[];
  columns: F1GridColumn<T>[];
  rowKey: keyof T;
  ariaLabel?: string;
  columnLine?: boolean;
  createRow?: () => T;
  createDuplicate?: (row: T) => T;
  onChangesChange?: (changes: F1GridChanges<T>) => void;
};

type F1GridCell = {
  rowId: F1GridRowId;
  columnIndex: number;
};

function F1GridInner<T extends object>(
  {
    rows,
    columns,
    rowKey,
    ariaLabel = 'F1-GRID',
    columnLine = false,
    createRow,
    createDuplicate,
    onChangesChange,
  }: F1GridProps<T>,
  ref: ForwardedRef<F1GridRef<T>>,
) {
  const [data, setData] = useState<F1GridData<T>>(() =>
    createGridData(rows, rowKey),
  );
  const lastRowsPropRef = useRef(rows);
  const [selectedIds, setSelectedIds] = useState<F1GridRowId[]>([]);
  const [lastSelectedRowId, setLastSelectedRowId] = useState<F1GridRowId>();
  const [focusedCell, setFocusedCell] = useState<F1GridCell>();
  const [editingCell, setEditingCell] = useState<F1GridCell>();
  const [draftValue, setDraftValue] = useState('');
  const editingCellNodeRef = useRef<HTMLElement | null>(null);
  const cellNodeRefs = useRef(new Map<string, HTMLElement>());

  const visibleRows = data.rows.filter(
    (row) =>
      data.stateById[getStateKey(getGridRowId(row, rowKey))] !== 'deleted',
  );
  const mergeInfoByColumn = columns.map((column) =>
    column.mergeRows ? getGridMergeInfo(visibleRows, column.field) : [],
  );

  useEffect(() => {
    if (lastRowsPropRef.current === rows) return;
    lastRowsPropRef.current = rows;
    const changes = getGridChanges(data, rowKey);
    if (
      changes.insertedRows.length === 0 &&
      changes.updatedRows.length === 0 &&
      changes.deletedRows.length === 0
    ) {
      setData(createGridData(rows, rowKey));
      setSelectedIds([]);
      setFocusedCell(undefined);
    }
  }, [data, rowKey, rows]);

  useEffect(() => {
    if (!focusedCell) return;
    cellNodeRefs.current
      .get(`${String(focusedCell.rowId)}:${focusedCell.columnIndex}`)
      ?.focus();
  }, [focusedCell]);

  useEffect(() => {
    onChangesChange?.(getGridChanges(data, rowKey));
  }, [data, onChangesChange, rowKey]);

  function getCell(rowId: F1GridRowId, columnIndex: number): F1GridCell {
    return { rowId, columnIndex };
  }

  function selectRow(rowId: F1GridRowId, event?: MouseEvent<HTMLElement>) {
    const rowIndex = visibleRows.findIndex(
      (row) => getGridRowId(row, rowKey) === rowId,
    );

    if (event?.shiftKey && lastSelectedRowId !== undefined) {
      const lastIndex = visibleRows.findIndex(
        (row) => getGridRowId(row, rowKey) === lastSelectedRowId,
      );
      const range = visibleRows
        .slice(Math.min(rowIndex, lastIndex), Math.max(rowIndex, lastIndex) + 1)
        .map((row) => getGridRowId(row, rowKey));
      setSelectedIds(range);
    } else if (event?.ctrlKey || event?.metaKey) {
      setSelectedIds((current) =>
        resolveSelectedRowIds(current, rowId, {
          ctrlKey: true,
          shiftKey: false,
        }),
      );
    } else {
      setSelectedIds([rowId]);
    }

    setLastSelectedRowId(rowId);
  }

  function setRowSelection(rowId: F1GridRowId, checked: boolean) {
    setSelectedIds((current) =>
      checked
        ? current.includes(rowId)
          ? current
          : [...current, rowId]
        : current.filter((id) => id !== rowId),
    );
    setLastSelectedRowId(rowId);
  }

  function startEdit(rowId: F1GridRowId, columnIndex: number) {
    const column = columns[columnIndex];
    const row = data.rows.find((item) => getGridRowId(item, rowKey) === rowId);

    if (
      !column ||
      !row ||
      !isCellEditable(column, row) ||
      column.type === 'checkbox'
    )
      return;

    setFocusedCell(getCell(rowId, columnIndex));
    setEditingCell(getCell(rowId, columnIndex));
    setDraftValue(String(row[column.field] ?? ''));
  }

  function stopEdit() {
    setEditingCell(undefined);
    setDraftValue('');
  }

  function commitEdit(nextCell?: F1GridCell) {
    if (!editingCell) return;

    const column = columns[editingCell.columnIndex];
    const value = column.type === 'number' ? Number(draftValue) : draftValue;
    const row = data.rows.find(
      (item) => getGridRowId(item, rowKey) === editingCell.rowId,
    );

    if (
      column &&
      row &&
      (column.type !== 'number' || !Number.isNaN(value)) &&
      !Object.is(row[column.field], value)
    ) {
      setData((current) =>
        updateGridRow(current, rowKey, editingCell.rowId, {
          [column.field]: value,
        } as Partial<T>),
      );
    }

    stopEdit();
    if (nextCell) setFocusedCell(nextCell);
  }

  function getColumnCheckboxState(column: F1GridColumn<T>) {
    const editableRows = visibleRows.filter((row) =>
      isCellEditable(column, row),
    );
    const checkedCount = editableRows.filter((row) =>
      Boolean(row[column.field]),
    ).length;

    return {
      allChecked:
        editableRows.length > 0 && checkedCount === editableRows.length,
      indeterminate: checkedCount > 0 && checkedCount < editableRows.length,
      hasEditableRows: editableRows.length > 0,
    };
  }

  function toggleColumnCheckbox(column: F1GridColumn<T>, nextValue: boolean) {
    setData((current) => {
      let next = current;
      visibleRows.forEach((row) => {
        if (!isCellEditable(column, row)) return;
        next = updateGridRow(next, rowKey, getGridRowId(row, rowKey), {
          [column.field]: nextValue,
        } as Partial<T>);
      });
      return next;
    });
  }

  const commitEditRef = useRef(commitEdit);
  useEffect(() => {
    commitEditRef.current = commitEdit;
  });

  useEffect(() => {
    if (!editingCell) return;

    function handleOutsideMouseDown(event: globalThis.MouseEvent) {
      const node = editingCellNodeRef.current;
      if (node && event.target instanceof Node && node.contains(event.target))
        return;
      if (
        event.target instanceof Element &&
        event.target.closest('.MuiPopover-root, .MuiModal-root')
      ) {
        return;
      }
      commitEditRef.current();
    }

    document.addEventListener('mousedown', handleOutsideMouseDown, true);
    return () => {
      document.removeEventListener('mousedown', handleOutsideMouseDown, true);
    };
  }, [editingCell]);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!focusedCell) return;

    const editableByRow = visibleRows.map((row) =>
      columns.map(
        (column) => isCellEditable(column, row) && column.type !== 'checkbox',
      ),
    );
    const currentFocusedRowIndex = visibleRows.findIndex(
      (row) => getGridRowId(row, rowKey) === focusedCell.rowId,
    );

    if (currentFocusedRowIndex < 0) return;

    if (event.key === 'Enter' || event.key === 'F2') {
      event.preventDefault();
      if (editingCell) {
        commitEdit();
      } else {
        startEdit(focusedCell.rowId, focusedCell.columnIndex);
      }
      return;
    }

    if (event.key === 'Escape' && editingCell) {
      event.preventDefault();
      stopEdit();
      return;
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      const direction = event.shiftKey ? -1 : 1;
      const nextCellPos = getNextEditableCell(
        {
          rowIndex: currentFocusedRowIndex,
          columnIndex: focusedCell.columnIndex,
        },
        editableByRow,
        direction,
      );

      if (!nextCellPos) return;

      const nextRow = visibleRows[nextCellPos.rowIndex];
      if (!nextRow) return;

      const nextCell = getCell(
        getGridRowId(nextRow, rowKey),
        nextCellPos.columnIndex,
      );
      if (editingCell) {
        commitEdit(nextCell);
      } else {
        setFocusedCell(nextCell);
      }
      return;
    }

    if (
      editingCell &&
      ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)
    ) {
      return;
    }

    let nextRowIndex = currentFocusedRowIndex;
    let nextColIndex = focusedCell.columnIndex;

    if (event.key === 'ArrowUp') nextRowIndex = Math.max(0, nextRowIndex - 1);
    if (event.key === 'ArrowDown')
      nextRowIndex = Math.min(visibleRows.length - 1, nextRowIndex + 1);
    if (event.key === 'ArrowLeft') nextColIndex = Math.max(0, nextColIndex - 1);
    if (event.key === 'ArrowRight')
      nextColIndex = Math.min(columns.length - 1, nextColIndex + 1);

    if (
      nextRowIndex !== currentFocusedRowIndex ||
      nextColIndex !== focusedCell.columnIndex
    ) {
      event.preventDefault();
      const nextRow = visibleRows[nextRowIndex];
      if (!nextRow) return;
      const nextCell = getCell(getGridRowId(nextRow, rowKey), nextColIndex);
      setFocusedCell(nextCell);
    }
  }

  function handleAddRow(row?: Partial<T>) {
    if (!createRow && !row) return;

    const baseRow = createRow ? createRow() : ({} as T);
    const newRow = { ...baseRow, ...row } as T;
    const newRowId = getGridRowId(newRow, rowKey);

    setData((current) => addGridRow(current, newRow, rowKey));
    setSelectedIds([newRowId]);

    const firstEditableCol = columns.findIndex(
      (column) => isCellEditable(column, newRow) && column.type !== 'checkbox',
    );
    if (firstEditableCol >= 0) {
      setFocusedCell(getCell(newRowId, firstEditableCol));
    }
  }

  function handleDeleteSelectedRows() {
    if (selectedIds.length === 0) return;
    setData((current) => markRowsDeleted(current, rowKey, selectedIds));
    setSelectedIds([]);
    setFocusedCell(undefined);
    setEditingCell(undefined);
  }

  function handleRestoreDeletedRows() {
    setData((current) => restoreGridRows(current));
  }

  function handleDuplicateSelectedRows() {
    if (selectedIds.length === 0 || !createDuplicate) return;
    setData((current) =>
      duplicateGridRows(current, rowKey, selectedIds, createDuplicate),
    );
  }

  useImperativeHandle(ref, () => ({
    getSelectedRows() {
      const selectedSet = new Set(selectedIds);
      return visibleRows.filter((row) =>
        selectedSet.has(getGridRowId(row, rowKey)),
      );
    },
    getSelectedRowIds() {
      return selectedIds;
    },
    clearSelection() {
      setSelectedIds([]);
    },
    addRow(row?: Partial<T>) {
      handleAddRow(row);
    },
    deleteSelectedRows() {
      handleDeleteSelectedRows();
    },
    restoreDeletedRows() {
      handleRestoreDeletedRows();
    },
    duplicateSelectedRows() {
      handleDuplicateSelectedRows();
    },
    getRows() {
      return visibleRows;
    },
    getChanges() {
      return getGridChanges(data, rowKey);
    },
    startEdit(rowId: F1GridRowId, field: keyof T) {
      const colIndex = columns.findIndex((col) => col.field === field);
      if (colIndex >= 0) {
        startEdit(rowId, colIndex);
      }
    },
    stopEdit() {
      stopEdit();
    },
  }));

  const selectedAll =
    visibleRows.length > 0 && selectedIds.length === visibleRows.length;

  return (
    <Box
      role="grid"
      aria-label={ariaLabel}
      sx={{
        width: '100%',
        overflowX: 'auto',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
      }}
    >
      <GridHeader
        columns={columns}
        columnLine={columnLine}
        selectedAll={selectedAll}
        selectedIds={selectedIds}
        getColumnCheckboxState={getColumnCheckboxState}
        onToggleAllRows={() => {
          setSelectedIds(
            selectedAll
              ? []
              : visibleRows.map((row) => getGridRowId(row, rowKey)),
          );
        }}
        onToggleColumnCheckbox={toggleColumnCheckbox}
      />
      <GridBody
        visibleRows={visibleRows}
        columns={columns}
        rowKey={rowKey}
        columnLine={columnLine}
        selectedIds={selectedIds}
        focusedCell={focusedCell}
        editingCell={editingCell}
        draftValue={draftValue}
        mergeInfoByColumn={mergeInfoByColumn}
        getRowId={(row) => getGridRowId(row, rowKey)}
        onSelectRow={selectRow}
        onSetRowSelection={setRowSelection}
        onSetFocusedCell={setFocusedCell}
        onStartEdit={startEdit}
        onDraftChange={setDraftValue}
        onKeyDown={handleKeyDown}
        onUpdateRow={(rowId, field, value) => {
          setData((current) =>
            updateGridRow(current, rowKey, rowId, {
              [field]: value,
            } as Partial<T>),
          );
        }}
        onStopEdit={stopEdit}
        onCellRef={(rowId, columnIndex, node) => {
          const key = `${String(rowId)}:${columnIndex}`;
          if (node) {
            cellNodeRefs.current.set(key, node);
          } else {
            cellNodeRefs.current.delete(key);
          }
        }}
        onEditingCellRef={(node) => {
          editingCellNodeRef.current = node;
        }}
      />
    </Box>
  );
}

export const F1Grid = forwardRef(F1GridInner) as unknown as <T extends object>(
  props: F1GridProps<T> & { ref?: Ref<F1GridRef<T>> },
) => ReactElement;
