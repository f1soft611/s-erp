import type { KeyboardEvent } from 'react';
import { Box, Checkbox } from '@mui/material';
import { CellEditor } from '../editing/CellEditor';
import type { F1GridColumn, F1GridRowId } from '../types/grid.types';
import { getCellDisplayValue, isCellEditable } from '../utils/grid.utils';

type GridCellProps<T extends object> = {
  row: T;
  rowId: F1GridRowId;
  column: F1GridColumn<T>;
  columnIndex: number;
  columnLine: boolean;
  focused: boolean;
  editing: boolean;
  merged: boolean;
  mergeInfo?: { isStart: boolean; span: number };
  rowIndex: number;
  draftValue: string;
  onFocus: () => void;
  onDoubleClick: () => void;
  onDraftChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  onSelectChange: (value: unknown) => void;
  onCheckboxChange: (checked: boolean) => void;
  onCellRef: (node: HTMLElement | null) => void;
};

function toJustifyContent(align: 'left' | 'center' | 'right') {
  if (align === 'right') return 'flex-end';
  if (align === 'center') return 'center';
  return 'flex-start';
}

export function GridCell<T extends object>({
  row,
  rowId,
  column,
  columnIndex,
  columnLine,
  focused,
  editing,
  merged,
  mergeInfo,
  rowIndex,
  draftValue,
  onFocus,
  onDoubleClick,
  onDraftChange,
  onKeyDown,
  onSelectChange,
  onCheckboxChange,
  onCellRef,
}: GridCellProps<T>) {
  const value = row[column.field];
  const editable = isCellEditable(column, row);

  return (
    <Box
      key={String(column.field)}
      role="gridcell"
      tabIndex={focused ? 0 : -1}
      ref={onCellRef}
      onClick={onFocus}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
      sx={{
        gridColumn: columnIndex + 2,
        minHeight: 40,
        p: column.type === 'checkbox' ? 0.25 : 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: toJustifyContent(
          column.align ?? (column.type === 'number' ? 'right' : 'left'),
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
          column.align ?? (column.type === 'number' ? 'right' : 'left'),
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
            onCheckboxChange(event.target.checked);
          }}
        />
      ) : editing ? (
        <CellEditor
          column={column}
          value={draftValue}
          onChange={onDraftChange}
          onKeyDown={onKeyDown}
          onSelectChange={onSelectChange}
        />
      ) : (
        getCellDisplayValue(column, value)
      )}
    </Box>
  );
}
