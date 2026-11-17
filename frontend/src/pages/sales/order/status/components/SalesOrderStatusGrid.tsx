import { useMemo } from 'react';
import { F1Grid } from '../../../../../shared/components/f1-grid';
import { createSalesOrderStatusColumns } from '../data/salesOrderStatusColumns';
import type { SalesOrderStatusRow } from '../types/salesOrderStatus.types';
import type { SalesOrderCodeOption } from '../../services/salesOrderCommonCode.service';

type SalesOrderStatusGridProps = {
  rows: SalesOrderStatusRow[];
  loading: boolean;
  canExportExcel: boolean;
  onOpenOrder: (row: SalesOrderStatusRow) => void;
  orderStatusOptions?: SalesOrderCodeOption[];
  progressStatusOptions?: SalesOrderCodeOption[];
  deliveryMethodOptions?: SalesOrderCodeOption[];
};

export function SalesOrderStatusGrid({
  rows,
  loading,
  canExportExcel,
  onOpenOrder,
  orderStatusOptions = [],
  progressStatusOptions = [],
  deliveryMethodOptions = [],
}: SalesOrderStatusGridProps) {
  const columns = useMemo(
    () =>
      createSalesOrderStatusColumns({
        onOpenOrder,
        orderStatusOptions,
        progressStatusOptions,
        deliveryMethodOptions,
      }),
    [deliveryMethodOptions, onOpenOrder, orderStatusOptions, progressStatusOptions],
  );

  return (
    <F1Grid
      ariaLabel="수주현황 목록"
      columns={columns}
      storageKey="salesOrderStatusGrid"
      rowKey="salesOrderDetailId"
      rows={rows}
      loading={loading}
      features={[{ ftype: 'summary', dock: 'bottom' }]}
      showCheckbox
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
