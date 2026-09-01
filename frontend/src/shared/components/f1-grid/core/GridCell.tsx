import type { KeyboardEvent, ReactNode } from 'react';
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
  selected: boolean;
  copied?: boolean;
  merged: boolean;
  mergeInfo?: { isStart: boolean; span: number };
  rowHeight: number;
  defaultRowHeight: number;
  rowIndex: number;
  isLastRow?: boolean;
  draftValue: string;
  onFocus: () => void;
  onMouseDown: () => void;
  onMouseEnter: () => void;
  onMouseUp: () => void;
  onBlur?: () => void;
  onDoubleClick: () => void;
  onDraftChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  onSelectChange: (value: unknown) => void;
  onCheckboxChange: (checked: boolean) => void;
  onCodePick: () => void;
  errorMessage?: string;
  onCellRef: (node: HTMLElement | null) => void;
  pinOffset?: { side: 'left' | 'right'; offset: number };
  adornment?: ReactNode;
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
  selected,
  copied,
  merged,
  mergeInfo,
  rowHeight,
  defaultRowHeight,
  rowIndex,
  isLastRow,
  draftValue,
  onFocus,
  onMouseDown,
  onMouseEnter,
  onMouseUp,
  onBlur,
  onDoubleClick,
  onDraftChange,
  onKeyDown,
  onSelectChange,
  onCheckboxChange,
  onCodePick,
  errorMessage,
  onCellRef,
  pinOffset,
  adornment,
}: GridCellProps<T>) {
  const value = column.getValue?.(row) ?? row[column.field];
  const editable = isCellEditable(column, row);
  const displayValue =
    column.type === 'rownumber'
      ? String(rowIndex + 1)
      : getCellDisplayValue(column, value as T[keyof T]);

  return (
    <Box
      key={String(column.field)}
      role="gridcell"
      aria-label={adornment && !merged ? displayValue : undefined}
      data-grid-error={errorMessage}
      title={errorMessage}
      tabIndex={focused ? 0 : -1}
      ref={onCellRef}
      onClick={onFocus}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseUp={onMouseUp}
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget;
        if (
          nextTarget instanceof Node &&
          event.currentTarget.contains(nextTarget)
        ) {
          return;
        }
        const hasOpenEditorPopup = Boolean(
          document.querySelector(
            '.MuiPopover-root, .MuiMenu-paper, .MuiDialog-root, .MuiModal-root',
          ),
        );
        if (hasOpenEditorPopup) return;
        onBlur?.();
      }}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
      data-grid-selected={selected ? 'true' : 'false'}
      sx={{
        gridColumn: columnIndex + 2,
        minHeight: 0,
        minWidth: 0,
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden',
        boxSizing: 'border-box',
        p: column.type === 'checkbox' ? 0.25 : 1,
        display: 'flex',
        alignItems: 'center',
        alignSelf: 'stretch',
        justifyContent: toJustifyContent(
          column.align ??
            (column.type === 'number' || column.type === 'rownumber'
              ? 'right'
              : 'left'),
        ),
        cursor: editing ? 'text' : 'default',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        borderLeft: columnLine && columnIndex > 0 ? 1 : 0,
        borderLeftColor: 'divider',
        gridRow: mergeInfo?.isStart
          ? `${rowIndex + 1} / span ${mergeInfo.span}`
          : rowIndex + 1,
        borderTop: merged ? 0 : 1,
        borderBottom: isLastRow ? 1 : merged ? 0 : undefined,
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
        border:
          copied && !editing
            ? (theme) => `1px dashed ${theme.palette.primary.main}`
            : undefined,
        boxShadow: pinOffset
          ? pinOffset.side === 'left'
            ? '2px 0 4px -2px rgba(0, 0, 0, 0.32)'
            : '-2px 0 4px -2px rgba(0, 0, 0, 0.32)'
          : copied && !editing
            ? (theme) =>
                theme.palette.mode === 'dark'
                  ? 'inset 0 0 0 1px rgba(144, 202, 249, 0.95), 0 0 0 1px rgba(144, 202, 249, 0.3) dashed'
                  : 'inset 0 0 0 1px rgba(25, 118, 210, 0.95), 0 0 0 1px rgba(25, 118, 210, 0.3) dashed'
            : selected && !focused && !editing
              ? 'inset 0 0 0 1px rgba(25, 118, 210, 0.7)'
              : errorMessage
                ? 'inset 0 0 0 1px'
                : undefined,
        backgroundColor:
          selected && !focused && !editing
            ? 'rgba(25, 118, 210, 0.05)'
            : copied && !editing
              ? (theme) =>
                  theme.palette.mode === 'dark'
                    ? 'rgba(144, 202, 249, 0.12)'
                    : 'rgba(25, 118, 210, 0.08)'
              : undefined,
        color: errorMessage ? 'error.main' : undefined,
        outline:
          (focused && !editing) || (editing && column.type !== 'date')
            ? '2px solid'
            : 'none',
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
        <>
          {adornment}
          <Box
            component="span"
            title={displayValue}
            sx={{
              display: 'block',
              flex: '1 1 auto',
              width: '100%',
              maxWidth: '100%',
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              cursor: 'inherit',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              whiteSpace:
                column.wrapText && rowHeight > defaultRowHeight
                  ? 'normal'
                  : 'nowrap',
              overflowWrap:
                column.wrapText && rowHeight > defaultRowHeight
                  ? 'anywhere'
                  : 'normal',
              wordBreak:
                column.wrapText && rowHeight > defaultRowHeight
                  ? 'break-word'
                  : 'normal',
            }}
          >
            {displayValue}
          </Box>
        </>
      )}
    </Box>
  );
}
