import { useMemo } from 'react';
import { Box, Chip, Paper, Typography } from '@mui/material';
import { F1Grid, type F1GridColumn, type F1GridRowId } from '../../../../../shared/components/f1-grid';
import type {
  WorkStandardListRow,
  WorkStandardListSegment,
} from '../types/workStandard.types';

const SEGMENTS: WorkStandardListSegment[] = ['전체', '제품', '반제품', '샘플'];

type Props = {
  rows: WorkStandardListRow[];
  segment: WorkStandardListSegment;
  onSegmentChange: (segment: WorkStandardListSegment) => void;
  selectedId: number | null;
  onSelect: (workStandardId: number) => void;
  loading?: boolean;
};

const columns: F1GridColumn<WorkStandardListRow>[] = [
  { field: 'itemAccount', headerName: '계정', width: 60, align: 'center', editable: false },
  {
    field: 'materialName',
    headerName: '품목명',
    flex: 1,
    width: 120,
    editable: false,
    getValue: (row) => `${row.materialCode} ${row.materialName}`,
    renderCell: ({ row }) => (
      <Box sx={{ minWidth: 0, overflow: 'hidden' }} title={`${row.materialCode} ${row.materialName}`}>
        <Typography variant="caption" color="text.secondary" component="span" sx={{ mr: 0.5 }}>
          {row.materialCode}
        </Typography>
        <Typography variant="body2" component="span" noWrap>
          {row.materialName}
        </Typography>
      </Box>
    ),
  },
  {
    field: 'version',
    headerName: '버전',
    width: 52,
    align: 'center',
    editable: false,
    getValue: (row) => `v${row.version}`,
  },
  {
    field: 'versionStatus',
    headerName: '상태',
    width: 64,
    align: 'center',
    editable: false,
    renderCell: ({ row }) => (
      <Chip
        size="small"
        label={row.versionStatus}
        color={row.versionStatus === '양산' ? 'success' : row.versionStatus === '샘플' ? 'warning' : 'default'}
        variant="outlined"
        sx={{ height: 22, fontSize: 12 }}
      />
    ),
  },
];

export function WorkStandardListPanel({
  rows,
  segment,
  onSegmentChange,
  selectedId,
  onSelect,
  loading = false,
}: Props) {
  const initialSelectedRowIds = useMemo<F1GridRowId[]>(
    () => (selectedId === null ? [] : [selectedId]),
    [selectedId],
  );

  return (
    <Paper
      variant="outlined"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: { xs: 320, lg: 0 },
        minWidth: 0,
        overflow: 'hidden',
        borderRadius: 1,
      }}
    >
      <Box sx={{ p: { xs: 1.5, sm: 2 }, pb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          작업표준서 목록
        </Typography>
        <Box
          role="group"
          aria-label="작업표준서 구분"
          sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1 }}
        >
          {SEGMENTS.map((value) => (
            <Chip
              key={value}
              label={value}
              size="small"
              clickable
              aria-pressed={segment === value}
              color={segment === value ? 'primary' : 'default'}
              variant={segment === value ? 'filled' : 'outlined'}
              onClick={() => onSegmentChange(value)}
            />
          ))}
        </Box>
      </Box>
      <Box sx={{ flex: 1, minHeight: 260, minWidth: 0, overflow: 'hidden', px: 1, pb: 1 }}>
        <F1Grid
          key={rows.map((row) => row.workStandardId).join(',')}
          ariaLabel="작업표준서 목록"
          storageKey="work-standard-recipe-list-grid-v1"
          rows={rows}
          columns={columns}
          rowKey="workStandardId"
          selectionMode="row"
          multiSelect={false}
          initialSelectedRowIds={initialSelectedRowIds}
          onSelectionChange={(rowIds) => {
            const [rowId] = rowIds;
            if (rowId !== undefined && Number(rowId) !== selectedId) onSelect(Number(rowId));
          }}
          height="100%"
          minHeight={260}
          disableContextMenu
          canExportExcel={false}
          loading={loading}
        />
      </Box>
    </Paper>
  );
}
