import { Box } from '@mui/material';
import {
  F1Grid,
  type F1GridColumn,
  type F1GridDataSource,
} from '../../../../../shared/components/f1-grid';
import type { ArchivePost } from '../types/archive.types';

type ArchivePostGridProps = {
  columns: F1GridColumn<ArchivePost>[];
  dataSource: F1GridDataSource<ArchivePost>;
  onDataSourceError: (error: Error) => void;
};

export function ArchivePostGrid({
  columns,
  dataSource,
  onDataSourceError,
}: ArchivePostGridProps) {
  return (
    <Box sx={{ flex: 1, minHeight: 320, minWidth: 0, overflow: 'hidden' }}>
      <F1Grid
        ariaLabel="자료실"
        columns={columns}
        rowKey="postId"
        dataSource={dataSource}
        onDataSourceError={onDataSourceError}
        storageKey="groupware-community-archive-grid-v1"
        height="100%"
        minHeight={320}
        stripeRows
        // disableContextMenu
        // showCheckbox={false}
        allowAddRowInContextMenu={false}
        allowDeleteRowInContextMenu={false}
        allowDuplicateRowInContextMenu={false}
        canExportExcel={false}
        columnLine={false}
      />
    </Box>
  );
}
