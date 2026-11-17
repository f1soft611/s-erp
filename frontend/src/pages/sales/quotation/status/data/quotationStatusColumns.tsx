import { Link } from '@mui/material';
import type { F1GridColumn } from '../../../../../shared/components/f1-grid/types/grid.types';
import type { QuotationStatusRow } from '../types/quotationStatus.types';

export type QuotationStatusColumnOptions = {
  onOpenQuotation?: (row: QuotationStatusRow) => void;
};

const amountColumn = (
  field: keyof QuotationStatusRow,
  headerName: string,
  type: 'decimal' | 'currency',
  width = 130,
): F1GridColumn<QuotationStatusRow> => ({
  field,
  headerName,
  type,
  align: 'right',
  editable: false,
  search: { hidden: true },
});

export function createQuotationStatusColumns({
  onOpenQuotation,
}: QuotationStatusColumnOptions = {}): F1GridColumn<QuotationStatusRow>[] {
  return [
    {
      field: 'quotationDetailId',
      headerName: 'No',
      type: 'rownumber',
      width: 56,
      align: 'center',
      pinned: 'left',
      search: { hidden: true },
      form: { hidden: true },
    },
    {
      field: 'quotationNo',
      headerName: '견적번호',
      width: 150,
      pinned: 'left',
      editable: false,
      mergeRows: true,
      align: 'center',
      search: { label: '견적번호', order: 2, span: 2, group: '견적정보' },
      renderCell: onOpenQuotation
        ? ({ row }) => (
            <Link
              component="button"
              type="button"
              underline="hover"
              aria-label={`${row.quotationNo} 상세 보기`}
              onClick={(event) => {
                event.stopPropagation();
                onOpenQuotation(row);
              }}
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
              {row.quotationNo}
            </Link>
          )
        : undefined,
    },
    {
      field: 'quotationDt',
      headerName: '견적작성일',
      type: 'date',
      width: 110,
      align: 'center',
      editable: false,
      mergeRows: true,
      search: {
        required: true,
        label: '견적작성일',
        order: 1,
        span: 4,
        group: '견적작성일',
        defaultValue: {
          from: { type: 'systemDate', offset: { months: -1 } },
          to: { type: 'systemDate' },
        },
      },
    },
    {
      field: 'submitDt',
      headerName: '제출일',
      type: 'date',
      width: 110,
      align: 'center',
      editable: false,
      mergeRows: true,
      search: { label: '제출일', order: 5, span: 4, group: '견적정보' },
    },
    {
      field: 'customerCode',
      headerName: '거래처코드',
      width: 110,
      align: 'center',
      editable: false,
      mergeRows: true,
      search: { hidden: true },
    },
    {
      field: 'customerName',
      headerName: '거래처명',
      width: 170,
      editable: false,
      mergeRows: true,
      search: { label: '거래처', order: 3, span: 2, group: '견적정보' },
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
      width: 120,
      align: 'center',
      editable: false,
      search: { hidden: true },
    },
    {
      field: 'materialName',
      headerName: '품목명',
      width: 180,
      editable: false,
      search: { label: '품목', order: 4, span: 2, group: '견적정보' },
    },
    {
      field: 'materialSpec',
      headerName: '규격',
      width: 140,
      editable: false,
      search: { hidden: true },
    },
    {
      field: 'unit',
      headerName: '단위',
      width: 80,
      align: 'center',
      editable: false,
      search: { hidden: true },
    },
    { ...amountColumn('quotationQty', '견적수량', 'decimal'), summaryType: 'sum' },
    amountColumn('unitPrice', '견적단가', 'currency'),
    { ...amountColumn('lineAmt', '견적금액', 'currency'), summaryType: 'sum' },
    amountColumn('supplyAmt', '공급가액', 'currency'),
    amountColumn('vatAmt', '부가세', 'currency'),
    amountColumn('totalAmt', '총액', 'currency'),
    {
      field: 'detailRemark',
      headerName: '비고',
      width: 180,
      editable: false,
      search: { hidden: true },
    },
  ];
}
