import { useMemo } from 'react';
import { F1Grid } from '../../../../../shared/components/f1-grid';
import { createSalesOrderStatusColumns } from '../data/salesOrderStatusColumns';
import type { SalesOrderStatusRow } from '../types/salesOrderStatus.types';

type SalesOrderStatusGridProps = {
  rows: SalesOrderStatusRow[];
  loading: boolean;
  canExportExcel: boolean;
  onOpenOrder: (row: SalesOrderStatusRow) => void;
};

export function SalesOrderStatusGrid({
  rows,
  loading,
  canExportExcel,
  onOpenOrder,
}: SalesOrderStatusGridProps) {
  const columns = useMemo(
    () => createSalesOrderStatusColumns({ onOpenOrder }),
    [onOpenOrder],
  );

  return (
    <F1Grid
      ariaLabel="수주현황 목록"
      columns={columns}
      storageKey="salesOrderStatusGrid"
      rowKey="salesOrderDetailId"
      rows={rows}
      loading={loading}
      showCheckbox={false}
      selectionMode="row"
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
