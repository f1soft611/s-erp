import { Link } from '@mui/material';
import type { F1GridColumn } from '../../../../../shared/components/f1-grid/types/grid.types';
import { PURCHASE_ORDER_SOURCE_OPTIONS, PURCHASE_ORDER_STATUS_OPTIONS } from '../services/purchaseOrderStatus.service';
import type { PurchaseOrderStatusRow } from '../types/purchaseOrderStatus.types';
import { F1GridHighlightText } from '../../../../../shared/components/f1-grid';

export type PurchaseOrderStatusColumnOptions = {
  onOpenOrder?: (row: PurchaseOrderStatusRow) => void;
};

const amountColumn = (
  field: keyof PurchaseOrderStatusRow,
  headerName: string,
  decimalPlaces = 2,
  width = 110,
): F1GridColumn<PurchaseOrderStatusRow> => ({
  field,
  headerName,
  type: 'decimal',
  decimalPlaces,
  width,
  align: 'right',
  editable: false,
  search: { hidden: true },
});

export function createPurchaseOrderStatusColumns({
  onOpenOrder,
}: PurchaseOrderStatusColumnOptions = {}): F1GridColumn<PurchaseOrderStatusRow>[] {
  return [
    {
      field: 'purchaseOrderDetailId',
      headerName: 'No',
      type: 'rownumber',
      width: 56,
      align: 'center',
      pinned: 'left',
      search: { hidden: true },
      form: { hidden: true },
    },
    {
      type: 'text',
      field: 'orderNo',
      highlightSearch: true,
      headerName: '발주번호',
      width: 160,
      editable: false,
      mergeRows: true,
      align: 'center',
      search: { label: '발주번호', order: 2, span: 1, group: '텍스트' },
      renderCell: onOpenOrder
        ? ({ row, highlightKeyword }) => (
            <Link
              component="button"
              type="button"
              underline="hover"
              aria-label={`${row.orderNo} 상세 보기`}
              onClick={(event) => {
                event.stopPropagation();
                onOpenOrder(row);
              }}
              // 병합 영역에서는 후속 행 셀이 위에 겹치므로 링크만 위로 올려 클릭을 받는다.
              sx={{
                position: 'relative',
                zIndex: 1,
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontWeight: 600,
                fontSize: 'inherit',
                verticalAlign: 'baseline',
              }}
            >
              {highlightKeyword ? <F1GridHighlightText text={row.orderNo} keyword={highlightKeyword} /> : row.orderNo}
            </Link>
          )
        : undefined,
    },
    {
      field: 'orderDt',
      headerName: '발주일',
      type: 'date',
      width: 90,
      align: 'center',
      editable: false,
      mergeRows: true,
      search: {
        required: true,
        label: '발주일',
        order: 1,
        span: 2,
        group: '발주일',
        defaultValue: {
          from: { type: 'systemDate', offset: { months: -1 } },
          to: { type: 'systemDate' },
        },
      },
    },
    {
      field: 'supplierName',
      highlightSearch: true,
      headerName: '구매처',
      type: 'text',
      width: 150,
      editable: false,
      mergeRows: true,
      search: { label: '구매처', order: 3, span: 1, group: '텍스트' },
    },
    {
      field: 'ordererName',
      highlightSearch: true,
      headerName: '발주자',
      type: 'text',
      width: 90,
      align: 'center',
      editable: false,
      mergeRows: true,
      search: { hidden: true },
    },
    {
      field: 'status',
      headerName: '상태',
      type: 'select',
      options: PURCHASE_ORDER_STATUS_OPTIONS,
      width: 70,
      align: 'center',
      editable: false,
      mergeRows: true,
      search: { label: '상태', order: 5, span: 1, group: '선택', required: true, allowEmpty: false },
    },
    {
      field: 'sourceType',
      headerName: '출처',
      type: 'select',
      options: PURCHASE_ORDER_SOURCE_OPTIONS,
      width: 70,
      align: 'center',
      editable: false,
      mergeRows: true,
      search: { label: '출처', order: 6, span: 1, group: '선택' },
    },
    { field: 'lineNo', headerName: '행', type: 'number', width: 50, align: 'center', editable: false, search: { hidden: true } },
    { field: 'confirmNo', headerName: '확정번호', type: 'text', width: 150, align: 'center', editable: false, search: { hidden: true } },
    {
      field: 'materialCode',
      highlightSearch: true,
      headerName: '품목코드',
      type: 'text',
      width: 110,
      align: 'center',
      editable: false,
      search: { label: '품목', order: 4, span: 1, group: '텍스트' },
    },
    { field: 'materialName', highlightSearch: true, headerName: '품목명', type: 'text', width: 180, editable: false, search: { hidden: true } },
    { field: 'materialSpec', headerName: '규격', type: 'text', width: 110, editable: false, search: { hidden: true } },
    { field: 'unit', headerName: '단위', type: 'text', width: 60, align: 'center', editable: false, search: { hidden: true } },
    amountColumn('orderQty', '발주수량', 2, 100),
    amountColumn('unitPrice', '발주단가'),
    amountColumn('supplyAmt', '공급가', 2, 120),
    amountColumn('vatAmt', '세액'),
    amountColumn('totalAmt', '합계', 2, 120),
    {
      field: 'deliveryDt',
      headerName: '납기일',
      type: 'date',
      width: 100,
      align: 'center',
      editable: false,
      search: { label: '납기일', order: 7, span: 2, group: '부가날짜' },
    },
    { field: 'warehouseName', headerName: '입고창고', type: 'text', width: 110, align: 'center', editable: false, search: { hidden: true } },
    {
      field: 'inspectAt',
      headerName: '검사대상',
      type: 'select',
      options: [{ value: 'Y', label: '대상' }, { value: 'N', label: '-' }],
      width: 80,
      align: 'center',
      editable: false,
      search: { hidden: true },
    },
    {
      field: 'receiptCloseAt',
      headerName: '입고대기마감',
      type: 'select',
      options: [{ value: 'Y', label: '마감' }, { value: 'N', label: '-' }],
      width: 100,
      align: 'center',
      editable: false,
      search: { hidden: true },
    },
    {
      field: 'printAt',
      headerName: '출력상태',
      type: 'select',
      options: [{ value: 'Y', label: '출력' }, { value: 'N', label: '미출력' }],
      width: 90,
      align: 'center',
      editable: false,
      mergeRows: true,
      search: { hidden: true },
    },
    { field: 'remark', headerName: '비고', type: 'text', width: 180, editable: false, search: { hidden: true } },
  ];
}
