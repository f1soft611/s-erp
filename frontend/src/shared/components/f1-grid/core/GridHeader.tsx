import { Box, Checkbox } from '@mui/material';
import type { F1GridColumn, F1GridRowId } from '../types/grid.types';

type GridHeaderProps<T extends object> = {
  columns: F1GridColumn<T>[];
  columnLine: boolean;
  selectedAll: boolean;
  selectedIds: F1GridRowId[];
  getColumnCheckboxState: (column: F1GridColumn<T>) => {
    allChecked: boolean;
    indeterminate: boolean;
    hasEditableRows: boolean;
  };
  onToggleAllRows: () => void;
  onToggleColumnCheckbox: (column: F1GridColumn<T>, nextValue: boolean) => void;
};

export function GridHeader<T extends object>({
  columns,
  columnLine,
  selectedAll,
  selectedIds,
  getColumnCheckboxState,
  onToggleAllRows,
  onToggleColumnCheckbox,
}: GridHeaderProps<T>) {
  return (
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
          onChange={onToggleAllRows}
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
                onChange={() => onToggleColumnCheckbox(column, !allChecked)}
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
  );
}
