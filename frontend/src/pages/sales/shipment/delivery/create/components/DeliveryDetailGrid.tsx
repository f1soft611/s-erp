import { useMemo, type RefObject } from 'react';
import { F1Grid, type F1GridChanges, type F1GridColumn, type F1GridRef } from '../../../../../../shared/components/f1-grid';
import type { DeliveryRow } from '../types/salesDelivery.types';
import type { MasterPickerOption } from '../../../../../../shared/components/master-picker/masterPicker.types';
import { deliveryAmounts, newDeliveryRow } from '../services/salesDelivery.service';
import { usePolicyDecimalRule } from '../../../../../../shared/components/f1-grid/core/gridDecimalPolicyContext';
import { getDecimalColumnContract } from '../../../../../../shared/services/decimalColumnContract';
type Props = {
  rows: DeliveryRow[];
  gridRef: RefObject<F1GridRef<DeliveryRow> | null>;
  disabled: boolean;
  source: boolean;
  onChanges: (changes: F1GridChanges<DeliveryRow>) => void;
  onSelection: (ids: (string | number)[]) => void;
  onMaterial: (patch: (changes: Partial<DeliveryRow>) => void) => void;
  onCalculationError?: (error: Error) => void;
};
export function DeliveryDetailGrid({ rows, gridRef, disabled, source, onChanges, onSelection, onMaterial, onCalculationError }: Props) {
  const policy = usePolicyDecimalRule();
  const rule = policy && ('places' in policy ? policy : policy.currency);
  const columns = useMemo<F1GridColumn<DeliveryRow>[]>(() => {
    const contract = getDecimalColumnContract('sales.delivery');
    const columnOptions = (field: string) => {
      const { type, ...decimal } = contract[field];
      return { type, decimal };
    };
    const calculate = (qty: number | string, price: number | string, vat?: number | string) => {
      try { return deliveryAmounts(qty, price, vat, rule, policy); }
      catch (error) {
        if (!(error instanceof Error)) throw error;
        onCalculationError?.(error);
        return null;
      }
    };
    return [
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
    { field: 'deliveryQty', headerName: '출하수량', ...columnOptions('deliveryQty'), exactDecimal: Boolean(rule), width: 120, align: 'right',
      editable: !disabled, required: true, min: 0, validate: (value) => Number(value) > 0 || '수량은 0보다 커야 합니다.',
      onValueChange: (row, value) => {
        const quantity = rule && (typeof value === 'string' || value == null) ? String(value ?? '') : Number(value);
        const amounts = calculate(quantity, row.unitPrice);
        return amounts ? { deliveryQty: quantity, ...amounts } : typeof quantity === 'string' ? { deliveryQty: quantity } : {};
      } },
    { field: 'unitPrice', headerName: '단가', ...columnOptions('unitPrice'), exactDecimal: Boolean(rule), width: 120, align: 'right', min: 0,
      editable: !disabled, required: true, onValueChange: (row, value) => {
        const price = rule && (typeof value === 'string' || value == null) ? String(value ?? '') : Number(value);
        const amounts = calculate(row.deliveryQty, price);
        return amounts ? { unitPrice: price, ...amounts } : typeof price === 'string' ? { unitPrice: price } : {};
      } },
    { field: 'supplyAmt', headerName: '공급가', ...columnOptions('supplyAmt'), exactDecimal: Boolean(rule), width: 130, align: 'right', editable: false },
    { field: 'vatAmt', headerName: 'VAT', ...columnOptions('vatAmt'), exactDecimal: Boolean(rule), width: 120, align: 'right', editable: !disabled, min: 0,
      onValueChange: (row, value) => {
        const vat = rule && (typeof value === 'string' || value == null) ? String(value ?? '') : Number(value);
        return calculate(row.deliveryQty, row.unitPrice, vat) ?? (typeof vat === 'string' ? { vatAmt: vat } : {});
      } },
    { field: 'totalAmt', headerName: '합계', ...columnOptions('totalAmt'), exactDecimal: Boolean(rule), width: 140, align: 'right', editable: false },
    ];
  }, [disabled, source, onMaterial, rule, policy, onCalculationError]);
  return <F1Grid ref={gridRef} ariaLabel="출하 상세 목록" rows={rows} columns={columns} rowKey="rowId"
    storageKey="sales-delivery-details-v1" createRow={newDeliveryRow} onChangesChange={onChanges}
    onSelectionChange={onSelection} showCheckbox height="100%" minHeight={260}
    allowAddRowInContextMenu={!disabled && !source} allowDuplicateRowInContextMenu={false}
    allowDeleteRowInContextMenu={!disabled} disableContextMenu={disabled} canExportExcel={false} />;
}
