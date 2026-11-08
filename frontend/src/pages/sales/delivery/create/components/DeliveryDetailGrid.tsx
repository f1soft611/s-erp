import { useMemo, type RefObject } from 'react';
import { F1Grid, type F1GridChanges, type F1GridColumn, type F1GridRef } from '../../../../../shared/components/f1-grid';
import type { DeliveryRow } from '../types/salesDelivery.types';
import type { MasterPickerOption } from '../../../../../shared/components/master-picker/masterPicker.types';
import { deliveryAmounts, newDeliveryRow } from '../services/salesDelivery.service';

export function activeDeliveryRows(base: DeliveryRow[], changes: F1GridChanges<DeliveryRow>): DeliveryRow[] {
  const deleted = new Set(changes.deletedRows.map((row) => row.rowId));
  const updated = new Map(changes.updatedRows.map((row) => [row.rowId, row]));
  return [...base.filter((row) => !deleted.has(row.rowId)).map((row) => updated.get(row.rowId) ?? row),
    ...changes.insertedRows.filter((row) => !deleted.has(row.rowId))];
}
type Props = {
  rows: DeliveryRow[];
  gridRef: RefObject<F1GridRef<DeliveryRow> | null>;
  disabled: boolean;
  source: boolean;
  onChanges: (changes: F1GridChanges<DeliveryRow>) => void;
  onSelection: (ids: (string | number)[]) => void;
  onMaterial: (patch: (changes: Partial<DeliveryRow>) => void) => void;
};
export function DeliveryDetailGrid({ rows, gridRef, disabled, source, onChanges, onSelection, onMaterial }: Props) {
  const columns = useMemo<F1GridColumn<DeliveryRow>[]>(() => [
    { field: 'rowId', headerName: '행', type: 'rownumber', width: 56, align: 'center' },
    { field: 'materialCode', headerName: '품목코드', type: 'code', width: 140, align: 'center', required: true,
      editable: !disabled && !source, onOpenCodePicker: (_row, patch) => { onMaterial(patch); return undefined; },
      onValueChange: (_row, value) => {
        const material = value as MasterPickerOption;
        if (!Number.isSafeInteger(material?.id) || material.id <= 0) return {};
        return { materialId: material.id, materialCode: material.code, materialName: material.name };
      },
      validate: (_value, row) => Number(row.materialId) > 0 || '품목을 선택해 주세요.' },
    { field: 'materialName', headerName: '품목명', width: 180, align: 'center', editable: false },
    { field: 'unit', headerName: '단위', width: 80, align: 'center', editable: false },
    { field: 'deliveryQty', headerName: '출하수량', type: 'decimal', decimalPlaces: 2, width: 120, align: 'right',
      editable: !disabled, required: true, min: 0, validate: (value) => Number(value) > 0 || '수량은 0보다 커야 합니다.',
      onValueChange: (row, value) => ({ deliveryQty: Number(value), ...deliveryAmounts(Number(value), row.unitPrice) }) },
    { field: 'unitPrice', headerName: '단가', type: 'currency', decimalPlaces: 2, width: 120, align: 'right', min: 0,
      editable: !disabled, required: true, onValueChange: (row, value) => ({
        unitPrice: Number(value), ...deliveryAmounts(row.deliveryQty, Number(value)),
      }) },
    { field: 'supplyAmt', headerName: '공급가', type: 'currency', decimalPlaces: 2, width: 130, align: 'right', editable: false },
    { field: 'vatAmt', headerName: 'VAT', type: 'currency', decimalPlaces: 2, width: 120, align: 'right', editable: !disabled, min: 0,
      onValueChange: (row, value) => deliveryAmounts(row.deliveryQty, row.unitPrice, Number(value)) },
    { field: 'totalAmt', headerName: '합계', type: 'currency', decimalPlaces: 2, width: 140, align: 'right', editable: false },
  ], [disabled, source, onMaterial]);
  return <F1Grid ref={gridRef} ariaLabel="출하 상세 목록" rows={rows} columns={columns} rowKey="rowId"
    storageKey="sales-delivery-details-v1" createRow={newDeliveryRow} onChangesChange={onChanges}
    onSelectionChange={onSelection} showCheckbox height="100%" minHeight={260}
    allowAddRowInContextMenu={!disabled && !source} allowDuplicateRowInContextMenu={false}
    allowDeleteRowInContextMenu={!disabled} disableContextMenu={disabled} canExportExcel={false} />;
}
