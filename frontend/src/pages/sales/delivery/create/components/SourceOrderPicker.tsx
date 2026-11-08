import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import { Box, Button, TextField } from '@mui/material';
import { CommonDialog } from '../../../../../shared/components/CommonDialog';
import { PageMessageArea } from '../../../../../shared/components/PageMessageArea';
import { F1Grid, type F1GridColumn } from '../../../../../shared/components/f1-grid';
import { searchSourceOrders } from '../services/salesDelivery.service';
import type { SourceOrderRow } from '../types/salesDelivery.types';

const SEARCH_CONTROL_HEIGHT = 40;
type SourcePlanRow = SourceOrderRow & { excessQty: number };

export function SourceOrderPicker({ open, onClose, onSelect }: {
  open: boolean; onClose: () => void; onSelect: (rows: SourceOrderRow[]) => void;
}) {
  const [keyword, setKeyword] = useState('');
  const [rows, setRows] = useState<SourceOrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);
  const search = useCallback(async () => {
    const token = ++request.current;
    setLoading(true); setError('');
    try { const result = await searchSourceOrders(keyword); if (token === request.current) setRows(result); }
    catch (cause) { if (token === request.current) setError(cause instanceof Error ? cause.message : '수주 조회에 실패했습니다.'); }
    finally { if (token === request.current) setLoading(false); }
  }, [keyword]);
  useEffect(() => {
    return () => { request.current += 1; };
  }, []);
  const displayRows = useMemo<SourcePlanRow[]>(() => rows.map((row) => ({
    ...row, excessQty: Math.max(-Number(row.remainingQty), 0),
  })), [rows]);
  const columns = useMemo<F1GridColumn<SourcePlanRow>[]>(() => [
    { field: 'planNo', headerName: '계획번호', width: 165, align: 'center',
      renderCell: ({ row }) => <Button size="small" sx={{ minWidth: 0, px: 0.5, whiteSpace: 'nowrap' }}
        onClick={() => onSelect(rows.filter((item) => item.salesOrderId === row.salesOrderId))}>{row.planNo} 선택</Button> },
    { field: 'orderDt', headerName: '수주일자', type: 'date', width: 96, align: 'center' },
    { field: 'planDt', headerName: '계획일자', type: 'date', width: 96, align: 'center' },
    { field: 'customerName', headerName: '거래처', width: 125, align: 'center' },
    { field: 'materialCode', headerName: '품목코드', width: 100, align: 'center' },
    { field: 'materialName', headerName: '품목명', width: 135, align: 'center' },
    { field: 'plannedQty', headerName: '계획수량', type: 'decimal', width: 90, align: 'right' },
    { field: 'deliveredQty', headerName: '기출하', type: 'decimal', width: 90, align: 'right' },
    { field: 'remainingQty', headerName: '미납수량', type: 'decimal', width: 90, align: 'right',
      renderCell: ({ row }) => Math.max(Number(row.remainingQty), 0).toLocaleString('ko-KR') },
    { field: 'excessQty', headerName: '초과출하', type: 'decimal', width: 90, align: 'right' },
  ], [rows, onSelect]);
  return <CommonDialog open={open} onClose={onClose} title="출하계획 선택" size="lg" fullScreenOnMobile
    bodyMode="fill" paperHeight="min(900px, 85vh)" actions={<Button onClick={onClose}>닫기</Button>}>
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, minWidth: 0, gap: 1.5 }}>
      <Box component="form" aria-label="출하계획 선택 검색" onSubmit={(event) => {
        event.preventDefault();
        void search();
      }} sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flexShrink: 0 }}>
        <TextField fullWidth size="small" margin="none" label="계획번호·수주번호·거래처 검색" value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          sx={{ flex: 1, minWidth: 0, '& .MuiOutlinedInput-root': { height: SEARCH_CONTROL_HEIGHT } }} />
        <Button type="submit" variant="contained" disabled={loading} startIcon={<SearchIcon />}
          sx={{ flexShrink: 0, minWidth: 88, height: SEARCH_CONTROL_HEIGHT, minHeight: SEARCH_CONTROL_HEIGHT }}>검색</Button>
      </Box>
      <PageMessageArea message={error} />
      <Box sx={{ flex: 1, minWidth: 0, minHeight: 240, overflow: 'hidden' }}>
      <F1Grid ariaLabel="출하 대상 계획 목록" rows={displayRows} columns={columns} rowKey="salesDeliveryPlanDetailId"
        loading={loading} showCheckbox={false} canExportExcel={false} allowAddRowInContextMenu={false}
        allowDeleteRowInContextMenu={false} allowDuplicateRowInContextMenu={false} height="100%" />
      </Box>
    </Box>
  </CommonDialog>;
}
