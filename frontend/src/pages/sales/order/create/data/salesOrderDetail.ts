import type {
  F1GridChanges,
  F1GridColumn,
} from '../../../../../shared/components/f1-grid';
import type { MasterPickerOption } from '../../../../../shared/components/master-picker/masterPicker.types';
import { getDecimalColumnContract, resolveDecimalColumn } from '../../../../../shared/services/decimalColumnContract';
import type { GridDecimalModuleRule } from '../../../../../shared/services/gridDecimalPolicy.service';
import {
  calculateSalesOrderAmounts,
  calculateExactSalesAmounts,
  addExactSalesDecimals,
  addSalesOrderAmounts,
  roundSalesOrderAmount,
  type SalesOrderAmounts,
  type SalesAmountRule,
} from './salesOrderAmounts';
import {
  getSalesOrderCodeLabel,
  type SalesOrderCodeOption,
} from '../../services/salesOrderCommonCode.service';

export type SalesOrderDecimalValue = number | string;

export type SalesOrderDetailRow = Omit<SalesOrderAmounts, 'supplyAmount' | 'vatAmount' | 'totalAmount'> & {
  rowId: string;
  materialId: number | null;
  materialCode: string;
  materialName: string;
  orderQty: SalesOrderDecimalValue;
  unitPrice: SalesOrderDecimalValue;
  supplyAmount: SalesOrderDecimalValue;
  vatAmount: SalesOrderDecimalValue;
  totalAmount: SalesOrderDecimalValue;
  deliveryDt: string;
  shippedQty: SalesOrderDecimalValue;
  lineStatus: string;
};

export type OpenMaterialPicker = (
  applyPatch: (changes: Partial<SalesOrderDetailRow>) => void,
) => void;

export function createSalesOrderDetailRow(deliveryDt = ''): SalesOrderDetailRow {
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
    deliveryDt,
    shippedQty: 0,
    lineStatus: '대기',
  };
}

export function duplicateSalesOrderDetailRow(
  row: SalesOrderDetailRow,
): SalesOrderDetailRow {
  return {
    ...row,
    rowId: createSalesOrderDetailRow().rowId,
    shippedQty: 0,
    lineStatus: '대기',
  };
}

function numericValue(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function resolveActiveSalesOrderRows(
  baseRows: SalesOrderDetailRow[],
  changes: F1GridChanges<SalesOrderDetailRow>,
): SalesOrderDetailRow[] {
  const deletedIds = new Set(changes.deletedRows.map((row) => row.rowId));
  const updatedById = new Map(
    changes.updatedRows.map((row) => [row.rowId, row]),
  );
  return [
    ...baseRows
      .filter((row) => !deletedIds.has(row.rowId))
      .map((row) => updatedById.get(row.rowId) ?? row),
    ...changes.insertedRows.filter((row) => !deletedIds.has(row.rowId)),
  ];
}

export function createSalesOrderDetailColumns(
  onOpenMaterialPicker: OpenMaterialPicker,
  disabled = false,
  progressStatusOptions: SalesOrderCodeOption[] = [],
  onCalculationError?: (error: Error) => void,
  amountRule?: SalesAmountRule,
  policy?: GridDecimalModuleRule,
): F1GridColumn<SalesOrderDetailRow>[] {
  const contract = getDecimalColumnContract('sales.order');
  const rules = amountRule && {
    supplyAmount: resolveDecimalColumn(contract.supplyAmount, policy ?? { ...amountRule, trailingZeros: amountRule.trailingZeros ?? 'FIXED' }),
    vatAmount: resolveDecimalColumn(contract.vatAmount, policy ?? { ...amountRule, trailingZeros: amountRule.trailingZeros ?? 'FIXED' }),
    totalAmount: resolveDecimalColumn(contract.totalAmount, policy ?? { ...amountRule, trailingZeros: amountRule.trailingZeros ?? 'FIXED' }),
  };
  const columnOptions = (field: string) => {
    const { type, ...decimal } = contract[field];
    return { type, decimal };
  };
  const recalculateAmounts = (quantity: SalesOrderDecimalValue, unitPrice: SalesOrderDecimalValue) => {
    try {
      return {
        orderQty: quantity,
        unitPrice,
        ...(amountRule && (typeof quantity === 'string' || typeof unitPrice === 'string')
          ? calculateExactSalesAmounts(String(quantity), String(unitPrice), amountRule, rules)
          : calculateSalesOrderAmounts(Number(quantity), Number(unitPrice), amountRule, rules)),
      };
    } catch (cause) {
      if (!(cause instanceof Error)) throw cause;
      onCalculationError?.(cause);
      return amountRule && (typeof quantity === 'string' || typeof unitPrice === 'string')
        ? { orderQty: quantity, unitPrice } : {};
    }
  };

  return [
    {
      field: 'rowId',
      headerName: 'No',
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
      summaryType: 'sum',
      ...columnOptions('orderQty'),
      exactDecimal: Boolean(amountRule),
      width: 120,
      align: 'right',
      editable: !disabled,
      required: true,
      min: 0,
      validate: (value) =>
        Number(value) > 0 ? true : '주문수량은 0보다 커야 합니다.',
      onValueChange: (row, value) =>
        recalculateAmounts(amountRule && (typeof value === 'string' || value == null) ? String(value ?? '') : numericValue(value), row.unitPrice),
    },
    {
      field: 'unitPrice',
      headerName: '단가',
      ...columnOptions('unitPrice'),
      exactDecimal: Boolean(amountRule),
      width: 130,
      align: 'right',
      editable: !disabled,
      required: true,
      min: 0,
      onValueChange: (row, value) =>
        recalculateAmounts(row.orderQty, amountRule && (typeof value === 'string' || value == null) ? String(value ?? '') : numericValue(value)),
    },
    {
      field: 'supplyAmount',
      headerName: '공급가',
      summaryType: 'sum',
      ...columnOptions('supplyAmount'),
      exactDecimal: Boolean(amountRule),
      width: 130,
      align: 'right',
      editable: false,
    },
    {
      field: 'vatAmount',
      headerName: '부가세',
      summaryType: 'sum',
      ...columnOptions('vatAmount'),
      exactDecimal: Boolean(amountRule),
      width: 130,
      align: 'right',
      editable: !disabled,
      min: 0,
      onValueChange: (row, value) => {
        try {
          if (amountRule && (typeof value === 'string' || value == null)) {
            const text = String(value ?? '');
            return { vatAmount: text, totalAmount: addExactSalesDecimals(String(row.supplyAmount), text, rules?.totalAmount ?? amountRule) };
          }
          const vatAmount = roundSalesOrderAmount(numericValue(value), '부가세', rules?.vatAmount ?? amountRule);
          return {
            vatAmount,
            totalAmount: amountRule ? addSalesOrderAmounts(Number(row.supplyAmount), vatAmount, rules?.totalAmount ?? amountRule, '계산된 라인 합계') : roundSalesOrderAmount(
              Number(row.supplyAmount) + vatAmount,
              '계산된 라인 합계',
            ),
          };
        } catch (cause) {
          if (!(cause instanceof Error)) throw cause;
          onCalculationError?.(cause);
          return amountRule && (typeof value === 'string' || value == null) ? { vatAmount: String(value ?? '') } : {};
        }
      },
    },
    {
      field: 'totalAmount',
      headerName: '라인합계',
      summaryType: 'sum',
      ...columnOptions('totalAmount'),
      exactDecimal: Boolean(amountRule),
      width: 140,
      align: 'right',
      editable: false,
    },
    {
      field: 'deliveryDt',
      headerName: '납기일',
      type: 'date',
      align: 'center',
      width: 130,
      editable: !disabled,
    },
    {
      field: 'shippedQty',
      headerName: '출하수량',
      type: 'number',
      exactDecimal: Boolean(amountRule),
      width: 120,
      align: 'right',
      editable: false,
    },
    {
      field: 'lineStatus',
      headerName: '진행상태',
      type: 'text',
      width: 110,
      align: 'center',
      editable: false,
      renderCell: ({ row }) =>
        getSalesOrderCodeLabel(progressStatusOptions, row.lineStatus),
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
