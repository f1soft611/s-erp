import { useMemo } from 'react';
import { Box } from '@mui/material';
import type { F1GridColumn } from '../types/grid.types';
import { getCellDisplayValue } from '../utils/grid.utils';
import { calculateGridSummary } from '../utils/gridSummary';

type Props<T extends object> = {
  rows: T[];
  columns: F1GridColumn<T>[];
  columnTracks: string;
  columnLine: boolean;
  renderedColumnIndexes?: Set<number>;
  showCheckbox: boolean;
  showFormAction: boolean;
  getPinOffset: (column: F1GridColumn<T>) =>
    { side: 'left' | 'right'; offset: number } | undefined;
  dock: 'top' | 'bottom';
};

export function GridSummary<T extends object>({
  rows, columns, columnTracks, columnLine, renderedColumnIndexes, showCheckbox,
  showFormAction, getPinOffset, dock,
}: Props<T>) {
  const values = useMemo(
    () => columns.map((column) => column.summaryType ? calculateGridSummary(rows, column) : undefined),
    [columns, rows],
  );
  return (
    <Box
      role="row"
      aria-label="집계"
      data-testid={`f1-grid-summary-${dock}`}
      sx={{ display: 'grid', gridTemplateColumns: columnTracks, minWidth: 'max-content' }}
    >
      {showCheckbox && (
        <Box sx={{ position: 'sticky', left: 0, zIndex: 2, bgcolor: 'background.default',
          borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontWeight: 'bold' }}>집계</Box>
      )}
      {columns.map((column, index) => {
        const pin = getPinOffset(column);
        const value = values[index];
        const align = column.align ??
          (column.type === 'number' || column.type === 'rownumber' ? 'right' : 'left');
        return (
          <Box
            key={String(column.field)}
            role="gridcell"
            aria-label={`${column.headerName} 집계`}
            sx={{
              gridColumn: index + (showCheckbox ? 2 : 1),
              minWidth: 0, minHeight: 32, width: '100%', boxSizing: 'border-box',
              p: column.type === 'checkbox' ? 0.25 : 0.5, display: 'flex', alignItems: 'center',
              justifyContent: align === 'left' ? 'flex-start' : align === 'center' ? 'center' : 'flex-end',
              fontWeight: 'bold', color: 'primary.main', bgcolor: 'background.default',
              borderBottom: 1, borderLeft: columnLine && index > 0 ? 1 : 0,
              borderColor: 'divider',
              ...(pin ? { position: 'sticky', [pin.side]: pin.offset, zIndex: 2 } : {}),
            }}
          >
            {(!renderedColumnIndexes || renderedColumnIndexes.has(index)) && value !== undefined
              ? getCellDisplayValue(column, value) : ''}
          </Box>
        );
      })}
      {showFormAction && (
        <Box sx={{
          gridColumn: columns.length + (showCheckbox ? 2 : 1), position: 'sticky',
          right: 0, zIndex: 4, bgcolor: 'background.default',
          borderLeft: 1, borderBottom: 1, borderColor: 'divider',
        }} />
      )}
    </Box>
  );
}
