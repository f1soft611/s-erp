import type { F1GridColumn } from '../../../../../shared/components/f1-grid';
import type { MasterPickerOption } from '../../../../../shared/components/master-picker/masterPicker.types';
import type { PurchaseRequestUseTypeOption } from '../types/purchaseRequest.types';

export type PurchaseRequestDetailRow = {
  rowId: string;
  purchaseRequestDetailId: number | null;
  materialId: number | null;
  materialCode: string;
  materialName: string;
  materialSpec: string;
  unit: string;
  requestQty: number;
  requestDeliveryDt: string;
  useType: string;
  requestRemark: string;
  confirmQty: number | null;
};

/** 품목 선택기에서 규격·단위까지 함께 넘겨받기 위한 옵션 */
export type PurchaseMaterialOption = MasterPickerOption & {
  spec?: string;
  unit?: string;
};

export type OpenMaterialPicker = (
  applyPatch: (changes: Partial<PurchaseRequestDetailRow>) => void,
) => void;

export function createPurchaseRequestDetailRow(): PurchaseRequestDetailRow {
  return {
    rowId: `purchase-request-line-${crypto.randomUUID()}`,
    purchaseRequestDetailId: null,
    materialId: null,
    materialCode: '',
    materialName: '',
    materialSpec: '',
    unit: '',
    requestQty: 0,
    requestDeliveryDt: '',
    useType: '',
    requestRemark: '',
    confirmQty: null,
  };
}

export function duplicatePurchaseRequestDetailRow(
  row: PurchaseRequestDetailRow,
): PurchaseRequestDetailRow {
  return {
    ...row,
    rowId: createPurchaseRequestDetailRow().rowId,
    purchaseRequestDetailId: null,
    confirmQty: null,
  };
}

export function materialPatch(option: PurchaseMaterialOption): Partial<PurchaseRequestDetailRow> {
  return {
    materialId: option.id,
    materialCode: option.code,
    materialName: option.name,
    materialSpec: option.spec ?? '',
    unit: option.unit ?? '',
  };
}

export function createPurchaseRequestDetailColumns(
  onOpenMaterialPicker: OpenMaterialPicker,
  useTypeOptions: PurchaseRequestUseTypeOption[],
  disabled = false,
): F1GridColumn<PurchaseRequestDetailRow>[] {
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
        return materialPatch(value);
      },
      onOpenCodePicker: (_row, applyPatch) => {
        if (!disabled) {
          onOpenMaterialPicker(applyPatch);
        }
      },
    },
    { field: 'materialName', headerName: '품목명', type: 'text', width: 200, editable: false },
    { field: 'materialSpec', headerName: '규격', type: 'text', width: 120, editable: false },
    { field: 'unit', headerName: '단위', type: 'text', width: 70, align: 'center', editable: false },
    {
      field: 'requestQty',
      headerName: '요청수량',
      type: 'decimal',
      width: 110,
      align: 'right',
      editable: !disabled,
      required: true,
      min: 0,
      validate: (value) => (Number(value) > 0 ? true : '요청수량은 0보다 커야 합니다.'),
    },
    {
      field: 'requestDeliveryDt',
      headerName: '요청납기일',
      type: 'date',
      width: 130,
      editable: !disabled,
      required: true,
      validate: (value) => (value ? true : '요청납기일을 입력해 주세요.'),
    },
    {
      field: 'useType',
      headerName: '사용용도',
      type: 'select',
      options: useTypeOptions,
      width: 130,
      align: 'center',
      editable: !disabled,
      required: true,
      validate: (value) => (value ? true : '사용용도를 선택해 주세요.'),
    },
    {
      field: 'requestRemark',
      headerName: '비고',
      type: 'text',
      width: 220,
      editable: !disabled,
      validate: (value) =>
        String(value ?? '').trim().length <= 500 ? true : '비고는 500자 이내로 입력해 주세요.',
    },
  ];
}

function isMasterPickerOption(value: unknown): value is PurchaseMaterialOption {
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
