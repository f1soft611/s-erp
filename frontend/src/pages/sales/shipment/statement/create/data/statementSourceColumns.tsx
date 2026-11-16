import { Button } from '@mui/material';
import type { F1GridColumn } from '../../../../../../shared/components/f1-grid';
import type { StatementSource } from '../../types/salesStatement.types';

export function createStatementSourceColumns(
  onSelect: (source: StatementSource) => void,
): F1GridColumn<StatementSource>[] {
  return [
    { field: 'deliveryNo', headerName: '출하번호', width: 150, align: 'center',
      renderCell: ({ row }) => <Button size="small" onClick={() => onSelect(row)}>{row.deliveryNo}</Button> },
    { field: 'deliveryDt', headerName: '출하일자', type: 'date', width: 100, align: 'center' },
    { field: 'customerName', headerName: '거래처', width: 180, align: 'center' },
    { field: 'deliveryType', headerName: '출하구분', width: 100, align: 'center',
      renderCell: ({ row }) => row.deliveryType === 'ORDER' ? '수주출하' : '직출하' },
    { field: 'totalAmt', headerName: '합계', type: 'decimal', width: 140, align: 'right' },
  ];
}
