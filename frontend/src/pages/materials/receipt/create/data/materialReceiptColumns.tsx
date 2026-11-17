import type { F1GridColumn } from '../../../../../shared/components/f1-grid';
import { calculateOrderAmounts, isTaxable } from '../../../order/create/data/purchaseOrderAmounts';
import type { PurchaseOrderSelectOption, PurchaseOrderTaxType } from '../../../order/create/types/purchaseOrder.types';

/**
 * 입고 그리드 행. remainQty는 발주 잔량(참고값, 무검사 행만), linkedNoInspection은 수정·삭제가 가입고에도 반영되는 무검사 행이다.
 * 검사 연결 행(materialInspectionDetailId 있음)은 receivableQty(입고 가능량)를 입고수량 상한으로 쓴다.
 * materialReceiptDetailId가 null이면 아직 저장하지 않은 신규 행이다.
 */
export type MaterialReceiptRow = {
  rowId: string;
  materialReceiptDetailId: number | null;
  materialInspectionDetailId: number | null;
  inspectionNo: string;
  /** 매입마감월 YYYYMM(미마감이면 빈 문자열). 마감된 행이 있는 입고는 수정·취소할 수 없다. */
  closingMonth: string;
  receivableQty: number | null;
  arrivalNo: string;
  orderNo: string;
  materialCode: string;
  materialName: string;
  materialSpec: string;
  unit: string;
  arrivalQty: number | null;
  remainQty: number | null;
  receiptQty: number | null;
  unitPrice: number | null;
  warehouseId: string;
  manufactureDt: string;
  expireDt: string;
  lotNo: string;
  linkedNoInspection: boolean;
  supplyAmt: number;
  vatAmt: number;
  totalAmt: number;
  remark: string;
};

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/** 행 금액을 현재 부가세 설정으로 다시 계산한다. 세액을 직접 고쳤던 값은 버린다. */
export function recalculateRow(row: MaterialReceiptRow, taxType: PurchaseOrderTaxType, vatIncluded: boolean): MaterialReceiptRow {
  return { ...row, ...calculateOrderAmounts(row.receiptQty, row.unitPrice, taxType, vatIncluded) };
}

type ColumnOptions = {
  editable: boolean;
  taxType: PurchaseOrderTaxType;
  vatIncluded: boolean;
  warehouseOptions: PurchaseOrderSelectOption[];
};

export function createMaterialReceiptColumns({
  editable,
  taxType,
  vatIncluded,
  warehouseOptions,
}: ColumnOptions): F1GridColumn<MaterialReceiptRow>[] {
  const readOnly = { editable: false } as const;
  const patch = (row: MaterialReceiptRow, changes: Partial<MaterialReceiptRow>): Partial<MaterialReceiptRow> => {
    const merged = { ...row, ...changes };
    return { ...changes, ...calculateOrderAmounts(merged.receiptQty, merged.unitPrice, taxType, vatIncluded) };
  };
  return [
    { field: 'inspectionNo', headerName: '검사번호', type: 'text', width: 150, align: 'center', pinned: 'left', ...readOnly },
    { field: 'arrivalNo', headerName: '가입고번호', type: 'text', width: 150, align: 'center', ...readOnly },
    { field: 'orderNo', headerName: '발주번호', type: 'text', width: 150, align: 'center', ...readOnly },
    { field: 'materialCode', headerName: '품목코드', type: 'text', width: 110, ...readOnly },
    { field: 'materialName', headerName: '품목명', type: 'text', width: 170, ...readOnly },
    { field: 'materialSpec', headerName: '규격', type: 'text', width: 110, ...readOnly },
    { field: 'unit', headerName: '단위', type: 'text', width: 64, align: 'center', ...readOnly },
    { field: 'arrivalQty', headerName: '가입고수량', type: 'decimal', decimalPlaces: 2, width: 100, align: 'right', ...readOnly },
    { field: 'remainQty', headerName: '잔량', type: 'decimal', decimalPlaces: 2, width: 90, align: 'right', ...readOnly },
    { field: 'receivableQty', headerName: '입고 가능량', type: 'decimal', decimalPlaces: 2, width: 104, align: 'right', ...readOnly },
    {
      field: 'receiptQty',
      headerName: '입고수량',
      type: 'decimal',
      decimalPlaces: 2,
      width: 100,
      align: 'right',
      editable,
      required: true,
      min: 0,
      // 무검사 행의 발주 잔량 초과는 막지 않고 저장 전 확인창에서 묻는다. 검사 연결 행은 입고 가능량을 넘을 수 없다.
      validate: (value, row) => {
        if (!(Number(value) > 0)) return '입고수량은 0보다 커야 합니다.';
        if (row.materialInspectionDetailId !== null && row.receivableQty !== null && Number(value) > row.receivableQty) {
          return `입고수량이 입고 가능량 ${row.receivableQty}을(를) 초과했습니다.`;
        }
        return true;
      },
      onValueChange: (row, value) => patch(row, { receiptQty: toNullableNumber(value) }),
    },
    {
      field: 'unitPrice',
      headerName: '입고단가',
      type: 'decimal',
      decimalPlaces: 2,
      width: 110,
      align: 'right',
      editable,
      required: true,
      min: 0,
      validate: (value) => {
        if (value === null || value === undefined || String(value) === '') return '입고단가를 입력해 주세요.';
        return Number(value) >= 0 ? true : '입고단가는 0 이상이어야 합니다.';
      },
      onValueChange: (row, value) => patch(row, { unitPrice: toNullableNumber(value) }),
    },
    { field: 'supplyAmt', headerName: '공급가', type: 'decimal', decimalPlaces: 2, width: 120, align: 'right', ...readOnly },
    {
      field: 'vatAmt',
      headerName: '세액',
      type: 'decimal',
      decimalPlaces: 2,
      width: 110,
      align: 'right',
      editable: editable && isTaxable(taxType),
      min: 0,
      onValueChange: (row, value) => {
        const vatAmt = Math.max(0, toNullableNumber(value) ?? 0);
        const amounts = calculateOrderAmounts(row.receiptQty, row.unitPrice, taxType, vatIncluded, vatAmt);
        return { vatAmt: amounts.vatAmt, totalAmt: amounts.totalAmt };
      },
    },
    { field: 'totalAmt', headerName: '합계', type: 'decimal', decimalPlaces: 2, width: 120, align: 'right', ...readOnly },
    {
      field: 'warehouseId',
      headerName: '입고창고',
      type: 'select',
      options: warehouseOptions,
      width: 130,
      align: 'center',
      editable,
      required: true,
      validate: (value) => (value ? true : '입고창고를 선택해 주세요.'),
      onValueChange: (_row, value) => ({ warehouseId: String(value ?? '') }),
    },
    { field: 'manufactureDt', headerName: '제조일', type: 'date', width: 120, editable },
    {
      field: 'expireDt',
      headerName: '소비기한',
      type: 'date',
      width: 120,
      editable,
      validate: (value, row) =>
        !value || !row.manufactureDt || String(value) >= row.manufactureDt ? true : '소비기한은 제조일 이후여야 합니다.',
    },
    { field: 'lotNo', headerName: 'LOT번호', type: 'text', width: 120, ...readOnly },
    {
      field: 'closingMonth', headerName: '마감월', type: 'text', width: 90, align: 'center', ...readOnly,
      getValue: (row) => (/^\d{6}$/.test(row.closingMonth) ? `${row.closingMonth.slice(0, 4)}-${row.closingMonth.slice(4)}` : ''),
    },
    {
      field: 'remark',
      headerName: '비고',
      type: 'text',
      width: 200,
      editable,
      validate: (value) => (String(value ?? '').trim().length <= 500 ? true : '비고는 500자 이내로 입력해 주세요.'),
    },
  ];
}
