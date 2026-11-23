import { Link } from '@mui/material';
import type { F1GridColumn } from '../../../../../shared/components/f1-grid/types/grid.types';
import { PURCHASE_ARRIVAL_STATUS_OPTIONS } from '../services/purchaseArrivalStatus.service';
import type { PurchaseArrivalStatusRow } from '../types/purchaseArrivalStatus.types';
import { F1GridHighlightText } from '../../../../../shared/components/f1-grid';

export type PurchaseArrivalStatusColumnOptions = {
  onOpenArrival?: (row: PurchaseArrivalStatusRow) => void;
};

/** 수량·단가: 자릿수를 고정하지 않고 정책 관리의 모듈 소수점 정책을 따른다. */
const quantityColumn = (
  field: keyof PurchaseArrivalStatusRow,
  headerName: string,
  width = 110,
): F1GridColumn<PurchaseArrivalStatusRow> => ({
  field,
  headerName,
  type: 'decimal',
  width,
  align: 'right',
  editable: false,
  search: { hidden: true },
});

/** 금액: 컬럼에서 2자리로 고정한다(정책 대상은 수량·단가). */
const amountColumn = (
  field: keyof PurchaseArrivalStatusRow,
  headerName: string,
  width = 110,
): F1GridColumn<PurchaseArrivalStatusRow> => ({
  field,
  headerName,
  type: 'decimal',
  decimalPlaces: 2,
  width,
  align: 'right',
  editable: false,
  search: { hidden: true },
});

export function createPurchaseArrivalStatusColumns({
  onOpenArrival,
}: PurchaseArrivalStatusColumnOptions = {}): F1GridColumn<PurchaseArrivalStatusRow>[] {
  return [
    {
      field: 'purchaseArrivalDetailId',
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
      field: 'arrivalNo',
      highlightSearch: true,
      headerName: '가입고번호',
      width: 160,
      editable: false,
      mergeRows: true,
      align: 'center',
      search: { label: '가입고번호', order: 2, span: 1, group: '텍스트' },
      renderCell: onOpenArrival
        ? ({ row, highlightKeyword }) => (
            <Link
              component="button"
              type="button"
              underline="hover"
              aria-label={`${row.arrivalNo} 상세 보기`}
              onClick={(event) => {
                event.stopPropagation();
                onOpenArrival(row);
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
              {highlightKeyword ? <F1GridHighlightText text={row.arrivalNo} keyword={highlightKeyword} /> : row.arrivalNo}
            </Link>
          )
        : undefined,
    },
    {
      field: 'arrivalDt',
      headerName: '가입고일',
      type: 'date',
      width: 100,
      align: 'center',
      editable: false,
      mergeRows: true,
      search: {
        required: true,
        label: '가입고일',
        order: 1,
        span: 2,
        group: '가입고일',
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
      field: 'receiverName',
      highlightSearch: true,
      headerName: '담당자',
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
      options: PURCHASE_ARRIVAL_STATUS_OPTIONS,
      width: 70,
      align: 'center',
      editable: false,
      mergeRows: true,
      search: { label: '상태', order: 6, span: 1, group: '선택', required: true, allowEmpty: false },
    },
    { field: 'lineNo', headerName: '순번', type: 'number', decimalPlaces: 0, width: 50, align: 'center', editable: false, search: { hidden: true } },
    {
      field: 'orderNo',
      headerName: '발주번호',
      type: 'text',
      width: 150,
      align: 'center',
      editable: false,
      search: { label: '발주번호', order: 4, span: 1, group: '텍스트' },
    },
    {
      field: 'materialCode',
      highlightSearch: true,
      headerName: '품목코드',
      type: 'text',
      width: 110,
      align: 'center',
      editable: false,
      search: { label: '품목', order: 5, span: 1, group: '텍스트' },
    },
    { field: 'materialName', highlightSearch: true, headerName: '품목명', type: 'text', width: 180, editable: false, search: { hidden: true } },
    { field: 'materialSpec', headerName: '규격', type: 'text', width: 110, editable: false, search: { hidden: true } },
    { field: 'unit', headerName: '단위', type: 'text', width: 60, align: 'center', editable: false, search: { hidden: true } },
    quantityColumn('orderQty', '발주수량', 100),
    quantityColumn('arrivalQty', '가입고수량', 100),
    quantityColumn('unitPrice', '가입고단가'),
    amountColumn('supplyAmt', '공급가', 120),
    amountColumn('vatAmt', '세액'),
    amountColumn('totalAmt', '합계', 120),
    { field: 'warehouseName', headerName: '입고창고', type: 'text', width: 110, align: 'center', editable: false, search: { hidden: true } },
    { field: 'manufactureDt', headerName: '제조일', type: 'date', width: 100, align: 'center', editable: false, search: { hidden: true } },
    { field: 'expireDt', headerName: '소비기한', type: 'date', width: 100, align: 'center', editable: false, search: { hidden: true } },
    { field: 'lotNo', headerName: 'LOT번호', type: 'text', width: 110, align: 'center', editable: false, search: { hidden: true } },
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
    { field: 'remark', headerName: '비고', type: 'text', width: 180, editable: false, search: { hidden: true } },
  ];
}
