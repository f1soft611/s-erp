import type {
  F1GridChanges,
  F1GridColumn,
} from '../../../../../shared/components/f1-grid';
import type { MasterPickerOption } from '../../../../../shared/components/master-picker/masterPicker.types';

export type QuotationDetailRow = {
  rowId: string;
  materialId: number | null;
  materialCode: string;
  materialName: string;
  materialSpec: string;
  unit: string;
  quotationQty: number;
  unitPrice: number;
  lineAmt: number;
  remark: string;
};

export type OpenMaterialPicker = (
  applyPatch: (changes: Partial<QuotationDetailRow>) => void,
) => void;

export function roundQuotationAmount(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateQuotationLineAmount(quantity: number, unitPrice: number): number {
  return roundQuotationAmount(quantity * unitPrice);
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
): F1GridColumn<QuotationDetailRow>[] {
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
      type: 'text',
      width: 90,
      editable: false,
      onValueChange: (_row, value) => snapshotEdit('unit', value),
    },
    {
      field: 'quotationQty',
      headerName: '견적수량',
      summaryType: 'sum',
      type: 'decimal',
      decimalPlaces: 2,
      width: 120,
      align: 'right',
      editable: !disabled,
      required: true,
      min: 0,
      validate: (value) => Number(value) > 0 ? true : '견적수량은 0보다 커야 합니다.',
      onValueChange: (row, value) => {
        const quotationQty = numericValue(value);
        return { quotationQty, lineAmt: calculateQuotationLineAmount(quotationQty, row.unitPrice) };
      },
    },
    {
      field: 'unitPrice',
      headerName: '견적단가',
      type: 'currency',
      decimalPlaces: 2,
      width: 130,
      align: 'right',
      editable: !disabled,
      required: true,
      min: 0,
      validate: (value) => Number(value) >= 0 ? true : '견적단가는 0 이상이어야 합니다.',
      onValueChange: (row, value) => {
        const unitPrice = numericValue(value);
        return { unitPrice, lineAmt: calculateQuotationLineAmount(row.quotationQty, unitPrice) };
      },
    },
    {
      field: 'lineAmt',
      headerName: '견적금액',
      summaryType: 'sum',
      type: 'currency',
      decimalPlaces: 2,
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
