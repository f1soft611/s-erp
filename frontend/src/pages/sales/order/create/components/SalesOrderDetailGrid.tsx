import { useMemo, type RefObject } from 'react';
import {
  F1Grid,
  type F1GridChanges,
  type F1GridRef,
} from '../../../../../shared/components/f1-grid';
import {
  createSalesOrderDetailColumns,
  createSalesOrderDetailRow,
  type OpenMaterialPicker,
  type SalesOrderDetailRow,
} from '../data/salesOrderDetail';

type Props = {
  gridRef: RefObject<F1GridRef<SalesOrderDetailRow> | null>;
  onChangesChange: (changes: F1GridChanges<SalesOrderDetailRow>) => void;
  onSelectionChange: (rowIds: (string | number)[]) => void;
  onOpenMaterialPicker: OpenMaterialPicker;
  disabled?: boolean;
};

export function SalesOrderDetailGrid({
  gridRef,
  onChangesChange,
  onSelectionChange,
  onOpenMaterialPicker,
  disabled = false,
}: Props) {
  const columns = useMemo(
    () => createSalesOrderDetailColumns(onOpenMaterialPicker, disabled),
    [disabled, onOpenMaterialPicker],
  );

  return (
    <F1Grid
      ref={gridRef}
      ariaLabel="수주 상세 목록"
      storageKey="sales-order-create-detail-grid-v1"
      rows={[]}
      columns={columns}
      rowKey="rowId"
      createRow={createSalesOrderDetailRow}
      onChangesChange={onChangesChange}
      onSelectionChange={onSelectionChange}
      showCheckbox
      height="100%"
      minHeight={260}
      allowAddRowInContextMenu={!disabled}
      allowDeleteRowInContextMenu={!disabled}
      disableContextMenu={disabled}
      canExportExcel={false}
    />
  );
}
