import type { F1GridColumn } from '../../../../../shared/components/f1-grid';
import type { PurchaseOrderSelectOption, PurchaseOrderTaxType } from '../types/purchaseOrder.types';
import { calculateOrderAmounts, isTaxable } from './purchaseOrderAmounts';

/** 발주 그리드 행. 확정 불러오기 행은 purchaseRequestDetailId가 있고, 직접 발주 행은 null이다. */
export type PurchaseOrderRow = {
  rowId: string;
  /** 저장된 발주 행 ID. 등록 중인 행은 null이다. */
  purchaseOrderDetailId: number | null;
  purchaseRequestDetailId: number | null;
  confirmNo: string;
  requestNo: string;
  materialId: number;
  materialCode: string;
  materialName: string;
  materialSpec: string;
  unit: string;
  useTypeName: string;
  confirmQty: number | null;
  remainQty: number | null;
  orderQty: number | null;
  unitPrice: number | null;
  deliveryDt: string;
  warehouseId: string;
  inspectAt: boolean;
  /** 입고대기 마감 여부. 저장된 발주에서만 바뀌고 등록 중인 행은 false다. */
  receiptClosed: boolean;
  supplyAmt: number;
  vatAmt: number;
  totalAmt: number;
  stockQty: number | null;
  remark: string;
  /** 확정 기준값(직접 발주 행은 null). 발주값이 다르면 경고만 표시한다. */
  confirmSupplierId: number | null;
  confirmUnitPrice: number | null;
  confirmDeliveryDt: string;
  confirmWarehouseId: string;
  diffNote: string;
};

function sameNumber(left: number | null, right: number | null): boolean {
  return (left ?? null) === (right ?? null);
}

/** 확정값과 다른 항목 이름을 모아 "확정과 다름: 단가, 납기일" 형태로 돌려준다. 같으면 빈 문자열. */
export function buildDiffNote(row: PurchaseOrderRow, supplierId: number | null): string {
  if (row.purchaseRequestDetailId === null) return '';
  const parts: string[] = [];
  if (row.confirmSupplierId !== null && supplierId !== null && row.confirmSupplierId !== supplierId) parts.push('구매처');
  if (!sameNumber(row.unitPrice, row.confirmUnitPrice)) parts.push('단가');
  if (row.remainQty !== null && Number(row.orderQty ?? 0) > row.remainQty) parts.push('수량 초과');
  if (row.confirmDeliveryDt && row.deliveryDt !== row.confirmDeliveryDt) parts.push('납기일');
  if (row.confirmWarehouseId && row.warehouseId !== row.confirmWarehouseId) parts.push('창고');
  return parts.length > 0 ? `확정과 다름: ${parts.join(', ')}` : '';
}

/** 행 금액·경고 문구를 현재 부가세 설정으로 다시 계산한다. 세액을 직접 고쳤던 값은 버린다. */
export function recalculateRow(
  row: PurchaseOrderRow,
  taxType: PurchaseOrderTaxType,
  vatIncluded: boolean,
  supplierId: number | null,
): PurchaseOrderRow {
  const amounts = calculateOrderAmounts(row.orderQty, row.unitPrice, taxType, vatIncluded);
  const next = { ...row, ...amounts };
  return { ...next, diffNote: buildDiffNote(next, supplierId) };
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

type ColumnOptions = {
  editable: boolean;
  /** 저장된 발주에서만 입고대기마감 컬럼을 보인다. */
  showReceiptClose?: boolean;
  /** 입고대기마감 모드: 마감 체크박스만 편집할 수 있다. */
  closeEditable?: boolean;
  taxType: PurchaseOrderTaxType;
  vatIncluded: boolean;
  supplierId: number | null;
  warehouseOptions: PurchaseOrderSelectOption[];
};

export function createPurchaseOrderColumns({
  editable,
  showReceiptClose = false,
  closeEditable = false,
  taxType,
  vatIncluded,
  supplierId,
  warehouseOptions,
}: ColumnOptions): F1GridColumn<PurchaseOrderRow>[] {
  const readOnly = { editable: false } as const;
  const patch = (row: PurchaseOrderRow, changes: Partial<PurchaseOrderRow>): Partial<PurchaseOrderRow> => {
    const merged = { ...row, ...changes };
    const amounts = calculateOrderAmounts(merged.orderQty, merged.unitPrice, taxType, vatIncluded);
    const next = { ...merged, ...amounts };
    return { ...changes, ...amounts, diffNote: buildDiffNote(next, supplierId) };
  };
  return [
    { field: 'diffNote', headerName: '확정 대비', type: 'text', width: 170, pinned: 'left', ...readOnly },
    { field: 'confirmNo', headerName: '확정번호', type: 'text', width: 150, align: 'center', ...readOnly },
    ...(showReceiptClose
      ? [{
        field: 'receiptClosed' as const,
        headerName: '입고대기마감',
        type: 'checkbox' as const,
        width: 110,
        align: 'center' as const,
        editable: closeEditable,
      }]
      : []),
    { field: 'materialCode', headerName: '품목코드', type: 'text', width: 110, ...readOnly },
    { field: 'materialName', headerName: '품목명', type: 'text', width: 170, ...readOnly },
    { field: 'materialSpec', headerName: '규격', type: 'text', width: 110, ...readOnly },
    { field: 'unit', headerName: '단위', type: 'text', width: 64, align: 'center', ...readOnly },
    { field: 'stockQty', headerName: '재고량', type: 'decimal', decimalPlaces: 2, width: 90, align: 'right', ...readOnly },
    { field: 'remainQty', headerName: '잔량', type: 'decimal', decimalPlaces: 2, width: 90, align: 'right', ...readOnly },
    {
      field: 'orderQty',
      headerName: '발주수량',
      type: 'decimal',
      decimalPlaces: 2,
      width: 100,
      align: 'right',
      editable,
      required: true,
      min: 0,
      validate: (value) => (Number(value) > 0 ? true : '발주수량은 0보다 커야 합니다.'),
      onValueChange: (row, value) => patch(row, { orderQty: toNullableNumber(value) }),
    },
    {
      field: 'unitPrice',
      headerName: '발주단가',
      type: 'decimal',
      decimalPlaces: 2,
      width: 110,
      align: 'right',
      editable,
      min: 0,
      validate: (value) =>
        value === null || value === undefined || String(value) === '' || Number(value) >= 0
          ? true
          : '단가는 0 이상이어야 합니다.',
      onValueChange: (row, value) => patch(row, { unitPrice: toNullableNumber(value) }),
    },
    {
      field: 'deliveryDt',
      headerName: '납기일',
      type: 'date',
      width: 130,
      editable,
      required: true,
      validate: (value) => (value ? true : '납기일을 입력해 주세요.'),
      onValueChange: (row, value) => patch(row, { deliveryDt: String(value ?? '') }),
    },
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
      onValueChange: (row, value) => patch(row, { warehouseId: String(value ?? '') }),
    },
    { field: 'inspectAt', headerName: '검사대상', type: 'checkbox', width: 90, align: 'center', editable },
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
        const amounts = calculateOrderAmounts(row.orderQty, row.unitPrice, taxType, vatIncluded, vatAmt);
        return { vatAmt: amounts.vatAmt, totalAmt: amounts.totalAmt };
      },
    },
    { field: 'totalAmt', headerName: '합계', type: 'decimal', decimalPlaces: 2, width: 120, align: 'right', ...readOnly },
    { field: 'useTypeName', headerName: '사용용도', type: 'text', width: 96, align: 'center', ...readOnly },
    { field: 'requestNo', headerName: '구매요청번호', type: 'text', width: 150, align: 'center', ...readOnly },
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
