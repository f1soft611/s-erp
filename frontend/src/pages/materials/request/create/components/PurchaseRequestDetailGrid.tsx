import { useMemo, type RefObject } from 'react';
import {
  F1Grid,
  type F1GridChanges,
  type F1GridRef,
} from '../../../../../shared/components/f1-grid';
import {
  createPurchaseRequestDetailColumns,
  createPurchaseRequestDetailRow,
  duplicatePurchaseRequestDetailRow,
  type OpenMaterialPicker,
  type PurchaseRequestDetailRow,
} from '../data/purchaseRequestDetail';
import type { PurchaseRequestUseTypeOption } from '../types/purchaseRequest.types';

type Props = {
  gridRef: RefObject<F1GridRef<PurchaseRequestDetailRow> | null>;
  rows: PurchaseRequestDetailRow[];
  useTypeOptions: PurchaseRequestUseTypeOption[];
  onChangesChange: (changes: F1GridChanges<PurchaseRequestDetailRow>) => void;
  onSelectionChange: (rowIds: (string | number)[]) => void;
  onOpenMaterialPicker: OpenMaterialPicker;
  disabled?: boolean;
};

export function PurchaseRequestDetailGrid({
  gridRef,
  rows,
  useTypeOptions,
  onChangesChange,
  onSelectionChange,
  onOpenMaterialPicker,
  disabled = false,
}: Props) {
  const columns = useMemo(
    () => createPurchaseRequestDetailColumns(onOpenMaterialPicker, useTypeOptions, disabled),
    [disabled, onOpenMaterialPicker, useTypeOptions],
  );

  return (
    <F1Grid
      ref={gridRef}
      ariaLabel="구매요청 상세 목록"
      storageKey="materials-purchase-request-create-detail-grid-v1"
      rows={rows}
      columns={columns}
      rowKey="rowId"
      createRow={createPurchaseRequestDetailRow}
      createDuplicate={duplicatePurchaseRequestDetailRow}
      onChangesChange={onChangesChange}
      onSelectionChange={onSelectionChange}
      showCheckbox
      height="100%"
      minHeight={260}
      allowAddRowInContextMenu={!disabled}
      allowDuplicateRowInContextMenu={!disabled}
      allowDeleteRowInContextMenu={!disabled}
      disableContextMenu={disabled}
      canExportExcel={false}
    />
  );
}
