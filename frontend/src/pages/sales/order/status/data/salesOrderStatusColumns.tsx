import type { F1GridColumn } from '../../../../../shared/components/f1-grid/types/grid.types';
import type { SalesOrderStatusRow } from '../types/salesOrderStatus.types';

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

export function createSalesOrderStatusColumns(): F1GridColumn<SalesOrderStatusRow>[] {
  return [
    {
      field: 'orderNo',
      headerName: '수주번호',
      width: 170,
      editable: false,
      search: { label: '수주번호', order: 2, span: 2, group: '수주정보' },
    },
    {
      field: 'orderDt',
      headerName: '수주일자',
      type: 'date',
      width: 110,
      align: 'center',
      editable: false,
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
      width: 110,
      editable: false,
      search: { hidden: true },
    },
    {
      field: 'customerName',
      headerName: '거래처명',
      width: 160,
      editable: false,
      search: { label: '거래처', order: 3, span: 2, group: '수주정보' },
    },
    {
      field: 'quotNo',
      headerName: '견적번호',
      width: 140,
      editable: false,
      search: { label: '견적번호', order: 4, span: 2, group: '수주정보' },
    },
    {
      field: 'status',
      headerName: '수주상태',
      type: 'select',
      options: SALES_ORDER_STATUS_OPTIONS,
      width: 100,
      align: 'center',
      editable: false,
      search: { label: '수주상태', order: 5, span: 2, group: '수주정보' },
    },
    {
      field: 'deliveryPlace',
      headerName: '납품장소',
      width: 150,
      editable: false,
      search: { hidden: true },
    },
    {
      field: 'deliveryMethod',
      headerName: '배송방법',
      width: 110,
      editable: false,
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
      width: 130,
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
      width: 110,
      align: 'center',
      editable: false,
      search: { label: '납기일자', order: 7, span: 4, group: '품목정보' },
    },
    amountColumn('shippedQty', '출하수량', 'decimal'),
    {
      field: 'lineStatus',
      headerName: '행상태',
      width: 90,
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
