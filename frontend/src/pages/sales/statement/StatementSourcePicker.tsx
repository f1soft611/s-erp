import { useState } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import { Box, Button, TextField } from '@mui/material';
import { CommonDialog } from '../../../shared/components/CommonDialog';
import { PageMessageArea } from '../../../shared/components/PageMessageArea';
import { F1Grid, type F1GridColumn } from '../../../shared/components/f1-grid';
import { searchStatementSources } from './statement.service';
import type { StatementSource } from './types';

export function StatementSourcePicker({ open, onClose, onSelect }: {
  open: boolean; onClose: () => void; onSelect: (source: StatementSource) => void;
}) {
  const [keyword, setKeyword] = useState('');
  const [rows, setRows] = useState<StatementSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  async function search() {
    setLoading(true); setError('');
    try { setRows(await searchStatementSources(keyword)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '출하 조회에 실패했습니다.'); }
    finally { setLoading(false); }
  }
  const columns: F1GridColumn<StatementSource>[] = [
    { field: 'deliveryNo', headerName: '출하번호', width: 150, align: 'center',
      renderCell: ({ row }) => <Button size="small" onClick={() => onSelect(row)}>{row.deliveryNo}</Button> },
    { field: 'deliveryDt', headerName: '출하일자', type: 'date', width: 100, align: 'center' },
    { field: 'customerName', headerName: '거래처', width: 180, align: 'center' },
    { field: 'deliveryType', headerName: '출하구분', width: 100, align: 'center',
      renderCell: ({ row }) => row.deliveryType === 'ORDER' ? '수주출하' : '직출하' },
    { field: 'totalAmt', headerName: '합계', type: 'decimal', width: 140, align: 'right' },
  ];
  return <CommonDialog open={open} onClose={onClose} title="출하 선택" size="lg" fullScreenOnMobile
    bodyMode="fill" paperHeight="min(900px, 85vh)" actions={<Button onClick={onClose}>닫기</Button>}>
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, gap: 1.5 }}>
      <Box component="form" onSubmit={(event) => { event.preventDefault(); void search(); }}
        sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
        <TextField fullWidth size="small" label="출하번호·거래처 검색" value={keyword}
          onChange={(event) => setKeyword(event.target.value)} sx={{ '& .MuiOutlinedInput-root': { height: 40 } }} />
        <Button type="submit" variant="contained" disabled={loading} startIcon={<SearchIcon />}
          sx={{ flexShrink: 0, minWidth: 88, height: 40 }}>검색</Button>
      </Box>
      <PageMessageArea message={error} />
      <Box sx={{ flex: 1, minHeight: 240, minWidth: 0, overflow: 'hidden' }}>
        <F1Grid ariaLabel="출하 선택 목록" rows={rows} columns={columns} rowKey="salesDeliveryId"
          loading={loading} showCheckbox={false} selectionMode="row" canExportExcel={false}
          allowAddRowInContextMenu={false} allowDeleteRowInContextMenu={false}
          allowDuplicateRowInContextMenu={false} height="100%" />
      </Box>
    </Box>
  </CommonDialog>;
}
