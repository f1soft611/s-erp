import { useMemo, type Dispatch, type SetStateAction } from 'react';
import { Box, Button, IconButton, InputAdornment, Paper, TextField, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { F1Grid, type F1GridColumn } from '../../../../shared/components/f1-grid';
import type { PlanRow } from '../types/salesDeliveryPlan.types';

export function DeliveryPlanForm({ planNo, orderNo, orderDt, customerName, rows, setRows, editable, canSelectOrder, onSelectOrder }: {
  planNo: string; orderNo: string; orderDt: string; customerName: string;
  rows: PlanRow[]; setRows: Dispatch<SetStateAction<PlanRow[]>>;
  editable: boolean; canSelectOrder: boolean; onSelectOrder: () => void;
}) {
  const columns = useMemo<F1GridColumn<PlanRow>[]>(() => [
    { field: 'rowId', headerName: '행', type: 'rownumber', width: 56, align: 'center' },
    { field: 'materialCode', headerName: '품목코드', width: 130, align: 'center' },
    { field: 'materialName', headerName: '품목명', width: 180, align: 'left' },
    { field: 'orderQty', headerName: '수주수량', type: 'decimal', width: 110, align: 'right' },
    { field: 'planDt', headerName: '계획일', width: 180, align: 'center',
      renderCell: ({ row }) => <TextField type="date" size="small" value={row.planDt ?? ''} disabled={!editable}
        sx={{ width: '100%', '& .MuiOutlinedInput-root': { height: 30 }, '& input': { py: 0.5 } }}
        onChange={(event) => setRows((current) => current.map((item) => item.rowId === row.rowId
          ? { ...item, planDt: event.target.value || null } : item))}
        slotProps={{ inputLabel: { shrink: true } }} /> },
    { field: 'plannedQty', headerName: '계획수량', width: 150, align: 'right',
      renderCell: ({ row }) => <TextField size="small" type="number" value={row.plannedQty}
        sx={{ width: '100%', '& .MuiOutlinedInput-root': { height: 30 }, '& input': { py: 0.5 } }}
        disabled={!editable} slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
        onChange={(event) => setRows((current) => current.map((item) => item.rowId === row.rowId
          ? { ...item, plannedQty: Number(event.target.value) } : item))} /> },
    { field: 'salesOrderDetailId', headerName: '합계', width: 110, align: 'right',
      renderCell: ({ row }) => {
        const total = rows.filter((item) => item.salesOrderDetailId === row.salesOrderDetailId)
          .reduce((sum, item) => sum + Number(item.plannedQty), 0);
        return <Box sx={{ color: total > row.orderQty ? 'error.main' : 'text.primary' }}>
          {total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </Box>;
      } },
    { field: 'salesDeliveryPlanDetailId', headerName: '분할', width: 160, align: 'center',
      renderCell: ({ row }) => <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Button size="small" startIcon={<AddIcon />} disabled={!editable}
          onClick={() => setRows((current) => [...current, { ...row, rowId: `split-${crypto.randomUUID()}`,
            salesDeliveryPlanDetailId: null, planDt: null, plannedQty: 0 }])}>분할</Button>
        {rows.filter((item) => item.salesOrderDetailId === row.salesOrderDetailId).length > 1
          ? <Button size="small" color="error" aria-label="분할행 삭제" disabled={!editable}
            onClick={() => setRows((current) => current.filter((item) => item.rowId !== row.rowId))}>
            <DeleteOutlinedIcon fontSize="small" />
          </Button> : null}
      </Box> },
  ], [editable, rows, setRows]);
  return <>
    <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, minWidth: 0, borderRadius: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>출하계획 기본정보</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' }, gap: 2 }}>
        <TextField size="small" label="계획번호" value={planNo || '저장 시 자동 채번'} slotProps={{ input: { readOnly: true } }} />
        <TextField size="small" fullWidth label="수주번호" value={orderNo}
          slotProps={{ input: { readOnly: true, endAdornment: <InputAdornment position="end">
            <Tooltip title="수주 선택"><span><IconButton size="small" aria-label="수주 선택" disabled={!canSelectOrder}
              onClick={onSelectOrder}><SearchIcon fontSize="small" /></IconButton></span></Tooltip>
          </InputAdornment> } }} />
        <TextField size="small" label="수주일자" value={orderDt} slotProps={{ input: { readOnly: true } }} />
        <TextField size="small" label="거래처" value={customerName} slotProps={{ input: { readOnly: true } }} />
      </Box>
    </Paper>
    <Paper variant="outlined" sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 320, minWidth: 0, borderRadius: 2, overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap', p: { xs: 1.5, sm: 2 } }}>
        <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }}>출하계획 상세</Typography>
          <Typography variant="caption" color="text.secondary">같은 수주 품목을 예정일별로 분할할 수 있습니다.</Typography></Box>
      </Box>
      <Box sx={{ flex: 1, minHeight: 260, minWidth: 0, overflow: 'hidden', px: 1 }}>
        <F1Grid ariaLabel="출하계획 상세 목록" rows={rows} columns={columns} rowKey="rowId"
          showCheckbox={false} height="100%" minHeight={260} rowHeight={44} minRowHeight={44} canExportExcel={false}
          allowAddRowInContextMenu={false} allowDuplicateRowInContextMenu={false} allowDeleteRowInContextMenu={false} />
      </Box>
    </Paper>
  </>;
}
