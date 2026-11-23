import { Chip } from '@mui/material';
import type { F1GridColumn } from '../../../../../shared/components/f1-grid';
import type { DestinationCustomer, SalesDestinationGridRow } from '../types/salesDestination.types';

export const customerColumns: F1GridColumn<DestinationCustomer>[] = [
  { field: 'customerId', headerName: 'No', type: 'rownumber', width: 48, align: 'center' },
  { field: 'customerCode', headerName: '거래처코드', width: 90, align: 'center'  },
  { field: 'customerName', headerName: '거래처명', width: 150 },
  { field: 'hasDestination', headerName: '등록여부', width: 80, align: 'center',
    renderCell: ({ row }) => <Chip size="small" color={row.hasDestination ? 'success' : 'default'}
      variant={row.hasDestination ? 'filled' : 'outlined'} label={row.hasDestination ? '등록' : '미등록'} /> },
];

export function destinationColumns(canCreate: boolean, canUpdate: boolean): F1GridColumn<SalesDestinationGridRow>[] {
  const editable = (row: SalesDestinationGridRow) =>
    typeof row.salesDestinationId === 'string' ? canCreate : canUpdate;
  return [
    { field: 'salesDestinationId', headerName: 'No', type: 'rownumber', width: 48, align: 'center',  form: { hidden: true } },
    { field: 'destinationCode', headerName: '납품처코드', width: 110, editable: false, align: 'center', form: { hidden: true } },
    { field: 'destinationName', headerName: '납품처명', width: 150, editable, required: true },
    { field: 'businessNo', headerName: '사업자번호', width: 130, editable,
      inputFormat: { type: 'digits', groupSizes: [3, 2], maxDigits: 10, validDigitCounts: [10] } },
    { field: 'address', headerName: '납품처주소', width: 210, editable },
    { field: 'contactName', headerName: '담당자', width: 100, editable },
    { field: 'mobileNo', headerName: '이동전화번호', width: 130, editable,
      inputFormat: { type: 'korean-phone', maxDigits: 11 } },
    { field: 'telephoneNo', headerName: '전화번호', width: 130, editable,
      inputFormat: { type: 'korean-phone', maxDigits: 11 } },
    { field: 'facsimileNo', headerName: '팩스번호', width: 130, editable,
      inputFormat: { type: 'korean-phone', maxDigits: 11 } },
    { field: 'remark', headerName: '비고', width: 180, editable },
  ];
}
