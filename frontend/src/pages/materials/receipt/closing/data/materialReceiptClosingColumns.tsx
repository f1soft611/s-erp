import type { F1GridColumn } from '../../../../../shared/components/f1-grid';
import { calculateOrderAmounts } from '../../../order/create/data/purchaseOrderAmounts';
import {
  CLOSE_TYPE_OPTIONS,
  formatClosingMonth,
  TAX_TYPE_OPTIONS,
  VAT_INCLUDED_OPTIONS,
} from '../services/materialReceiptClosing.service';
import type {
  ClosingTaxType,
  MaterialReceiptClosingRow,
  MaterialReceiptClosingSearchModel,
  MaterialReceiptClosingSupplier,
} from '../types/materialReceiptClosing.types';

const amount = <T extends object>(
  field: keyof T,
  headerName: string,
  width: number,
  extra: Partial<F1GridColumn<T>> = {},
): F1GridColumn<T> => ({
  field,
  headerName,
  type: 'decimal',
  decimalPlaces: 2,
  width,
  align: 'right',
  editable: false,
  ...extra,
});

/** 구매처 요약(왼쪽 그리드). 좁은 영역에 맞춰 열을 줄였다. */
export function createClosingSupplierColumns(): F1GridColumn<MaterialReceiptClosingSupplier>[] {
  return [
    { field: 'supplierName', headerName: '구매처', type: 'text', width: 150, editable: false, pinned: 'left' },
    {
      field: 'receiptCount', headerName: '입고건', type: 'number', decimal: { places: 0 }, width: 70, align: 'right', editable: false,
      summaryType: 'sum',
    },
    amount('receiptAmount', '입고금액', 120, { summaryType: 'sum' }),
    {
      field: 'monthClosedCount', headerName: '해당월 마감건', type: 'number', decimal: { places: 0 }, width: 100, align: 'right',
      editable: false, summaryType: 'sum',
    },
    amount('monthClosedAmount', '해당월 마감금액', 120, { summaryType: 'sum' }),
    {
      field: 'openCount', headerName: '미마감건', type: 'number', decimal: { places: 0 }, width: 80, align: 'right', editable: false,
      summaryType: 'sum',
      getCellStyle: ({ row }) => (row.openCount > 0 ? { color: '#d32f2f', fontWeight: 600 } : undefined),
    },
    { field: 'businessNo', headerName: '사업자번호', type: 'text', width: 120, align: 'center', editable: false },
  ];
}

export type ClosingRowColumnOptions = {
  /** 마감·해제 권한이 있을 때만 단가·세금 구분을 고칠 수 있다. */
  canEdit: boolean;
};

/** 입고 행(오른쪽 그리드). 마감 행은 읽기 전용이다. */
export function createClosingRowColumns({
  canEdit,
}: ClosingRowColumnOptions): F1GridColumn<MaterialReceiptClosingRow>[] {
  const editableOpen = (row: MaterialReceiptClosingRow) => canEdit && !row.closed;
  const recalc = (
    row: MaterialReceiptClosingRow,
    changes: Partial<Pick<MaterialReceiptClosingRow, 'unitPrice' | 'taxType' | 'vatIncludedAt'>>,
  ): Partial<MaterialReceiptClosingRow> => {
    const merged = { ...row, ...changes };
    // 영세·면세는 부가세 포함을 쓸 수 없으므로 별도로 되돌린다.
    const vatIncludedAt = merged.taxType === 'TAXABLE' ? merged.vatIncludedAt : 'N';
    return {
      ...changes,
      vatIncludedAt,
      ...calculateOrderAmounts(merged.receiptQty, merged.unitPrice, merged.taxType, vatIncludedAt === 'Y'),
    };
  };
  return [
    { field: 'materialReceiptDetailId', headerName: 'No', type: 'rownumber', width: 56, align: 'center', pinned: 'left' },
    { field: 'receiptNo', headerName: '입고번호', type: 'text', width: 150, align: 'center', editable: false, pinned: 'left' },
    {
      field: 'closed', headerName: '마감', type: 'text', width: 64, align: 'center', editable: false,
      getValue: (row) => (row.closed ? '마감' : ''),
    },
    {
      field: 'closingMonth', headerName: '마감월', type: 'text', width: 84, align: 'center', editable: false,
      getValue: (row) => formatClosingMonth(row.closingMonth),
    },
    { field: 'receiptDt', headerName: '입고일', type: 'date', width: 100, align: 'center', editable: false },
    { field: 'orderNo', headerName: '발주번호', type: 'text', width: 150, align: 'center', editable: false },
    { field: 'materialCode', highlightSearch: true, headerName: '품목코드', type: 'text', width: 110, align: 'center', editable: false },
    { field: 'materialName', highlightSearch: true, headerName: '품목명', type: 'text', width: 170, editable: false },
    { field: 'materialSpec', headerName: '규격', type: 'text', width: 110, editable: false },
    { field: 'unit', headerName: '단위', type: 'text', width: 60, align: 'center', editable: false },
    amount('receiptQty', '입고수량', 100, { summaryType: 'sum' }),
    {
      field: 'unitPrice',
      headerName: '단가',
      type: 'decimal',
      decimalPlaces: 2,
      width: 110,
      align: 'right',
      editable: editableOpen,
      min: 0,
      validate: (value) => {
        if (value === null || value === undefined || String(value) === '') return '단가를 입력해 주세요.';
        return Number(value) >= 0 ? true : '단가는 0 이상이어야 합니다.';
      },
      onValueChange: (row, value) => {
        const price = value === null || value === undefined || value === '' ? 0 : Number(value);
        return recalc(row, { unitPrice: Number.isFinite(price) ? price : 0 });
      },
    },
    {
      field: 'taxType',
      headerName: '부가세구분',
      type: 'select',
      options: TAX_TYPE_OPTIONS,
      width: 100,
      align: 'center',
      editable: editableOpen,
      onValueChange: (row, value) => recalc(row, { taxType: String(value ?? 'TAXABLE') as ClosingTaxType }),
    },
    {
      field: 'vatIncludedAt',
      headerName: '부가세포함',
      type: 'select',
      options: VAT_INCLUDED_OPTIONS,
      width: 100,
      align: 'center',
      editable: (row) => editableOpen(row) && row.taxType === 'TAXABLE',
      onValueChange: (row, value) => recalc(row, { vatIncludedAt: value === 'Y' ? 'Y' : 'N' }),
    },
    amount('supplyAmt', '공급가', 120, { summaryType: 'sum' }),
    amount('vatAmt', '부가세', 110, { summaryType: 'sum' }),
    amount('totalAmt', '합계', 120, { summaryType: 'sum' }),
    { field: 'warehouseName', headerName: '입고창고', type: 'text', width: 110, align: 'center', editable: false },
    { field: 'inspectionNo', headerName: '검사번호', type: 'text', width: 150, align: 'center', editable: false },
    { field: 'remark', headerName: '비고', type: 'text', width: 180, editable: false },
  ];
}

/** 상세검색 영역 정의용 열. 화면에는 표시되지 않고 검색 필드 정의로만 쓴다. */
export function createClosingSearchColumns(): F1GridColumn<MaterialReceiptClosingSearchModel>[] {
  return [
    {
      field: 'receiptDt',
      headerName: '입고일',
      type: 'date',
      hidden: true,
      search: {
        required: true,
        label: '입고일',
        order: 1,
        span: 2,
        group: '입고일',
        defaultValue: {
          from: { type: 'systemDate', offset: { months: -1 } },
          to: { type: 'systemDate' },
        },
      },
    },
    {
      field: 'closingMonth',
      headerName: '마감월',
      type: 'text',
      hidden: true,
      search: { required: true, inputType: 'month', label: '마감월', order: 3, span: 1, group: '선택' },
    },
    {
      field: 'closeType',
      headerName: '조회구분',
      type: 'select',
      options: CLOSE_TYPE_OPTIONS,
      hidden: true,
      search: { required: true, allowEmpty: false, label: '조회구분', order: 4, span: 1, group: '선택' },
    },
    {
      field: 'orderNo',
      headerName: '발주번호',
      type: 'text',
      hidden: true,
      search: { label: '발주번호', order: 2, span: 1, group: '텍스트' },
    },
  ];
}
