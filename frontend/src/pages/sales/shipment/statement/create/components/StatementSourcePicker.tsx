import { useState } from 'react';
import ClearIcon from '@mui/icons-material/Clear';
import { Box, Button, IconButton, TextField } from '@mui/material';
import { CommonDialog } from '../../../../../../shared/components/CommonDialog';
import { PageSearchArea } from '../../../../../../shared/components/PageSearchArea';
import { PageMessageArea } from '../../../../../../shared/components/PageMessageArea';
import { F1Grid } from '../../../../../../shared/components/f1-grid';
import { searchStatementSources } from '../../services/salesStatement.service';
import type { StatementSource } from '../../types/salesStatement.types';
import { createStatementSourceColumns } from '../data/statementSourceColumns';

export function StatementSourcePicker({ open, onClose, onSelect }: {
  open: boolean; onClose: () => void; onSelect: (sources: StatementSource[]) => void;
}) {
  const [keyword, setKeyword] = useState('');
  const [rows, setRows] = useState<StatementSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRowIds, setSelectedRowIds] = useState<Array<number | string>>([]);
  function close() {
    setSelectedRowIds([]);
    onClose();
  }
  function completeSelection() {
    const selection = selectedSources;
    setSelectedRowIds([]);
    onSelect(selection);
  }
  async function search() {
    setLoading(true); setError('');
    try {
      setRows(await searchStatementSources(keyword));
      setSelectedRowIds([]);
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : '출하 조회에 실패했습니다.'); }
    finally { setLoading(false); }
  }
  const selected = new Set(selectedRowIds);
  const selectedSources = rows.filter((row) => selected.has(row.salesDeliveryId));
  const selectedCustomerId = selectedSources[0]?.customerId ?? null;
  const columns = createStatementSourceColumns();
  return <CommonDialog open={open} onClose={close} title="출하 선택" size="lg" fullScreenOnMobile
    bodyMode="fill" paperHeight="min(900px, 85vh)" actions={<>
      <Button onClick={close}>닫기</Button>
      <Button variant="contained" disabled={selectedSources.length === 0}
        onClick={completeSelection}>선택 완료</Button>
    </>}>
    <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, minWidth: 0, gap: 1.5 }}>
      <Box role="group" aria-label="출하 선택 검색" sx={{ minWidth: 0, flexShrink: 0 }}>
        <PageSearchArea mode="dialog" detailLoading={loading} onDefaultSearch={() => void search()}
          searchField={<TextField fullWidth size="small" margin="none" placeholder="출하번호·거래처 검색" value={keyword}
            disabled={loading} onChange={(event) => setKeyword(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '출하번호·거래처 검색' }, input: { endAdornment: keyword ? (
              <IconButton type="button" size="small" edge="end" aria-label="출하 선택 검색어 초기화" onClick={() => setKeyword('')} sx={{ p: 0.25 }}>
                <ClearIcon fontSize="small" /></IconButton>) : null } }}
            sx={(theme) => ({ width: '100%', height: 40, '& .MuiOutlinedInput-root': { height: 40, backgroundColor: theme.palette.background.paper } })} />} />
      </Box>
      <PageMessageArea message={error} />
      <Box sx={{ flex: 1, minHeight: 240, minWidth: 0, overflow: 'hidden' }}>
        <F1Grid storageKey="sales-statement-source-picker-v1" ariaLabel="출하 선택 목록" rows={rows} columns={columns} rowKey="salesDeliveryId"
          loading={loading} showCheckbox selectionMode="row" multiSelect
          isRowSelectable={(row) => selectedCustomerId === null || row.customerId === selectedCustomerId}
          onSelectionChange={setSelectedRowIds} canExportExcel={false}
          allowAddRowInContextMenu={false} allowDeleteRowInContextMenu={false}
          allowDuplicateRowInContextMenu={false} height="100%" />
      </Box>
    </Box>
  </CommonDialog>;
}
