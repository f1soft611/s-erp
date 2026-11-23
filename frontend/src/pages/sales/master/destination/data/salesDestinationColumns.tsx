import { Chip } from '@mui/material';
import type { F1GridColumn } from '../../../../../shared/components/f1-grid';
import type { DestinationCustomer, SalesDestinationGridRow } from '../types/salesDestination.types';

export const customerColumns: F1GridColumn<DestinationCustomer>[] = [
  { field: 'customerCode', headerName: '거래처코드', width: 90 },
  { field: 'customerName', headerName: '거래처명', width: 130 },
  { field: 'hasDestination', headerName: '납품처 등록', width: 100, align: 'center',
    renderCell: ({ row }) => <Chip size="small" color={row.hasDestination ? 'success' : 'default'}
      variant={row.hasDestination ? 'filled' : 'outlined'} label={row.hasDestination ? '등록' : '미등록'} /> },
];

export function destinationColumns(canCreate: boolean, canUpdate: boolean): F1GridColumn<SalesDestinationGridRow>[] {
  const editable = (row: SalesDestinationGridRow) =>
    typeof row.salesDestinationId === 'string' ? canCreate : canUpdate;
  return [
    { field: 'salesDestinationId', headerName: 'No', type: 'rownumber', width: 48, form: { hidden: true } },
    { field: 'destinationCode', headerName: '납품처코드', width: 110, editable: false, form: { hidden: true } },
    { field: 'destinationName', headerName: '납품처명', width: 150, editable, required: true },
    { field: 'businessNo', headerName: '사업자번호', width: 130, editable },
    { field: 'address', headerName: '납품처주소', width: 210, editable },
    { field: 'contactName', headerName: '담당자', width: 100, editable },
    { field: 'mobileNo', headerName: '이동전화번호', width: 130, editable },
    { field: 'telephoneNo', headerName: '전화번호', width: 130, editable },
    { field: 'facsimileNo', headerName: '팩스번호', width: 130, editable },
    { field: 'remark', headerName: '비고', width: 180, editable },
  ];
}
