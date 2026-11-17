import { Link } from '@mui/material';
import type { F1GridColumn, F1GridOption } from '../../../../../shared/components/f1-grid/types/grid.types';
import { PURCHASE_REQUEST_STATUS_OPTIONS } from '../../create/services/purchaseRequest.service';
import type { PurchaseRequestStatusRow } from '../types/purchaseRequestStatus.types';
import { F1GridHighlightText } from '../../../../../shared/components/f1-grid';

export type PurchaseRequestStatusColumnOptions = {
  onOpenRequest?: (row: PurchaseRequestStatusRow) => void;
  useTypeOptions?: F1GridOption[];
};

const quantityColumn = (
  field: keyof PurchaseRequestStatusRow,
  headerName: string,
): F1GridColumn<PurchaseRequestStatusRow> => ({
  field,
  headerName,
  type: 'decimal',
  decimalPlaces: 2,
  width: 100,
  align: 'right',
  editable: false,
  search: { hidden: true },
});

export function createPurchaseRequestStatusColumns({
  onOpenRequest,
  useTypeOptions = [],
}: PurchaseRequestStatusColumnOptions = {}): F1GridColumn<PurchaseRequestStatusRow>[] {
  return [
    {
      field: 'purchaseRequestDetailId',
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
      field: 'requestNo',
      highlightSearch: true,
      headerName: '구매요청번호',
      width: 150,
      editable: false,
      mergeRows: true,
      align: 'center',
      search: { label: '구매요청번호', order: 2, span: 1, group: '텍스트' },
      renderCell: onOpenRequest
        ? ({ row, highlightKeyword }) => (
            <Link
              component="button"
              type="button"
              underline="hover"
              aria-label={`${row.requestNo} 상세 보기`}
              onClick={(event) => {
                event.stopPropagation();
                onOpenRequest(row);
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
              {highlightKeyword ? <F1GridHighlightText text={row.requestNo} keyword={highlightKeyword} /> : row.requestNo}
            </Link>
          )
        : undefined,
    },
    {
      field: 'requestDt',
      headerName: '요청일',
      type: 'date',
      width: 90,
      align: 'center',
      editable: false,
      mergeRows: true,
      search: {
        required: true,
        label: '요청일',
        order: 1,
        span: 2,
        group: '요청일',
        defaultValue: {
          from: { type: 'systemDate', offset: { months: -1 } },
          to: { type: 'systemDate' },
        },
      },
    },
    {
      field: 'requesterName',
      highlightSearch: true,
      headerName: '요청자',
      type: 'text',
      width: 90,
      align: 'center',
      editable: false,
      mergeRows: true,
      search: { label: '요청자', order: 3, span: 1, group: '텍스트' },
    },
    {
      field: 'requestDeptName',
      headerName: '요청부서',
      type: 'text',
      width: 110,
      align: 'center',
      editable: false,
      mergeRows: true,
      search: { hidden: true },
    },
    {
      field: 'status',
      headerName: '상태',
      type: 'select',
      options: PURCHASE_REQUEST_STATUS_OPTIONS,
      width: 70,
      align: 'center',
      editable: false,
      mergeRows: true,
      search: { label: '상태', order: 5, span: 1, group: '선택' },
    },
    {
      field: 'lineNo',
      headerName: '행',
      type: 'number',
      width: 50,
      align: 'center',
      editable: false,
      search: { hidden: true },
    },
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
    quantityColumn('requestQty', '요청수량'),
    {
      field: 'requestDeliveryDt',
      headerName: '요청납기일',
      type: 'date',
      width: 100,
      align: 'center',
      editable: false,
      search: { label: '요청납기일', order: 7, span: 2, group: '부가날짜' },
    },
    {
      field: 'useTypeName',
      headerName: '사용용도',
      type: 'select',
      options: useTypeOptions,
      width: 100,
      align: 'center',
      editable: false,
      getValue: (row) => row.useTypeName ?? row.useType ?? '',
      renderCell: ({ row }) => row.useTypeName ?? row.useType ?? '',
      search: { label: '사용용도', order: 6, span: 1, group: '선택' },
    },
    quantityColumn('confirmQty', '확정수량'),
    { field: 'requestRemark', headerName: '비고', type: 'text', width: 180, editable: false, search: { hidden: true } },
  ];
}
