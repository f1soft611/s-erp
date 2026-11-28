import type { F1GridColumn } from '../../../../../../shared/components/f1-grid';
import { decimalColumnOptions, getDecimalColumnContract } from '../../../../../../shared/services/decimalColumnContract';
import type { StatementSource } from '../../types/salesStatement.types';

// materialName은 검색 전용(숨김) 필드이다. 응답 행에는 없다.
export type StatementSourceGridRow = StatementSource & { materialName?: string };

// 상세검색 조건은 출하현황(SalesDeliveryStatusPage)과 동일하다.
export function createStatementSourceColumns(): F1GridColumn<StatementSourceGridRow>[] {
  return [
    { field: 'deliveryNo', headerName: '출하번호', width: 150, align: 'center',
      highlightSearch: true, search: { label: '출하번호', order: 5, span: 1, group: '출하 조건' } },
    { field: 'deliveryDt', headerName: '출하일자', type: 'date', width: 100, align: 'center',
      search: { required: true, label: '출하일', order: 1, span: 2, group: '기준일',
        defaultValue: {
          from: { type: 'systemDate', offset: { months: -1 } },
          to: { type: 'systemDate' },
        } } },
    { field: 'customerName', headerName: '거래처', width: 180, align: 'center', highlightSearch: true,
      search: { label: '거래처', order: 3, span: 1, group: '출하 조건' } },
    { field: 'deliveryType', headerName: '출하구분', type: 'select', width: 100, align: 'center',
      options: [{ value: '', label: '전체' }, { value: 'DIRECT', label: '직출하' }, { value: 'ORDER', label: '수주출하' }],
      search: { label: '출하구분', order: 2, span: 1, group: '출하 조건' },
      renderCell: ({ row }) => row.deliveryType === 'ORDER' ? '수주출하' : '직출하' },
    { field: 'materialName', headerName: '품목', width: 120, hidden: true,
      search: { label: '품목', order: 4, span: 1, group: '출하 조건' } },
    { field: 'totalAmt', headerName: '합계', ...decimalColumnOptions(getDecimalColumnContract('sales.delivery'), 'deliveryTotal'), exactDecimal: true, width: 140, align: 'right',
      search: { hidden: true } },
  ];
}
