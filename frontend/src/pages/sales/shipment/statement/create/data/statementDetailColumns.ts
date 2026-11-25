import type { F1GridColumn } from '../../../../../../shared/components/f1-grid';
import type { StatementDetail } from '../../types/salesStatement.types';
import { getDecimalColumnContract } from '../../../../../../shared/services/decimalColumnContract';

export const statementDetailColumns: F1GridColumn<StatementDetail>[] = [
  { field: 'lineNo', headerName: 'No', type: 'rownumber', width: 56, align: 'center' },
  { field: 'sourceDeliveryNo', headerName: '출하번호', width: 135, align: 'center' },
  { field: 'materialCode', headerName: '품목코드', width: 120, align: 'center' },
  { field: 'materialName', headerName: '품목명', width: 180, align: 'center' },
  { field: 'materialSpec', headerName: '품목규격', width: 150, align: 'center' },
  { field: 'unit', headerName: '단위', width: 80, align: 'center' },
  ...(['deliveryQty', 'unitPrice', 'supplyAmt', 'vatAmt', 'totalAmt'] as const).map((field, index) => {
    const { type, ...decimal } = getDecimalColumnContract('sales.delivery')[field];
    return { field, headerName: ['수량', '단가', '공급가', 'VAT', '합계'][index],
      type, decimal, exactDecimal: true, width: 130, align: 'right' as const };
  }),
];
