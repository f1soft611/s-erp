import EditIcon from '@mui/icons-material/Edit';
import { Box, IconButton, Tooltip } from '@mui/material';
import type { MouseEvent } from 'react';
import type { F1GridRowId } from '../types/grid.types';

export type GridFormActionCellProps = {
  rowId: F1GridRowId;
  rowIndex: number;
  columnIndex: number;
  isLastRow: boolean;
  onEdit: () => void;
};

export function GridFormActionCell({
  rowId,
  rowIndex,
  columnIndex,
  isLastRow,
  onEdit,
}: GridFormActionCellProps) {
  const stopPropagation = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  return (
    <Box
      role="gridcell"
      onClick={stopPropagation}
      onContextMenu={stopPropagation}
      onDoubleClick={stopPropagation}
      onMouseDown={stopPropagation}
      sx={{
        alignItems: 'center',
        backgroundColor: 'background.paper',
        borderBottom: isLastRow ? 1 : 0,
        borderColor: 'divider',
        borderLeft: 1,
        borderTop: 1,
        boxSizing: 'border-box',
        display: 'flex',
        gridColumn: columnIndex,
        gridRow: rowIndex + 1,
        justifyContent: 'center',
        position: 'sticky',
        right: 0,
        zIndex: 3,
      }}
    >
      <Tooltip title="정보 수정">
        <IconButton
          aria-label={`${rowId} 행 정보 수정`}
          size="small"
          onClick={(event) => {
            event.stopPropagation();
            onEdit();
          }}
        >
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
