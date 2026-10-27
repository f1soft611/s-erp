import { Link } from '@mui/material';
import type { F1GridColumn } from '../../../../../shared/components/f1-grid/types/grid.types';
import type { SalesOrderStatusRow } from '../types/salesOrderStatus.types';

export type SalesOrderStatusColumnOptions = {
  onOpenOrder?: (row: SalesOrderStatusRow) => void;
};

// db-schema.md tb_sales_order_hd.status CHECK 허용값
export const SALES_ORDER_STATUS_OPTIONS = ['수주등록', '생산대기', '생산중', '출하완료', '취소'].map(
  (value) => ({ value, label: value }),
);

const amountColumn = (
  field: keyof SalesOrderStatusRow,
  headerName: string,
  type: 'decimal' | 'currency',
  width = 120,
): F1GridColumn<SalesOrderStatusRow> => ({
  field,
  headerName,
  type,
  decimalPlaces: 2,
  width,
  align: 'right',
  editable: false,
  search: { hidden: true },
});

export function createSalesOrderStatusColumns({
  onOpenOrder,
}: SalesOrderStatusColumnOptions = {}): F1GridColumn<SalesOrderStatusRow>[] {
  return [
    {
      field: 'salesOrderDetailId',
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
      headerName: '수주번호',
      width: 140,
      editable: false,
      mergeRows: true,
      align: 'center',
      search: { label: '수주번호', order: 2, span: 2, group: '수주정보' },
      renderCell: onOpenOrder
        ? ({ row }) => (
            <Link
              component="button"
              type="button"
              underline="hover"
              aria-label={`${row.orderNo} 상세 보기`}
              onClick={(event) => {
                event.stopPropagation();
                onOpenOrder(row);
              }}
              // 병합 영역에서는 투명한 후속 행 셀이 위에 겹치므로 링크만 위로 올려 클릭을 받는다.
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
              {row.orderNo}
            </Link>
          )
        : undefined,
    },
    {
      field: 'orderDt',
      headerName: '수주일자',
      type: 'date',
      width: 80,
      align: 'center',
      editable: false,
      mergeRows: true,
      search: {
        label: '수주일자',
        order: 1,
        span: 4,
        group: '수주일자',
        defaultValue: {
          from: { type: 'systemDate', offset: { months: -1 } },
          to: { type: 'systemDate' },
        },
      },
    },
    {
      field: 'customerCode',
      headerName: '거래처코드',
      width: 80,
      align: 'center',
      editable: false,
      mergeRows: true,
      search: { hidden: true },
    },
    {
      field: 'customerName',
      headerName: '거래처명',
      width: 160,
      editable: false,
      mergeRows: true,
      search: { label: '거래처', order: 3, span: 2, group: '수주정보' },
    },
    {
      field: 'quotNo',
      headerName: '견적번호',
      width: 140,
      editable: false,
      mergeRows: true,
      search: { label: '견적번호', order: 4, span: 2, group: '수주정보' },
    },
    {
      field: 'status',
      headerName: '수주상태',
      type: 'select',
      options: SALES_ORDER_STATUS_OPTIONS,
      width: 80,
      align: 'center',
      editable: false,
      mergeRows: true,
      search: { label: '수주상태', order: 5, span: 2, group: '수주정보' },
    },
    {
      field: 'deliveryPlace',
      headerName: '납품장소',
      width: 150,
      editable: false,
      mergeRows: true,
      search: { hidden: true },
    },
    {
      field: 'deliveryMethod',
      headerName: '배송방법',
      width: 110,
      editable: false,
      mergeRows: true,
      search: { hidden: true },
    },
    {
      field: 'lineNo',
      headerName: '행',
      type: 'number',
      width: 60,
      align: 'center',
      editable: false,
      search: { hidden: true },
    },
    {
      field: 'materialCode',
      headerName: '품목코드',
      type: 'text',
      width: 80,
      align: 'center',
      editable: false,
      search: { hidden: true },
    },
    {
      field: 'materialName',
      headerName: '품목명',
      width: 180,
      editable: false,
      search: { label: '품목', order: 6, span: 2, group: '품목정보' },
    },
    {
      field: 'unit',
      headerName: '단위',
      width: 70,
      align: 'center',
      editable: false,
      search: { hidden: true },
    },
    amountColumn('orderQty', '주문수량', 'decimal'),
    amountColumn('unitPrice', '단가', 'currency', 130),
    amountColumn('supplyAmt', '공급가', 'currency', 130),
    amountColumn('vatAmt', '부가세', 'currency', 120),
    amountColumn('totalAmt', '합계', 'currency', 140),
    {
      field: 'deliveryDt',
      headerName: '납기일자',
      type: 'date',
      width: 80,
      align: 'center',
      editable: false,
      search: { label: '납기일자', order: 7, span: 4, group: '품목정보' },
    },
    amountColumn('shippedQty', '출하수량', 'decimal'),
    {
      field: 'lineStatus',
      headerName: '행상태',
      width: 80,
      align: 'center',
      editable: false,
      search: { label: '행상태', order: 8, span: 2, group: '품목정보' },
    },
    {
      field: 'remark',
      headerName: '비고',
      width: 200,
      editable: false,
      search: { hidden: true },
    },
  ];
}
