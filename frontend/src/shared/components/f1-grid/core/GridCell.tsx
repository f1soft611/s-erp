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
  rowHeight: number;
  defaultRowHeight: number;
  rowIndex: number;
  draftValue: string;
  onFocus: () => void;
  onDoubleClick: () => void;
  onDraftChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  onSelectChange: (value: unknown) => void;
  onCheckboxChange: (checked: boolean) => void;
  onCodePick: () => void;
  errorMessage?: string;
  onCellRef: (node: HTMLElement | null) => void;
  pinOffset?: { side: 'left' | 'right'; offset: number };
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
  rowHeight,
  defaultRowHeight,
  rowIndex,
  draftValue,
  onFocus,
  onDoubleClick,
  onDraftChange,
  onKeyDown,
  onSelectChange,
  onCheckboxChange,
  onCodePick,
  errorMessage,
  onCellRef,
  pinOffset,
}: GridCellProps<T>) {
  const value = row[column.field];
  const editable = isCellEditable(column, row);

  return (
    <Box
      key={String(column.field)}
      role="gridcell"
      data-grid-error={errorMessage}
      title={errorMessage}
      tabIndex={focused ? 0 : -1}
      ref={onCellRef}
      onClick={onFocus}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
      sx={{
        gridColumn: columnIndex + 2,
        minHeight: 40,
        minWidth: 0,
        maxWidth: '100%',
        overflow: 'hidden',
        boxSizing: 'border-box',
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
        position: pinOffset ? 'sticky' : undefined,
        left: pinOffset?.side === 'left' ? pinOffset.offset : undefined,
        right: pinOffset?.side === 'right' ? pinOffset.offset : undefined,
        zIndex: pinOffset ? 2 : undefined,
        bgcolor: pinOffset
          ? 'background.paper'
          : errorMessage
            ? 'error.lighter'
            : undefined,
        boxShadow: pinOffset
          ? pinOffset.side === 'left'
            ? '2px 0 4px -2px rgba(0, 0, 0, 0.32)'
            : '-2px 0 4px -2px rgba(0, 0, 0, 0.32)'
          : errorMessage
            ? 'inset 0 0 0 1px'
            : undefined,
        color: errorMessage ? 'error.main' : undefined,
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
          onCodePick={onCodePick}
        />
      ) : (
        <Box
          component="span"
          title={getCellDisplayValue(column, value)}
          sx={{
            display: 'block',
            width: '100%',
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:
              column.wrapText && rowHeight > defaultRowHeight
                ? 'normal'
                : 'nowrap',
            overflowWrap:
              column.wrapText && rowHeight > defaultRowHeight
                ? 'anywhere'
                : 'normal',
          }}
        >
          {getCellDisplayValue(column, value)}
        </Box>
      )}
    </Box>
  );
}
