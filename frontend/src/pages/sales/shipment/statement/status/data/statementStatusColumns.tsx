import { Link } from '@mui/material';
import type { F1GridColumn } from '../../../../../../shared/components/f1-grid';
import type { StatementStatusRow } from '../../types/salesStatement.types';

export function createStatementStatusColumns(
  onOpenStatement: (row: StatementStatusRow) => void,
): F1GridColumn<StatementStatusRow>[] {
  return [
    { field: 'salesStatementDetailId', headerName: 'No', type: 'rownumber', width: 56, align: 'center', pinned: 'left' },
    { field: 'statementNo', headerName: '명세번호', width: 140, align: 'center', mergeRows: true,
      renderCell: ({ row }) => <Link component="button" type="button" aria-label={`${row.statementNo} 상세 보기`}
        onClick={(event) => { event.stopPropagation(); onOpenStatement(row); }}
        sx={{ fontWeight: 600, fontSize: 'inherit' }}>{row.statementNo}</Link> },
    { field: 'statementDt', headerName: '명세일', type: 'date', width: 90, align: 'center', mergeRows: true },
    { field: 'deliveryNo', headerName: '출하번호', width: 140, align: 'center', mergeRows: true },
    { field: 'customerCode', headerName: '거래처코드', width: 100, align: 'center', mergeRows: true },
    { field: 'customerName', headerName: '거래처명', width: 160, align: 'center', mergeRows: true },
    { field: 'materialCode', headerName: '품목코드', width: 120, align: 'center' },
    { field: 'materialName', headerName: '품목명', width: 180, align: 'center' },
    { field: 'materialSpec', headerName: '규격', width: 140, align: 'center' },
    { field: 'unit', headerName: '단위', width: 80, align: 'center' },
    ...(['deliveryQty', 'unitPrice', 'supplyAmt', 'vatAmt', 'lineTotalAmt'] as const).map((field, index) => ({
      field, headerName: ['수량', '단가', '공급가', 'VAT', '합계'][index],
      type: 'decimal' as const, width: 130, align: 'right' as const,
    })),
  ];
}
