import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ForwardedRef,
  type ClipboardEvent,
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
  F1GridColumn,
  F1GridFilter,
  F1GridPinSide,
  F1GridProps,
  F1GridRef,
  F1GridRowId,
  F1GridSort,
} from '../types/grid.types';
import { getNextEditableCell } from '../keyboard/GridKeyboard';
import { getSelectedRowIds as resolveSelectedRowIds } from '../selection/GridSelection';
import { getGridMergeInfo } from '../merge/GridRowMerge';
import { getGridRowId, getStateKey, isCellEditable } from '../utils/grid.utils';
import {
  coerceClipboardValue,
  parseGridTsv,
  toGridTsv,
} from '../clipboard/GridClipboard';
import { validateGridRow } from '../validation/GridValidation';
import { clampGridRowHeight } from '../layout/GridRowHeight';
import {
  canHideGridColumn,
  getVisibleGridColumns,
} from '../columns/GridColumnManagement';
import { toggleGridSort, sortGridRows } from '../sorting/GridSort';
import { applyGridFilters } from '../filter/GridFilter';
import {
  getGridColumnPinOffsets,
  getGridColumnPinSide,
  getPinnedGridColumns,
} from '../columns/GridColumnPin';

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
    rowHeight = 40,
    minRowHeight = 40,
    maxRowHeight = 300,
    resizableRows = true,
    resizableColumns = true,
    minColumnWidth = 50,
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
  const [cellErrors, setCellErrors] = useState<Record<string, string>>({});
  const normalizedMinRowHeight = Math.max(1, minRowHeight);
  const normalizedMaxRowHeight = Math.max(normalizedMinRowHeight, maxRowHeight);
  const defaultRowHeight = clampGridRowHeight(
    rowHeight,
    normalizedMinRowHeight,
    normalizedMaxRowHeight,
  );
  const [rowHeights, setRowHeights] = useState<Record<string, number>>({});
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [hiddenColumnFields, setHiddenColumnFields] = useState<Set<string>>(
    () =>
      new Set(
        columns
          .filter((column) => column.hidden)
          .map((column) => String(column.field)),
      ),
  );
  const [sortState, setSortState] = useState<F1GridSort<T>[]>([]);
  const [filterState, setFilterState] = useState<F1GridFilter<T>[]>([]);
  const [pinnedFields, setPinnedFields] = useState<Map<string, F1GridPinSide>>(
    () => new Map(),
  );
  const editingCellNodeRef = useRef<HTMLElement | null>(null);
  const cellNodeRefs = useRef(new Map<string, HTMLElement>());

  const visibleColumns = getPinnedGridColumns(
    getVisibleGridColumns(columns, hiddenColumnFields),
    pinnedFields,
  );
  const { leftOffsets, rightOffsets } = getGridColumnPinOffsets(
    visibleColumns,
    pinnedFields,
    columnWidths,
  );

  const visibleRows = sortGridRows(
    applyGridFilters(
      data.rows.filter(
        (row) =>
          data.stateById[getStateKey(getGridRowId(row, rowKey))] !== 'deleted',
      ),
      filterState,
      columns,
    ),
    sortState,
  );
  const mergeInfoByColumn = visibleColumns.map((column) =>
    column.mergeRows ? getGridMergeInfo(visibleRows, column.field) : [],
  );

  function toggleSortColumn(
    column: F1GridColumn<T>,
    direction: 'asc' | 'desc',
  ) {
    setSortState((current) => toggleGridSort(current, column.field, direction));
  }

  function applyColumnFilter(
    column: F1GridColumn<T>,
    filter: F1GridFilter<T> | undefined,
  ) {
    setFilterState((current) => {
      const withoutColumn = current.filter(
        (item) => item.field !== column.field,
      );
      return filter ? [...withoutColumn, filter] : withoutColumn;
    });
  }

  function pinColumn(column: F1GridColumn<T>, side: F1GridPinSide | undefined) {
    setPinnedFields((current) => {
      const next = new Map(current);
      if (side) {
        next.set(String(column.field), side);
      } else {
        next.delete(String(column.field));
      }
      return next;
    });
  }

  function handleResizeColumn(column: F1GridColumn<T>, nextWidth: number) {
    setColumnWidths((current) => ({
      ...current,
      [String(column.field)]: Math.max(minColumnWidth, nextWidth),
    }));
  }

  function getPinOffset(
    column: F1GridColumn<T>,
  ): { side: 'left' | 'right'; offset: number } | undefined {
    const side = getGridColumnPinSide(pinnedFields, column);
    if (!side) return undefined;
    const offset =
      side === 'left'
        ? leftOffsets[String(column.field)]
        : rightOffsets[String(column.field)];
    return offset === undefined ? undefined : { side, offset };
  }

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
    const cellNode = cellNodeRefs.current.get(
      `${String(focusedCell.rowId)}:${focusedCell.columnIndex}`,
    );
    if (!cellNode) return;

    if (
      editingCell?.rowId === focusedCell.rowId &&
      editingCell.columnIndex === focusedCell.columnIndex
    ) {
      (
        cellNode.querySelector('input, select, textarea') as HTMLElement | null
      )?.focus();
      return;
    }

    cellNode.focus();
  }, [editingCell, focusedCell]);

  useEffect(() => {
    onChangesChange?.(getGridChanges(data, rowKey));
  }, [data, onChangesChange, rowKey]);

  function getCell(rowId: F1GridRowId, columnIndex: number): F1GridCell {
    return { rowId, columnIndex };
  }

  function getErrorKey(rowId: F1GridRowId, field: keyof T): string {
    return `${String(rowId)}:${String(field)}`;
  }

  function updateRowHeight(rowId: F1GridRowId, nextHeight: number) {
    setRowHeights((current) => ({
      ...current,
      [String(rowId)]: clampGridRowHeight(
        nextHeight,
        normalizedMinRowHeight,
        normalizedMaxRowHeight,
      ),
    }));
  }

  function validate(): boolean {
    const nextErrors: Record<string, string> = {};
    visibleRows.forEach((row) => {
      const rowId = getGridRowId(row, rowKey);
      Object.entries(validateGridRow(row, columns)).forEach(
        ([field, message]) => {
          nextErrors[`${String(rowId)}:${field}`] = message;
        },
      );
    });
    setCellErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleCopy(event: ClipboardEvent<HTMLElement>) {
    const selectedRows = visibleRows.filter((row) =>
      selectedIds.includes(getGridRowId(row, rowKey)),
    );
    const value =
      selectedRows.length > 0
        ? toGridTsv(selectedRows, visibleColumns)
        : focusedCell
          ? String(
              visibleRows.find(
                (row) => getGridRowId(row, rowKey) === focusedCell.rowId,
              )?.[visibleColumns[focusedCell.columnIndex]?.field] ?? '',
            )
          : '';
    if (!value) return;
    event.preventDefault();
    event.clipboardData.setData('text/plain', value);
  }

  function handlePaste(event: ClipboardEvent<HTMLElement>) {
    if (!focusedCell) return;
    const text = event.clipboardData.getData('text/plain');
    if (!text) return;
    event.preventDefault();
    const startRowIndex = visibleRows.findIndex(
      (row) => getGridRowId(row, rowKey) === focusedCell.rowId,
    );
    if (startRowIndex < 0) return;

    setData((current) => {
      let next = current;
      const targetRows = current.rows.filter(
        (row) =>
          current.stateById[getStateKey(getGridRowId(row, rowKey))] !==
          'deleted',
      );
      parseGridTsv(text).forEach((values, valueRowIndex) => {
        let targetRow = targetRows[startRowIndex + valueRowIndex];
        if (!targetRow && createRow) {
          targetRow = createRow();
          next = addGridRow(next, targetRow, rowKey);
          targetRows.push(targetRow);
        }
        if (!targetRow) return;
        const changes: Partial<T> = {};
        values.forEach((rawValue, valueColumnIndex) => {
          const column =
            visibleColumns[focusedCell.columnIndex + valueColumnIndex];
          if (!column || !isCellEditable(column, targetRow)) return;
          const value = coerceClipboardValue(rawValue, column);
          if (value !== undefined) {
            (changes as Record<keyof T, unknown>)[column.field] = value;
          }
        });
        if (Object.keys(changes).length > 0) {
          next = updateGridRow(
            next,
            rowKey,
            getGridRowId(targetRow, rowKey),
            changes,
          );
        }
      });
      return next;
    });
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
    const column = visibleColumns[columnIndex];
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

    const column = visibleColumns[editingCell.columnIndex];
    const value =
      column.type === 'number' ||
      column.type === 'decimal' ||
      column.type === 'currency'
        ? Number(draftValue)
        : draftValue;
    const row = data.rows.find(
      (item) => getGridRowId(item, rowKey) === editingCell.rowId,
    );

    if (
      column &&
      row &&
      ((column.type !== 'number' &&
        column.type !== 'decimal' &&
        column.type !== 'currency') ||
        !Number.isNaN(value)) &&
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

  function toggleColumnVisibility(column: F1GridColumn<T>, visible: boolean) {
    setHiddenColumnFields((current) => {
      const next = new Set(current);
      if (visible) {
        next.delete(String(column.field));
      } else if (canHideGridColumn(visibleColumns, column)) {
        next.add(String(column.field));
      }
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
      visibleColumns.map(
        (column) => isCellEditable(column, row) && column.type !== 'checkbox',
      ),
    );
    const currentFocusedRowIndex = visibleRows.findIndex(
      (row) => getGridRowId(row, rowKey) === focusedCell.rowId,
    );

    if (currentFocusedRowIndex < 0) return;

    if (event.key === 'Insert') {
      event.preventDefault();
      handleAddRow();
      return;
    }

    if (event.ctrlKey && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      handleDuplicateSelectedRows();
      return;
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      if (selectedIds.length > 0) {
        handleDeleteSelectedRows();
      } else {
        const row = visibleRows[currentFocusedRowIndex];
        const column = visibleColumns[focusedCell.columnIndex];
        if (row && column && isCellEditable(column, row)) {
          setData((current) =>
            updateGridRow(current, rowKey, focusedCell.rowId, {
              [column.field]: '',
            } as Partial<T>),
          );
        }
      }
      return;
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const direction = event.key === 'Home' ? 1 : -1;
      const indexes = visibleColumns.map((_, index) => index);
      if (direction === -1) indexes.reverse();
      const columnIndex = indexes.find((index) =>
        isCellEditable(
          visibleColumns[index],
          visibleRows[currentFocusedRowIndex],
        ),
      );
      if (columnIndex !== undefined) {
        setFocusedCell(getCell(focusedCell.rowId, columnIndex));
      }
      return;
    }

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
      nextColIndex = Math.min(visibleColumns.length - 1, nextColIndex + 1);

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

    const firstEditableCol = visibleColumns.findIndex(
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
    validate,
    startEdit(rowId: F1GridRowId, field: keyof T) {
      const colIndex = visibleColumns.findIndex((col) => col.field === field);
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
      onCopy={handleCopy}
      onPaste={handlePaste}
      sx={{
        width: '100%',
        minWidth: 0,
        maxWidth: '100%',
        overflowX: 'auto',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
      }}
    >
      <GridHeader
        columns={visibleColumns}
        allColumns={columns}
        columnLine={columnLine}
        selectedAll={selectedAll}
        selectedIds={selectedIds}
        columnWidths={columnWidths}
        resizableColumns={resizableColumns}
        minColumnWidth={minColumnWidth}
        onResizeColumn={handleResizeColumn}
        getColumnCheckboxState={getColumnCheckboxState}
        onToggleAllRows={() => {
          setSelectedIds(
            selectedAll
              ? []
              : visibleRows.map((row) => getGridRowId(row, rowKey)),
          );
        }}
        onToggleColumnCheckbox={toggleColumnCheckbox}
        onToggleColumnVisibility={toggleColumnVisibility}
        sorts={sortState}
        onToggleSort={toggleSortColumn}
        filters={filterState}
        onApplyFilter={applyColumnFilter}
        pinnedFields={pinnedFields}
        onPinColumn={pinColumn}
        leftOffsets={leftOffsets}
        rightOffsets={rightOffsets}
      />
      <GridBody
        visibleRows={visibleRows}
        columns={visibleColumns}
        rowKey={rowKey}
        columnLine={columnLine}
        columnWidths={columnWidths}
        defaultRowHeight={defaultRowHeight}
        minRowHeight={normalizedMinRowHeight}
        maxRowHeight={normalizedMaxRowHeight}
        rowHeights={rowHeights}
        resizableRows={resizableRows}
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
        onPatchRow={(rowId, changes) => {
          setData((current) => updateGridRow(current, rowKey, rowId, changes));
        }}
        getCellError={(rowId, field) => cellErrors[getErrorKey(rowId, field)]}
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
        onUpdateRowHeight={updateRowHeight}
        getPinOffset={getPinOffset}
      />
    </Box>
  );
}

export const F1Grid = forwardRef(F1GridInner) as unknown as <T extends object>(
  props: F1GridProps<T> & { ref?: Ref<F1GridRef<T>> },
) => ReactElement;
