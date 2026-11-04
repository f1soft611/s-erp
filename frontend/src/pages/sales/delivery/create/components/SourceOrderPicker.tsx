import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, TextField } from '@mui/material';
import { CommonDialog } from '../../../../../shared/components/CommonDialog';
import { PageSearchArea } from '../../../../../shared/components/PageSearchArea';
import { PageMessageArea } from '../../../../../shared/components/PageMessageArea';
import { F1Grid, type F1GridColumn } from '../../../../../shared/components/f1-grid';
import { searchSourceOrders } from '../services/salesDelivery.service';
import type { SourceOrderRow } from '../types/salesDelivery.types';

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
  const columns = useMemo<F1GridColumn<SourceOrderRow>[]>(() => [
    { field: 'orderNo', headerName: '수주번호', width: 190,
      renderCell: ({ row }) => <Button size="small" onClick={() => onSelect(rows.filter((item) => item.salesOrderId === row.salesOrderId))}>{row.orderNo} 선택</Button> },
    { field: 'orderDt', headerName: '수주일자', type: 'date', width: 120 },
    { field: 'customerName', headerName: '거래처', width: 160 },
    { field: 'materialCode', headerName: '품목코드', width: 120 },
    { field: 'materialName', headerName: '품목명', width: 160 },
    { field: 'orderQty', headerName: '주문수량', type: 'decimal', width: 110 },
    { field: 'shippedQty', headerName: '출하수량', type: 'decimal', width: 110 },
    { field: 'remainingQty', headerName: '잔량', type: 'decimal', width: 110 },
  ], [rows, onSelect]);
  return <CommonDialog open={open} onClose={onClose} title="수주 선택" size="lg" fullScreenOnMobile
    actions={<Button onClick={onClose}>닫기</Button>}>
    <PageSearchArea onDefaultSearch={() => void search()} searchField={
      <TextField fullWidth size="small" label="수주번호·거래처 검색" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
    }><Button disabled={loading} onClick={() => void search()}>검색</Button></PageSearchArea>
    <PageMessageArea message={error} />
    <Box sx={{ minWidth: 0, height: 420, overflow: 'hidden' }}>
      <F1Grid ariaLabel="납품 대상 수주 목록" rows={rows} columns={columns} rowKey="salesOrderDetailId"
        loading={loading} showCheckbox={false} canExportExcel={false} allowAddRowInContextMenu={false}
        allowDeleteRowInContextMenu={false} allowDuplicateRowInContextMenu={false} height="100%" />
    </Box>
  </CommonDialog>;
}
