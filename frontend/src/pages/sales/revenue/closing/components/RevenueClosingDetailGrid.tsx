import { Box, Chip } from '@mui/material';
import { useMemo, type RefObject } from 'react';
import {
  F1Grid,
  type F1GridColumn,
  type F1GridRef,
  type F1GridRowId,
} from '../../../../../shared/components/f1-grid';
import { decimalColumnOptions, getDecimalColumnContract } from '../../../../../shared/services/decimalColumnContract';
import type { MenuPermission } from '../../../../dashboard/types/dashboard';
import type { RevenueClosingDetailRow } from '../types/revenueClosing.types';

type Props = {
  rows: RevenueClosingDetailRow[];
  selectedMenuPermissions?: MenuPermission;
  highlightKeyword?: string;
  loading?: boolean;
  onSelectionChange?: (rowIds: F1GridRowId[]) => void;
  gridRef?: RefObject<F1GridRef<RevenueClosingDetailRow> | null>;
};

/**
 * 매출마감은 출하 상세의 수량·금액을 읽기 전용으로 보여 주므로 같은 값을 계산·저장하는 출하 계약(sales.delivery)의
 * 해당 필드 설정을 따른다. 소수점은 계약 JSON에서만 정하고 화면에 직접 쓰지 않는다.
 */
export function createRevenueClosingColumns(): F1GridColumn<RevenueClosingDetailRow>[] {
  const contract = getDecimalColumnContract('sales.delivery');
  return [
    { field: 'deliveryNo', headerName: '출하번호', width: 140, align: 'center', highlightSearch: true },
    { field: 'deliveryDt', headerName: '출하일', type: 'date', width: 110, align: 'center' },
    { field: 'orderNo', headerName: '수주번호', width: 140, align: 'center', highlightSearch: true },
    { field: 'customerCode', headerName: '거래처코드', width: 120, align: 'center', highlightSearch: true },
    { field: 'customerName', headerName: '거래처명', width: 180, align: 'left', highlightSearch: true },
    { field: 'materialCode', headerName: '품목코드', width: 130, align: 'center', highlightSearch: true },
    { field: 'materialName', headerName: '품목명', width: 180, align: 'left', highlightSearch: true },
    { field: 'closingStatus', headerName: '마감상태', width: 110, align: 'center',
      renderCell: ({ row }) => (
        <Chip
          size="small"
          variant="outlined"
          color={row.closingStatus === 'CLOSED' ? 'success' : 'warning'}
          label={row.closingStatus === 'CLOSED' ? '마감' : '미마감'}
        />
      ) },
    { field: 'quantity', headerName: '수량', ...decimalColumnOptions(contract, 'deliveryQty'), exactDecimal: true, width: 120, align: 'right' },
    { field: 'salesAmount', headerName: '매출금액', ...decimalColumnOptions(contract, 'supplyAmt'), exactDecimal: true, width: 140, align: 'right' },
    { field: 'vatAmount', headerName: '부가세', ...decimalColumnOptions(contract, 'vatAmt'), exactDecimal: true, width: 130, align: 'right' },
    { field: 'totalAmount', headerName: '합계', ...decimalColumnOptions(contract, 'totalAmt'), exactDecimal: true, width: 140, align: 'right' },
  ];
}

export function RevenueClosingDetailGrid({
  rows,
  selectedMenuPermissions,
  highlightKeyword,
  loading = false,
  onSelectionChange,
  gridRef,
}: Props) {
  const columns = useMemo(createRevenueClosingColumns, []);
  return (
    <Box sx={{ flex: 1, minWidth: 0, minHeight: 0 }}>
      <F1Grid
        ref={gridRef}
        storageKey="sales-revenue-closing-detail-grid-v1"
        ariaLabel="매출대상 상세 목록"
        rows={rows}
        columns={columns}
        rowKey="rowId"
        highlightKeyword={highlightKeyword}
        loading={loading}
        selectionMode="row"
        multiSelect
        isRowSelectable={(row) => row.closingStatus === 'OPEN'}
        onSelectionChange={onSelectionChange}
        height="100%"
        showCheckbox
        canExportExcel={Boolean(selectedMenuPermissions?.excel)}
        allowAddRowInContextMenu={false}
        allowDuplicateRowInContextMenu={false}
        allowDeleteRowInContextMenu={false}
      />
    </Box>
  );
}
