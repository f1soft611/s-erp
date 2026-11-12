import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import { Box, Button, TextField } from '@mui/material';
import { CommonDialog } from '../../../../../shared/components/CommonDialog';
import { PageMessageArea } from '../../../../../shared/components/PageMessageArea';
import { F1Grid, type F1GridColumn, type F1GridRef } from '../../../../../shared/components/f1-grid';
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
  const [selectedRowIds, setSelectedRowIds] = useState<(string | number)[]>([]);
  const request = useRef(0);
  const grid = useRef<F1GridRef<SourcePlanRow>>(null);
  const search = useCallback(async () => {
    const token = ++request.current;
    grid.current?.clearSelection();
    setSelectedRowIds([]);
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
    { field: 'orderNo', headerName: '수주번호', width: 150, align: 'center', mergeRows: true },
    { field: 'planNo', headerName: '계획번호', width: 140, align: 'center' },
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
  ], []);
  const selectedOrderIds = useMemo(() => {
    const selectedIds = new Set(selectedRowIds.map(String));
    return new Set(rows.filter((row) => selectedIds.has(String(row.salesDeliveryPlanDetailId)))
      .map((row) => row.salesOrderId));
  }, [rows, selectedRowIds]);
  const select = () => {
    if (!selectedOrderIds.size) return;
    const selectedRows = rows.filter((row) => selectedOrderIds.has(row.salesOrderId));
    if (new Set(selectedRows.map((row) => row.customerId)).size !== 1) {
      setError('서로 다른 거래처의 수주는 한 출하 문서에 함께 선택할 수 없습니다.');
      return;
    }
    onSelect(selectedRows);
  };
  return <CommonDialog open={open} onClose={onClose} title="수주 선택" size="lg" fullScreenOnMobile
    bodyMode="fill" paperHeight="min(900px, 85vh)" actions={<>
      <Button variant="contained" disabled={loading || selectedOrderIds.size === 0} onClick={select}>선택</Button>
      <Button onClick={onClose}>닫기</Button>
    </>}>
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, minWidth: 0, gap: 1.5 }}>
      <Box component="form" aria-label="수주 선택 검색" onSubmit={(event) => {
        event.preventDefault();
        void search();
      }} sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flexShrink: 0 }}>
        <TextField fullWidth size="small" margin="none" label="수주번호·거래처 검색" value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          sx={{ flex: 1, minWidth: 0, '& .MuiOutlinedInput-root': { height: SEARCH_CONTROL_HEIGHT } }} />
        <Button type="submit" variant="contained" disabled={loading} startIcon={<SearchIcon />}
          sx={{ flexShrink: 0, minWidth: 88, height: SEARCH_CONTROL_HEIGHT, minHeight: SEARCH_CONTROL_HEIGHT }}>검색</Button>
      </Box>
      <PageMessageArea message={error} />
      <Box sx={{ flex: 1, minWidth: 0, minHeight: 240, overflow: 'hidden' }}>
      <F1Grid ref={grid} ariaLabel="출하 대상 수주 목록" rows={displayRows} columns={columns} rowKey="salesDeliveryPlanDetailId"
        loading={loading} showCheckbox multiSelect selectionMode="row" onSelectionChange={setSelectedRowIds}
        canExportExcel={false} allowAddRowInContextMenu={false}
        allowDeleteRowInContextMenu={false} allowDuplicateRowInContextMenu={false} height="100%" />
      </Box>
    </Box>
  </CommonDialog>;
}
