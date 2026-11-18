import type { F1GridColumn } from '../../../../../shared/components/f1-grid';
import { calculateOrderAmounts, isTaxable } from '../../../order/create/data/purchaseOrderAmounts';
import type { PurchaseOrderSelectOption, PurchaseOrderTaxType } from '../../../order/create/types/purchaseOrder.types';

/** 가입고 그리드 행. remainQty는 이 행이 담을 수 있는 최대 수량(발주 잔량)이다. */
export type MaterialArrivalRow = {
  rowId: string;
  /** 저장된 가입고 행 ID. 등록 중인 행은 null이다. */
  materialArrivalDetailId: number | null;
  purchaseOrderDetailId: number;
  orderNo: string;
  materialId: number;
  materialCode: string;
  materialName: string;
  materialSpec: string;
  unit: string;
  orderQty: number | null;
  remainQty: number;
  arrivalQty: number | null;
  unitPrice: number | null;
  warehouseId: string;
  manufactureDt: string;
  expireDt: string;
  lotNo: string;
  inspectAt: boolean;
  /** 이 행과 연결된 입고번호. 비어 있지 않으면 가입고에서 수정·삭제할 수 없다. */
  receiptNo: string;
  /** 이 행에 등록된 유효한 수입검사 번호. 비어 있지 않으면 가입고에서 수정·삭제할 수 없다. */
  inspectionNo: string;
  inspectionId?: number | null;
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
export function recalculateRow(row: MaterialArrivalRow, taxType: PurchaseOrderTaxType, vatIncluded: boolean): MaterialArrivalRow {
  return { ...row, ...calculateOrderAmounts(row.arrivalQty, row.unitPrice, taxType, vatIncluded) };
}

type ColumnOptions = {
  editable: boolean;
  taxType: PurchaseOrderTaxType;
  vatIncluded: boolean;
  warehouseOptions: PurchaseOrderSelectOption[];
};

export function createMaterialArrivalColumns({
  editable,
  taxType,
  vatIncluded,
  warehouseOptions,
}: ColumnOptions): F1GridColumn<MaterialArrivalRow>[] {
  const readOnly = { editable: false } as const;
  // 입고가 생긴 행은 가입고에서 수정할 수 없다(행 단위 잠금).
  const rowEditable = (row: MaterialArrivalRow) => editable && !row.receiptNo && !row.inspectionNo;
  const patch = (row: MaterialArrivalRow, changes: Partial<MaterialArrivalRow>): Partial<MaterialArrivalRow> => {
    const merged = { ...row, ...changes };
    return { ...changes, ...calculateOrderAmounts(merged.arrivalQty, merged.unitPrice, taxType, vatIncluded) };
  };
  return [
    { field: 'orderNo', headerName: '발주번호', type: 'text', width: 150, align: 'center', pinned: 'left', ...readOnly },
    { field: 'materialCode', headerName: '품목코드', type: 'text', width: 110, ...readOnly },
    { field: 'materialName', headerName: '품목명', type: 'text', width: 170, ...readOnly },
    { field: 'materialSpec', headerName: '규격', type: 'text', width: 110, ...readOnly },
    { field: 'unit', headerName: '단위', type: 'text', width: 64, align: 'center', ...readOnly },
    { field: 'orderQty', headerName: '발주수량', type: 'decimal', width: 96, align: 'right', ...readOnly },
    { field: 'remainQty', headerName: '잔량', type: 'decimal', width: 90, align: 'right', ...readOnly },
    {
      field: 'arrivalQty',
      headerName: '가입고수량',
      type: 'decimal',
      width: 104,
      align: 'right',
      editable: rowEditable,
      required: true,
      min: 0,
      // 발주 잔량 초과는 막지 않고 저장 전 확인창에서 묻는다.
      validate: (value) => (Number(value) > 0 ? true : '가입고수량은 0보다 커야 합니다.'),
      onValueChange: (row, value) => patch(row, { arrivalQty: toNullableNumber(value) }),
    },
    {
      field: 'unitPrice',
      headerName: '가입고단가',
      type: 'decimal',
      width: 110,
      align: 'right',
      editable: rowEditable,
      required: true,
      min: 0,
      validate: (value) => {
        if (value === null || value === undefined || String(value) === '') return '가입고단가를 입력해 주세요.';
        return Number(value) >= 0 ? true : '가입고단가는 0 이상이어야 합니다.';
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
      editable: (row) => rowEditable(row) && isTaxable(taxType),
      min: 0,
      onValueChange: (row, value) => {
        const vatAmt = Math.max(0, toNullableNumber(value) ?? 0);
        const amounts = calculateOrderAmounts(row.arrivalQty, row.unitPrice, taxType, vatIncluded, vatAmt);
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
      editable: rowEditable,
      required: true,
      validate: (value) => (value ? true : '입고창고를 선택해 주세요.'),
      onValueChange: (_row, value) => ({ warehouseId: String(value ?? '') }),
    },
    { field: 'manufactureDt', headerName: '제조일', type: 'date', width: 120, editable: rowEditable },
    {
      field: 'expireDt',
      headerName: '소비기한',
      type: 'date',
      width: 120,
      editable: rowEditable,
      validate: (value, row) =>
        !value || !row.manufactureDt || String(value) >= row.manufactureDt ? true : '소비기한은 제조일 이후여야 합니다.',
    },
    { field: 'lotNo', headerName: 'LOT번호', type: 'text', width: 120, ...readOnly },
    { field: 'inspectAt', headerName: '검사대상', type: 'checkbox', width: 90, align: 'center', ...readOnly },
    { field: 'receiptNo', headerName: '입고번호', type: 'text', width: 150, align: 'center', ...readOnly },
    { field: 'inspectionNo', headerName: '검사번호', type: 'text', width: 150, align: 'center', ...readOnly },
    {
      field: 'remark',
      headerName: '비고',
      type: 'text',
      width: 200,
      editable: rowEditable,
      validate: (value) => (String(value ?? '').trim().length <= 500 ? true : '비고는 500자 이내로 입력해 주세요.'),
    },
  ];
}
