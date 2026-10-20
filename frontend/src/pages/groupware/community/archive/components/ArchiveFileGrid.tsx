import { Box, Button, Stack } from '@mui/material';
import {
  F1Grid,
  type F1GridColumn,
  type F1GridDataSource,
} from '../../../../../shared/components/f1-grid';
import type { ArchiveFileRow } from '../types/archive.types';

type ArchiveFileGridProps = {
  dataSource: F1GridDataSource<ArchiveFileRow>;
  onDataSourceError: (error: Error) => void;
  onDownload: (row: ArchiveFileRow) => void;
  onDelete: (row: ArchiveFileRow) => void;
  canDelete: boolean;
};

function formatSize(value?: number | string | null) {
  const size = Number(value ?? 0);
  if (!Number.isFinite(size) || size <= 0) return '—';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value?: string | Date | null) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString('ko-KR');
}

export function ArchiveFileGrid({
  dataSource,
  onDataSourceError,
  onDownload,
  onDelete,
  canDelete,
}: ArchiveFileGridProps) {
  const columns: F1GridColumn<ArchiveFileRow>[] = [
    {
      field: 'fileName',
      headerName: '이름',
      flex: 1,
      renderCell: ({ row }) => (
        <Button sx={{ p: 0, minWidth: 0 }} onClick={() => onDownload(row)}>
          {row.fileName}
        </Button>
      ),
      search: { hidden: true },
    },
    {
      field: 'writerName',
      headerName: '소유자',
      align: 'center',
      width: 120,
      editable: false,
      search: { hidden: true },
      renderCell: ({ row }) => row.writerName ?? '—',
    },
    {
      field: 'uploadedAt',
      headerName: '올린 날짜',
      align: 'center',
      width: 130,
      editable: false,
      search: { hidden: true },
      renderCell: ({ row }) => formatDate(row.uploadedAt),
    },
    {
      field: 'fileSize',
      headerName: '크기',
      align: 'right',
      width: 110,
      editable: false,
      search: { hidden: true },
      renderCell: ({ row }) => formatSize(row.fileSize),
    },
    {
      field: 'boardFileId',
      headerName: '작업',
      width: 140,
      editable: false,
      search: { hidden: true },
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={0.5}>
          <Button size="small" onClick={() => onDownload(row)}>
            다운로드
          </Button>
          {canDelete && (
            <Button size="small" color="error" onClick={() => onDelete(row)}>
              삭제
            </Button>
          )}
        </Stack>
      ),
    },
  ];

  return (
    <Box sx={{ flex: 1, minHeight: 320, minWidth: 0, overflow: 'hidden' }}>
      <F1Grid
        ariaLabel="자료실"
        columns={columns}
        rowKey="boardFileId"
        dataSource={dataSource}
        onDataSourceError={onDataSourceError}
        storageKey="groupware-community-archive-file-grid-v1"
        height="100%"
        minHeight={320}
        stripeRows
        canExportExcel={false}
        columnLine={false}
      />
    </Box>
  );
}
