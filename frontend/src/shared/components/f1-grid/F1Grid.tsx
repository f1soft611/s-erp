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
import { Box, Checkbox } from '@mui/material';
import { CellEditor } from './editing/CellEditor';
import {
  addGridRow,
  createGridData,
  duplicateGridRows,
  getGridChanges,
  markRowsDeleted,
  restoreGridRows,
  updateGridRow,
  type F1GridData,
} from './f1Grid.state';
import type {
  F1GridChanges,
  F1GridColumn,
  F1GridRef,
  F1GridRowId,
} from './f1Grid.types';
import { getGridMergeInfo } from './f1Grid.merge';
import { getCellDisplayValue, isCellEditable } from './utils/f1Grid.utils';

type F1GridProps<T extends object> = {
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

function toJustifyContent(align: 'left' | 'center' | 'right') {
  if (align === 'right') return 'flex-end';
  if (align === 'center') return 'center';
  return 'flex-start';
}

function getStateKey(rowId: F1GridRowId): string {
  return String(rowId);
}

function getRowId<T extends object>(row: T, rowKey: keyof T): F1GridRowId {
  const rowId = row[rowKey];

  if (typeof rowId !== 'string' && typeof rowId !== 'number') {
    throw new Error('F1Grid rowKey must reference a string or number value.');
  }

  return rowId;
}

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
  const [selectedIds, setSelectedIds] = useState<F1GridRowId[]>([]);
  const [lastSelectedRowId, setLastSelectedRowId] = useState<F1GridRowId>();
  const [focusedCell, setFocusedCell] = useState<F1GridCell>();
  const [editingCell, setEditingCell] = useState<F1GridCell>();
  const [draftValue, setDraftValue] = useState('');
  const editingCellNodeRef = useRef<HTMLElement | null>(null);

  const visibleRows = data.rows.filter(
    (row) => data.stateById[getStateKey(getRowId(row, rowKey))] !== 'deleted',
  );
  const mergeInfoByColumn = columns.map((column) =>
    column.mergeRows ? getGridMergeInfo(visibleRows, column.field) : [],
  );

  useEffect(() => {
    onChangesChange?.(getGridChanges(data, rowKey));
  }, [data, onChangesChange, rowKey]);

  function getCell(rowId: F1GridRowId, columnIndex: number): F1GridCell {
    return { rowId, columnIndex };
  }

  function isSameCell(first: F1GridCell | undefined, second: F1GridCell) {
    return (
      first?.rowId === second.rowId && first.columnIndex === second.columnIndex
    );
  }

  function selectRow(rowId: F1GridRowId, event?: MouseEvent<HTMLElement>) {
    const rowIndex = visibleRows.findIndex(
      (row) => getRowId(row, rowKey) === rowId,
    );

    if (event?.shiftKey && lastSelectedRowId !== undefined) {
      const lastIndex = visibleRows.findIndex(
        (row) => getRowId(row, rowKey) === lastSelectedRowId,
      );
      const range = visibleRows
        .slice(Math.min(rowIndex, lastIndex), Math.max(rowIndex, lastIndex) + 1)
        .map((row) => getRowId(row, rowKey));
      setSelectedIds(range);
    } else if (event?.ctrlKey || event?.metaKey) {
      setSelectedIds((current) =>
        current.includes(rowId)
          ? current.filter((id) => id !== rowId)
          : [...current, rowId],
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
    const row = data.rows.find((item) => getRowId(item, rowKey) === rowId);

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
      (item) => getRowId(item, rowKey) === editingCell.rowId,
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
        next = updateGridRow(next, rowKey, getRowId(row, rowKey), {
          [column.field]: nextValue,
        } as Partial<T>);
      });
      return next;
    });
  }

  const commitEditRef = useRef(commitEdit);
  commitEditRef.current = commitEdit;

  useEffect(() => {
    if (!editingCell) return;

    function handleOutsideMouseDown(event: globalThis.MouseEvent) {
      const node = editingCellNodeRef.current;
      if (node && event.target instanceof Node && node.contains(event.target))
        return;
      // Ignore clicks inside MUI popper overlays (e.g. the select editor's
      // dropdown menu), which render outside the cell via a portal.
      if (
        event.target instanceof Element &&
        event.target.closest('.MuiPopover-root, .MuiModal-root')
      )
        return;
      commitEditRef.current();
    }

    document.addEventListener('mousedown', handleOutsideMouseDown);
    return () =>
      document.removeEventListener('mousedown', handleOutsideMouseDown);
  }, [editingCell]);

  function moveFocus(rowOffset: number, columnOffset: number) {
    if (!focusedCell || visibleRows.length === 0 || columns.length === 0)
      return;

    const rowIndex = visibleRows.findIndex(
      (row) => getRowId(row, rowKey) === focusedCell.rowId,
    );
    const nextRowIndex = Math.max(
      0,
      Math.min(visibleRows.length - 1, rowIndex + rowOffset),
    );
    const nextColumnIndex = Math.max(
      0,
      Math.min(columns.length - 1, focusedCell.columnIndex + columnOffset),
    );

    setFocusedCell(
      getCell(getRowId(visibleRows[nextRowIndex], rowKey), nextColumnIndex),
    );
  }

  function getNextCell(
    rowOffset: number,
    columnOffset: number,
  ): F1GridCell | undefined {
    if (!editingCell) return undefined;
    const rowIndex = visibleRows.findIndex(
      (row) => getRowId(row, rowKey) === editingCell.rowId,
    );
    const nextRowIndex = Math.max(
      0,
      Math.min(visibleRows.length - 1, rowIndex + rowOffset),
    );
    const nextColumnIndex = Math.max(
      0,
      Math.min(columns.length - 1, editingCell.columnIndex + columnOffset),
    );
    return getCell(
      getRowId(visibleRows[nextRowIndex], rowKey),
      nextColumnIndex,
    );
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveFocus(-1, 0);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveFocus(1, 0);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveFocus(0, -1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveFocus(0, 1);
    } else if (event.key === 'F2') {
      event.preventDefault();
      if (focusedCell) startEdit(focusedCell.rowId, focusedCell.columnIndex);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      stopEdit();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (editingCell) commitEdit(getNextCell(event.shiftKey ? -1 : 1, 0));
      else if (focusedCell)
        startEdit(focusedCell.rowId, focusedCell.columnIndex);
    } else if (event.key === 'Tab' && editingCell) {
      event.preventDefault();
      commitEdit(getNextCell(0, event.shiftKey ? -1 : 1));
    } else if (event.key === 'Insert') {
      event.preventDefault();
      if (createRow)
        setData((current) => addGridRow(current, createRow(), rowKey));
    } else if (event.key === 'Delete') {
      event.preventDefault();
      setData((current) => markRowsDeleted(current, rowKey, selectedIds));
      setSelectedIds([]);
    } else if (event.key.toLowerCase() === 'd' && event.ctrlKey) {
      event.preventDefault();
      if (createDuplicate) {
        setData((current) =>
          duplicateGridRows(current, rowKey, selectedIds, createDuplicate),
        );
      }
    }
  }

  useImperativeHandle(
    ref,
    () => ({
      getSelectedRows: () =>
        data.rows.filter((row) => selectedIds.includes(getRowId(row, rowKey))),
      getSelectedRowIds: () => selectedIds,
      clearSelection: () => setSelectedIds([]),
      addRow: (row) => {
        if (createRow) {
          setData((current) =>
            addGridRow(current, { ...createRow(), ...row } as T, rowKey),
          );
        }
      },
      deleteSelectedRows: () => {
        setData((current) => markRowsDeleted(current, rowKey, selectedIds));
        setSelectedIds([]);
      },
      restoreDeletedRows: () => setData((current) => restoreGridRows(current)),
      duplicateSelectedRows: () => {
        if (createDuplicate) {
          setData((current) =>
            duplicateGridRows(current, rowKey, selectedIds, createDuplicate),
          );
        }
      },
      getRows: () => data.rows,
      getChanges: () => getGridChanges(data, rowKey),
      startEdit: (rowId, field) => {
        const columnIndex = columns.findIndex(
          (column) => column.field === field,
        );
        if (columnIndex >= 0) startEdit(rowId, columnIndex);
      },
      stopEdit,
    }),
    [columns, createDuplicate, createRow, data, rowKey, selectedIds],
  );

  const selectedAll =
    visibleRows.length > 0 && selectedIds.length === visibleRows.length;

  return (
    <Box
      role="grid"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      sx={{ border: 1, borderColor: 'divider', overflowX: 'auto' }}
    >
      <Box
        role="row"
        sx={{
          display: 'grid',
          gridTemplateColumns: `44px ${columns
            .map((column) => `${column.width ?? 140}px`)
            .join(' ')}`,
          minWidth: 'max-content',
          bgcolor: 'action.hover',
          fontWeight: 700,
        }}
      >
        <Box
          role="columnheader"
          sx={{ display: 'flex', justifyContent: 'center' }}
        >
          <Checkbox
            size="small"
            aria-label="전체 행 선택"
            checked={selectedAll}
            indeterminate={selectedIds.length > 0 && !selectedAll}
            onChange={() =>
              setSelectedIds(
                selectedAll
                  ? []
                  : visibleRows.map((row) => getRowId(row, rowKey)),
              )
            }
          />
        </Box>
        {columns.map((column) => {
          if (column.type === 'checkbox' && column.headerCheckbox) {
            const { allChecked, indeterminate, hasEditableRows } =
              getColumnCheckboxState(column);

            return (
              <Box
                key={String(column.field)}
                role="columnheader"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  borderLeft: columnLine ? 1 : 0,
                  borderLeftColor: 'divider',
                  justifyContent:
                    column.headerAlign === 'right'
                      ? 'flex-end'
                      : column.headerAlign === 'left'
                        ? 'flex-start'
                        : 'center',
                }}
              >
                <Checkbox
                  size="small"
                  checked={allChecked}
                  indeterminate={indeterminate}
                  disabled={!hasEditableRows}
                  slotProps={{
                    input: {
                      'aria-label': `${column.headerName} 전체 선택`,
                    },
                  }}
                  onChange={() => toggleColumnCheckbox(column, !allChecked)}
                />
                {column.headerName}
              </Box>
            );
          }

          return (
            <Box
              key={String(column.field)}
              role="columnheader"
              sx={{
                p: 1,
                textAlign: column.headerAlign ?? 'left',
                borderLeft: columnLine ? 1 : 0,
                borderLeftColor: 'divider',
              }}
            >
              {column.headerName}
            </Box>
          );
        })}
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `44px ${columns
            .map((column) => `${column.width ?? 140}px`)
            .join(' ')}`,
          gridAutoRows: 'minmax(40px, auto)',
          minWidth: 'max-content',
        }}
      >
        {visibleRows.map((row, rowIndex) => {
          const rowId = getRowId(row, rowKey);
          const isSelected = selectedIds.includes(rowId);

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
                    setRowSelection(rowId, !isSelected);
                  }}
                />
              </Box>
              {columns.map((column, columnIndex) => {
                const cell = getCell(rowId, columnIndex);
                const editing = isSameCell(editingCell, cell);
                const focused = isSameCell(focusedCell, cell);
                const value = row[column.field];
                const editable = isCellEditable(column, row);
                const mergeInfo = mergeInfoByColumn[columnIndex]?.[rowIndex];
                const merged = Boolean(
                  column.mergeRows &&
                  rowIndex > 0 &&
                  !editing &&
                  Object.is(visibleRows[rowIndex - 1][column.field], value),
                );

                return (
                  <Box
                    key={String(column.field)}
                    role="gridcell"
                    tabIndex={focused ? 0 : -1}
                    ref={editing ? editingCellNodeRef : undefined}
                    onClick={(event) => {
                      setFocusedCell(cell);
                      selectRow(rowId, event);
                    }}
                    onDoubleClick={() => startEdit(rowId, columnIndex)}
                    sx={{
                      gridColumn: columnIndex + 2,
                      minHeight: 40,
                      p: column.type === 'checkbox' ? 0.25 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: toJustifyContent(
                        column.align ??
                          (column.type === 'number' ? 'right' : 'left'),
                      ),
                      borderLeft: columnLine ? 1 : 0,
                      borderLeftColor: 'divider',
                      gridRow: mergeInfo?.isStart
                        ? `${rowIndex + 1} / span ${mergeInfo.span}`
                        : rowIndex + 1,
                      borderTop: merged ? 0 : 1,
                      borderColor: 'divider',
                      outline: focused ? '2px solid' : 'none',
                      outlineColor: 'primary.main',
                      outlineOffset: -2,
                      textAlign:
                        column.align ??
                        (column.type === 'number' ? 'right' : 'left'),
                    }}
                  >
                    {merged ? null : column.type === 'checkbox' ? (
                      <Checkbox
                        size="small"
                        checked={Boolean(value)}
                        disabled={!editable}
                        slotProps={{
                          input: {
                            'aria-label': `${column.headerName} ${rowId}`,
                          },
                        }}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => {
                          if (!editable) return;
                          setData((current) =>
                            updateGridRow(current, rowKey, rowId, {
                              [column.field]: event.target.checked,
                            } as Partial<T>),
                          );
                        }}
                      />
                    ) : editing ? (
                      <CellEditor
                        column={column}
                        value={draftValue}
                        onChange={setDraftValue}
                        onKeyDown={handleKeyDown}
                        onSelectChange={(selectedValue) => {
                          setDraftValue(String(selectedValue));
                          setData((current) =>
                            updateGridRow(current, rowKey, rowId, {
                              [column.field]: selectedValue,
                            } as Partial<T>),
                          );
                          stopEdit();
                        }}
                      />
                    ) : (
                      getCellDisplayValue(column, value)
                    )}
                  </Box>
                );
              })}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

export const F1Grid = forwardRef(F1GridInner) as unknown as <T extends object>(
  props: F1GridProps<T> & { ref?: Ref<F1GridRef<T>> },
) => ReactElement;
