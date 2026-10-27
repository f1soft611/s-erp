import type { F1GridColumn } from '../../../../../shared/components/f1-grid';
import type { MasterPickerOption } from '../../../../../shared/components/master-picker/masterPicker.types';
import {
  calculateSalesOrderAmounts,
  roundSalesOrderAmount,
  type SalesOrderAmounts,
} from './salesOrderAmounts';

export type SalesOrderDetailRow = SalesOrderAmounts & {
  rowId: string;
  materialId: number | null;
  materialCode: string;
  materialName: string;
  orderQty: number;
  unitPrice: number;
  deliveryDt: string;
  shippedQty: number;
  lineStatus: string;
};

export type OpenMaterialPicker = (
  applyPatch: (changes: Partial<SalesOrderDetailRow>) => void,
) => void;

export function createSalesOrderDetailRow(): SalesOrderDetailRow {
  return {
    rowId: `order-line-${crypto.randomUUID()}`,
    materialId: null,
    materialCode: '',
    materialName: '',
    orderQty: 0,
    unitPrice: 0,
    supplyAmount: 0,
    vatAmount: 0,
    totalAmount: 0,
    deliveryDt: '',
    shippedQty: 0,
    lineStatus: '대기',
  };
}

function numericValue(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function createSalesOrderDetailColumns(
  onOpenMaterialPicker: OpenMaterialPicker,
  disabled = false,
): F1GridColumn<SalesOrderDetailRow>[] {
  const recalculateAmounts = (quantity: number, unitPrice: number) => ({
    orderQty: quantity,
    unitPrice,
    ...calculateSalesOrderAmounts(quantity, unitPrice),
  });

  return [
    {
      field: 'rowId',
      headerName: '행',
      type: 'rownumber',
      width: 56,
      align: 'center',
      pinned: 'left',
      form: { hidden: true },
      search: { hidden: true },
    },
    {
      field: 'materialCode',
      headerName: '품목코드',
      type: 'code',
      width: 140,
      pinned: 'left',
      editable: !disabled,
      required: true,
      validate: (_value, row) =>
        Number.isSafeInteger(row.materialId) && Number(row.materialId) > 0
          ? true
          : '품목을 선택해 주세요.',
      onValueChange: (_row, value) => {
        if (!isMasterPickerOption(value)) {
          throw new Error('품목 선택 항목을 확인해 주세요.');
        }
        return {
          materialId: value.id,
          materialCode: value.code,
          materialName: value.name,
        };
      },
      onOpenCodePicker: (_row, applyPatch) => {
        if (!disabled) {
          onOpenMaterialPicker(applyPatch);
        }
      },
    },
    {
      field: 'materialName',
      headerName: '품목명',
      type: 'text',
      width: 190,
      editable: false,
    },
    {
      field: 'orderQty',
      headerName: '주문수량',
      type: 'decimal',
      decimalPlaces: 2,
      width: 120,
      align: 'right',
      editable: !disabled,
      required: true,
      min: 0,
      validate: (value) =>
        Number(value) > 0 ? true : '주문수량은 0보다 커야 합니다.',
      onValueChange: (row, value) =>
        recalculateAmounts(numericValue(value), row.unitPrice),
    },
    {
      field: 'unitPrice',
      headerName: '단가',
      type: 'currency',
      decimalPlaces: 2,
      width: 130,
      align: 'right',
      editable: !disabled,
      required: true,
      min: 0,
      onValueChange: (row, value) =>
        recalculateAmounts(row.orderQty, numericValue(value)),
    },
    {
      field: 'supplyAmount',
      headerName: '공급가',
      type: 'currency',
      decimalPlaces: 2,
      width: 130,
      align: 'right',
      editable: false,
    },
    {
      field: 'vatAmount',
      headerName: '부가세',
      type: 'currency',
      decimalPlaces: 2,
      width: 130,
      align: 'right',
      editable: !disabled,
      min: 0,
      onValueChange: (row, value) => {
        const vatAmount = roundSalesOrderAmount(numericValue(value));
        return {
          vatAmount,
          totalAmount: roundSalesOrderAmount(row.supplyAmount + vatAmount),
        };
      },
    },
    {
      field: 'totalAmount',
      headerName: '라인합계',
      type: 'currency',
      decimalPlaces: 2,
      width: 140,
      align: 'right',
      editable: false,
    },
    {
      field: 'deliveryDt',
      headerName: '납기',
      type: 'date',
      width: 130,
      editable: !disabled,
    },
    {
      field: 'shippedQty',
      headerName: '출하수량',
      type: 'decimal',
      decimalPlaces: 2,
      width: 120,
      align: 'right',
      editable: false,
    },
    {
      field: 'lineStatus',
      headerName: '라인상태',
      type: 'text',
      width: 110,
      align: 'center',
      editable: false,
    },
  ];
}

function isMasterPickerOption(value: unknown): value is MasterPickerOption {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'number' &&
    Number.isSafeInteger(value.id) &&
    value.id > 0 &&
    'code' in value &&
    typeof value.code === 'string' &&
    'name' in value &&
    typeof value.name === 'string'
  );
}
