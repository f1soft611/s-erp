import type { F1GridColumn } from '../../../../../shared/components/f1-grid';
import type { MasterPickerOption } from '../../../../../shared/components/master-picker/masterPicker.types';
import type { ConfirmSelectOption } from '../types/purchaseRequestConfirm.types';

/** 확정 그리드 행. select 컬럼 값은 문자열로 다룬다. */
export type PurchaseRequestConfirmRow = {
  rowId: string;
  purchaseRequestId: number;
  requestNo: string;
  requestDt: string;
  requesterName: string;
  purchaseRequestDetailId: number;
  lineNo: number;
  materialId: number;
  materialCode: string;
  materialName: string;
  materialSpec: string;
  unit: string;
  requestQty: number;
  requestDeliveryDt: string;
  useTypeName: string;
  confirmQty: number | null;
  confirmDeliveryDt: string;
  warehouseId: string;
  orderType: string;
  supplierId: number | null;
  supplierCode: string;
  supplierName: string;
  unitPrice: number | null;
  currencyCode: string;
  amount: number;
  confirmRemark: string;
  orderClosed: boolean;
};

export type OpenSupplierPicker = (
  row: PurchaseRequestConfirmRow,
  applyPatch: (changes: Partial<PurchaseRequestConfirmRow>) => void,
) => void;

export function calculateAmount(confirmQty: unknown, unitPrice: unknown): number {
  const qty = Number(confirmQty);
  const price = Number(unitPrice);
  if (unitPrice === null || unitPrice === undefined || unitPrice === '' || !Number.isFinite(qty) || !Number.isFinite(price)) {
    return 0;
  }
  return Math.round(qty * price * 100) / 100;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function supplierPatch(option: MasterPickerOption): Partial<PurchaseRequestConfirmRow> {
  return { supplierId: option.id, supplierCode: option.code, supplierName: option.name };
}

type ColumnOptions = {
  confirmEditable: boolean;
  closeEditable: boolean;
  warehouseOptions: ConfirmSelectOption[];
  orderTypeOptions: ConfirmSelectOption[];
  onOpenSupplierPicker: OpenSupplierPicker;
};

export function createPurchaseRequestConfirmColumns({
  confirmEditable,
  closeEditable,
  warehouseOptions,
  orderTypeOptions,
  onOpenSupplierPicker,
}: ColumnOptions): F1GridColumn<PurchaseRequestConfirmRow>[] {
  const readOnly = { editable: false } as const;
  return [
    { field: 'requestNo', headerName: '구매요청번호', type: 'text', width: 150, align: 'center', pinned: 'left', mergeRows: true, ...readOnly },
    { field: 'requestDt', headerName: '요청일', type: 'date', width: 100, align: 'center', mergeRows: true, ...readOnly },
    { field: 'requesterName', headerName: '요청자', type: 'text', width: 90, align: 'center', mergeRows: true, ...readOnly },
    { field: 'lineNo', headerName: '행', type: 'number', width: 56, align: 'center', ...readOnly },
    { field: 'materialCode', headerName: '품목코드', type: 'text', width: 110, ...readOnly },
    { field: 'materialName', headerName: '품목명', type: 'text', width: 170, ...readOnly },
    { field: 'materialSpec', headerName: '규격', type: 'text', width: 110, ...readOnly },
    { field: 'unit', headerName: '단위', type: 'text', width: 64, align: 'center', ...readOnly },
    { field: 'requestQty', headerName: '요청수량', type: 'decimal', decimalPlaces: 2, width: 96, align: 'right', ...readOnly },
    { field: 'requestDeliveryDt', headerName: '요청납기일', type: 'date', width: 110, ...readOnly },
    { field: 'useTypeName', headerName: '사용용도', type: 'text', width: 96, align: 'center', ...readOnly },
    {
      field: 'confirmQty',
      headerName: '확정수량',
      type: 'decimal',
      decimalPlaces: 2,
      width: 100,
      align: 'right',
      editable: confirmEditable,
      required: true,
      min: 0,
      validate: (value) => (Number(value) > 0 ? true : '확정수량은 0보다 커야 합니다.'),
      onValueChange: (row, value) => {
        const confirmQty = toNullableNumber(value);
        return { confirmQty, amount: calculateAmount(confirmQty, row.unitPrice) };
      },
    },
    {
      field: 'confirmDeliveryDt',
      headerName: '확정납기일',
      type: 'date',
      width: 130,
      editable: confirmEditable,
      required: true,
      validate: (value) => (value ? true : '확정납기일을 입력해 주세요.'),
    },
    {
      field: 'warehouseId',
      headerName: '입고창고',
      type: 'select',
      options: warehouseOptions,
      width: 130,
      align: 'center',
      editable: confirmEditable,
      required: true,
      validate: (value) => (value ? true : '입고창고를 선택해 주세요.'),
    },
    {
      field: 'orderType',
      headerName: '발주구분',
      type: 'select',
      options: orderTypeOptions,
      width: 130,
      align: 'center',
      editable: confirmEditable,
      required: true,
      validate: (value) => (value ? true : '발주구분을 선택해 주세요.'),
    },
    {
      field: 'supplierCode',
      headerName: '구매처',
      type: 'code',
      width: 120,
      editable: confirmEditable,
      required: true,
      validate: (_value, row) => (row.supplierId ? true : '구매처를 선택해 주세요.'),
      // 코드를 직접 입력하면 선택한 구매처가 아니므로 비운다. 구매처는 선택 다이얼로그로만 지정한다.
      onValueChange: (_row, value) =>
        typeof value === 'object' && value !== null && 'id' in value
          ? supplierPatch(value as MasterPickerOption)
          : { supplierCode: String(value ?? ''), supplierId: null, supplierName: '' },
      onOpenCodePicker: (row, applyPatch) => {
        if (confirmEditable) onOpenSupplierPicker(row, applyPatch);
        return undefined;
      },
    },
    { field: 'supplierName', headerName: '구매처명', type: 'text', width: 150, ...readOnly },
    {
      field: 'unitPrice',
      headerName: '단가',
      type: 'decimal',
      decimalPlaces: 2,
      width: 110,
      align: 'right',
      editable: confirmEditable,
      min: 0,
      validate: (value) =>
        value === null || value === undefined || String(value) === '' || Number(value) >= 0
          ? true
          : '단가는 0 이상이어야 합니다.',
      onValueChange: (row, value) => {
        const unitPrice = toNullableNumber(value);
        return { unitPrice, amount: calculateAmount(row.confirmQty, unitPrice) };
      },
    },
    { field: 'currencyCode', headerName: '통화', type: 'text', width: 64, align: 'center', ...readOnly },
    { field: 'amount', headerName: '금액', type: 'decimal', decimalPlaces: 2, width: 120, align: 'right', ...readOnly },
    {
      field: 'confirmRemark',
      headerName: '확정비고',
      type: 'text',
      width: 200,
      editable: confirmEditable,
      validate: (value) =>
        String(value ?? '').trim().length <= 500 ? true : '확정비고는 500자 이내로 입력해 주세요.',
    },
    {
      field: 'orderClosed',
      headerName: '발주대기 마감',
      type: 'checkbox',
      width: 110,
      align: 'center',
      editable: closeEditable,
    },
  ];
}
