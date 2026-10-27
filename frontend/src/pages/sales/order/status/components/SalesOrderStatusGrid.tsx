import { F1Grid } from '../../../../../shared/components/f1-grid';
import { createSalesOrderStatusColumns } from '../data/salesOrderStatusColumns';
import type { SalesOrderStatusRow } from '../types/salesOrderStatus.types';

type SalesOrderStatusGridProps = {
  rows: SalesOrderStatusRow[];
  loading: boolean;
  canExportExcel: boolean;
};

const columns = createSalesOrderStatusColumns();

export function SalesOrderStatusGrid({ rows, loading, canExportExcel }: SalesOrderStatusGridProps) {
  return (
    <F1Grid
      ariaLabel="수주현황 목록"
      columns={columns}
      storageKey="salesOrderStatusGrid"
      rowKey="salesOrderDetailId"
      rows={rows}
      loading={loading}
      selectRowOnContextMenu={false}
      allowAddRowInContextMenu={false}
      allowDuplicateRowInContextMenu={false}
      allowDeleteRowInContextMenu={false}
      canExportExcel={canExportExcel}
      height="100%"
      minHeight={320}
    />
  );
}
