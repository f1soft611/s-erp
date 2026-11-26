import type {
  F1GridChanges,
  F1GridColumn,
} from '../../../../../shared/components/f1-grid';
import type { MasterPickerOption } from '../../../../../shared/components/master-picker/masterPicker.types';
import type { F1GridOption } from '../../../../../shared/components/f1-grid/types/grid.types';
import { addExactSalesDecimals, addSalesOrderAmounts, isExactSalesPolicyNumber, multiplyExactSalesDecimals, multiplySalesOrderAmount, sumExactSalesDecimals, type SalesAmountRule } from '../../../order/create/data/salesOrderAmounts';
import type { SalesOrderDecimalValue } from '../../../order/create/data/salesOrderDetail';
import { getDecimalColumnContract, resolveDecimalColumn } from '../../../../../shared/services/decimalColumnContract';
import type { GridDecimalModuleRule } from '../../../../../shared/services/gridDecimalPolicy.service';

export type QuotationDetailRow = {
  rowId: string;
  materialId: number | null;
  materialCode: string;
  materialName: string;
  materialSpec: string;
  unit: string;
  quotationQty: SalesOrderDecimalValue;
  unitPrice: SalesOrderDecimalValue;
  lineAmt: SalesOrderDecimalValue;
  remark: string;
};

export type OpenMaterialPicker = (
  applyPatch: (changes: Partial<QuotationDetailRow>) => void,
) => void;

/** 소수점 규칙이 없으면 고정 자릿수로 계산하지 않고 오류로 처리한다. */
export function calculateQuotationLineAmount(quantity: number, unitPrice: number, rule?: SalesAmountRule): number {
  if (!rule) throw new Error('소수점 정책을 불러오지 못했습니다.');
  return multiplySalesOrderAmount(quantity, unitPrice, rule, '견적금액');
}

export function calculateQuotationTotals(rows: Array<Pick<QuotationDetailRow, 'lineAmt'>>, rule?: SalesAmountRule, policy?: GridDecimalModuleRule) {
  if (!rule) return { supplyAmt: 0, vatAmt: 0, totalAmt: 0 };
  const contract = getDecimalColumnContract('sales.quotation');
  const source = policy ?? (rule && { ...rule, trailingZeros: rule.trailingZeros ?? 'FIXED' as const });
  const supplyRule = source && resolveDecimalColumn(contract.supplyAmt, source);
  const vatRule = source && resolveDecimalColumn(contract.vatAmt, source);
  const totalRule = source && resolveDecimalColumn(contract.totalAmt, source);
  const hasDistinctRules = rule && [supplyRule, vatRule, totalRule].some((item) =>
    item && (item.places !== rule.places || item.rounding !== rule.rounding));
  if (rows.some((row) => typeof row.lineAmt === 'string'
      || (supplyRule && !isExactSalesPolicyNumber(String(row.lineAmt), supplyRule.places))) || hasDistinctRules) {
    const supplyAmt = sumExactSalesDecimals(rows.map((row) => String(row.lineAmt)), supplyRule ?? rule);
    const vatAmt = multiplyExactSalesDecimals(supplyAmt, '0.1', vatRule ?? rule);
    return { supplyAmt, vatAmt, totalAmt: addExactSalesDecimals(supplyAmt, vatAmt, totalRule ?? rule) };
  }
  const supplyAmt = rows.reduce((total, row) => addSalesOrderAmounts(total, Number(row.lineAmt) || 0, rule, '공급가'), 0);
  const vatAmt = multiplySalesOrderAmount(supplyAmt, 0.1, rule, '부가세');
  return { supplyAmt, vatAmt, totalAmt: addSalesOrderAmounts(supplyAmt, vatAmt, rule, '총액') };
}

export function createQuotationDetailRow(): QuotationDetailRow {
  return {
    rowId: `quotation-line-${crypto.randomUUID()}`,
    materialId: null,
    materialCode: '',
    materialName: '',
    materialSpec: '',
    unit: '',
    quotationQty: 0,
    unitPrice: 0,
    lineAmt: 0,
    remark: '',
  };
}

export function duplicateQuotationDetailRow(row: QuotationDetailRow): QuotationDetailRow {
  return { ...row, rowId: createQuotationDetailRow().rowId };
}

export function resolveActiveQuotationRows(
  baseRows: QuotationDetailRow[],
  changes: F1GridChanges<QuotationDetailRow>,
): QuotationDetailRow[] {
  const deletedIds = new Set(changes.deletedRows.map((row) => row.rowId));
  const updatedById = new Map(changes.updatedRows.map((row) => [row.rowId, row]));
  return [
    ...baseRows.filter((row) => !deletedIds.has(row.rowId)).map((row) => updatedById.get(row.rowId) ?? row),
    ...changes.insertedRows.filter((row) => !deletedIds.has(row.rowId)),
  ];
}

function numericValue(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function snapshotEdit<T extends 'materialCode' | 'materialName' | 'materialSpec' | 'unit'>(
  field: T,
  value: unknown,
): Partial<QuotationDetailRow> {
  if (isMasterPickerOption(value)) {
    const detailValue = (label: string) => value.details?.find((detail) => detail.label === label)?.value ?? '';
    return {
      materialId: value.id,
      materialCode: value.code,
      materialName: value.name,
      materialSpec: detailValue('품목규격'),
      unit: detailValue('단위'),
    };
  }
  return { materialId: null, [field]: String(value ?? '') };
}

export function createQuotationDetailColumns(
  onOpenMaterialPicker: OpenMaterialPicker,
  disabled = false,
  unitOptions: F1GridOption[] = [],
  amountRule?: SalesAmountRule,
  onCalculationError?: (error: Error) => void,
  policy?: GridDecimalModuleRule,
): F1GridColumn<QuotationDetailRow>[] {
  const contract = getDecimalColumnContract('sales.quotation');
  const source = policy ?? (amountRule && { ...amountRule, trailingZeros: amountRule.trailingZeros ?? 'FIXED' as const });
  const lineRule = source && resolveDecimalColumn(contract.lineAmt, source);
  const columnOptions = (field: string) => {
    const { type, ...decimal } = contract[field];
    return { type, decimal };
  };
  const calculate = (quantity: SalesOrderDecimalValue, unitPrice: SalesOrderDecimalValue) => {
    try {
      return { lineAmt: amountRule && (typeof quantity === 'string' || typeof unitPrice === 'string')
        ? multiplyExactSalesDecimals(String(quantity), String(unitPrice), lineRule ?? amountRule)
        : calculateQuotationLineAmount(Number(quantity), Number(unitPrice), lineRule ?? amountRule) };
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      onCalculationError?.(error);
      return null;
    }
  };
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
      onValueChange: (_row, value) => {
        if (!isMasterPickerOption(value)) {
          throw new Error('품목 선택 항목을 확인해 주세요.');
        }
        return snapshotEdit('materialCode', value);
      },
      onOpenCodePicker: (_row, applyPatch) => {
        if (!disabled) onOpenMaterialPicker(applyPatch);
      },
    },
    {
      field: 'materialName',
      headerName: '품목명',
      type: 'text',
      width: 190,
      editable: !disabled,
      required: true,
      validate: (_value, row) =>
        row.materialName.trim() ? true : '품목명을 입력해 주세요.',
      onValueChange: (_row, value) => ({
        materialId: null,
        materialCode: '',
        materialName: String(value ?? ''),
        materialSpec: '',
        unit: '',
      }),
    },
    {
      field: 'materialSpec',
      headerName: '규격',
      type: 'text',
      width: 140,
      editable: false,
      onValueChange: (_row, value) => snapshotEdit('materialSpec', value),
    },
    {
      field: 'unit',
      headerName: '단위',
      type: 'select',
      width: 90,
      editable: !disabled && unitOptions.length > 0,
      options: [{ value: '', label: '선택 안 함' }, ...unitOptions],
      onValueChange: (_row, value) => ({ unit: String(value ?? '') }),
    },
    {
      field: 'quotationQty',
      headerName: '견적수량',
      summaryType: 'sum',
      ...columnOptions('quotationQty'),
      exactDecimal: Boolean(amountRule),
      width: 120,
      align: 'right',
      editable: !disabled,
      required: true,
      min: 0,
      validate: (value) => Number(value) > 0 ? true : '견적수량은 0보다 커야 합니다.',
      onValueChange: (row, value) => {
        const quotationQty = amountRule && (typeof value === 'string' || value == null) ? String(value ?? '') : numericValue(value);
        const amounts = calculate(quotationQty, row.unitPrice);
        return amounts ? { quotationQty, ...amounts } : typeof quotationQty === 'string' ? { quotationQty } : {};
      },
    },
    {
      field: 'unitPrice',
      headerName: '견적단가',
      ...columnOptions('unitPrice'),
      exactDecimal: Boolean(amountRule),
      width: 130,
      align: 'right',
      editable: !disabled,
      required: true,
      min: 0,
      validate: (value) => Number(value) >= 0 ? true : '견적단가는 0 이상이어야 합니다.',
      onValueChange: (row, value) => {
        const unitPrice = amountRule && (typeof value === 'string' || value == null) ? String(value ?? '') : numericValue(value);
        const amounts = calculate(row.quotationQty, unitPrice);
        return amounts ? { unitPrice, ...amounts } : typeof unitPrice === 'string' ? { unitPrice } : {};
      },
    },
    {
      field: 'lineAmt',
      headerName: '견적금액',
      summaryType: 'sum',
      ...columnOptions('lineAmt'),
      exactDecimal: Boolean(amountRule),
      width: 140,
      align: 'right',
      editable: false,
    },
    {
      field: 'remark',
      headerName: '비고',
      type: 'text',
      width: 180,
      editable: !disabled,
    },
  ];
}

function isMasterPickerOption(value: unknown): value is MasterPickerOption {
  return typeof value === 'object' && value !== null
    && 'id' in value && typeof value.id === 'number' && Number.isSafeInteger(value.id)
    && value.id > 0 && 'code' in value && typeof value.code === 'string'
    && 'name' in value && typeof value.name === 'string';
}
