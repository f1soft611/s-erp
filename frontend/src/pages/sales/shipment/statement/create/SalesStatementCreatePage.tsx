import SearchIcon from '@mui/icons-material/Search';
import SaveIcon from '@mui/icons-material/Save';
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import PrintIcon from '@mui/icons-material/Print';
import { Alert, Box, IconButton, InputAdornment, Paper, TextField, Typography } from '@mui/material';
import { PageHeader } from '../../../../../shared/components/PageHeader';
import { UnsavedChangesConfirmDialog } from '../../../../../shared/components/UnsavedChangesConfirmDialog';
import { StatementSourcePicker } from './components/StatementSourcePicker';
import { StatementDetailGrid } from './components/StatementDetailGrid';
import { StatementPrint } from '../components/StatementPrint';
import { useSalesStatementCreate } from './hooks/useSalesStatementCreate';
import type { SalesStatementCreateProps } from './types/salesStatementCreate.types';

export function SalesStatementCreatePage(props: SalesStatementCreateProps) {
  const { currentMenuName, content, breadcrumbItems, selectedMenuPermissions: permissions, embedded = false } = props;
  const {
    id, item, source, rows, date, setDate, remark, setRemark, picker, setPicker, printing, setPrinting,
    pending, error, setError, notice, canRead, canSave, canDelete, editable, dirty, blocker, dialog,
    choose, save, remove, handleNew, print,
  } = useSalesStatementCreate(props);
  if (!canRead) return <Alert severity="warning">거래명세서 조회 권한이 없습니다.</Alert>;
  return <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
    {!embedded ? <PageHeader breadcrumbItems={breadcrumbItems.length ? breadcrumbItems : [currentMenuName]}
      description={content.description} actionGroups={[
        { key: 'write', actions: [
          { label: '신규', icon: NoteAddOutlinedIcon, visible: Boolean(permissions?.create), disabled: pending,
            onClick: () => void handleNew() },
          { label: '저장', icon: SaveIcon, visible: canSave, disabled: !editable, saving: pending, onClick: () => void save() },
        ] },
        { key: 'delete', actions: [{ label: '삭제', icon: DeleteForeverOutlinedIcon, visible: canDelete,
          disabled: pending, onClick: () => void remove() }] },
        { key: 'print', actions: [{ label: '출력', icon: PrintIcon, visible: Boolean(item),
          disabled: pending || dirty, onClick: print }] },
      ]} /> : null}
    <Box role="region" aria-label="거래명세서 입력 내용" aria-busy={pending}
      sx={{ px: embedded ? 0 : { xs: 1, sm: 2 }, pt: embedded ? 0 : 1, pb: embedded ? 0 : 2,
        display: 'flex', flexDirection: 'column',
        minWidth: 0, minHeight: 0, flex: 1, overflowX: 'hidden', overflowY: 'auto', gap: 2 }}>
      {notice ? <Alert severity="success">{notice}</Alert> : null}
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, minWidth: 0, borderRadius: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>거래명세서 기본정보</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' },
          columnGap: 2, rowGap: 1, '& > .MuiFormControl-root': { m: 0 } }}>
          <TextField size="small" label="명세번호" value={item?.statementNo ?? '저장 시 자동 채번'} slotProps={{ input: { readOnly: true } }} />
          <TextField size="small" label="명세일" type="date" required value={date} disabled={!editable}
            onChange={(event) => setDate(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField size="small" label="출하번호" value={source?.deliveryNo ?? ''}
            slotProps={{ input: { readOnly: true, endAdornment: <InputAdornment position="end">
              <IconButton size="small" aria-label="출하 선택" disabled={!editable || Boolean(id)} onClick={() => setPicker(true)}>
                <SearchIcon fontSize="small" />
              </IconButton></InputAdornment> } }} />
          <TextField size="small" label="거래처" value={source?.customerName ?? ''} slotProps={{ input: { readOnly: true } }} />
          <TextField size="small" label="출하일자" value={source?.deliveryDt ?? ''} slotProps={{ input: { readOnly: true } }} />
          <TextField size="small" label="비고" multiline minRows={2} sx={{ gridColumn: '1 / -1' }} value={remark}
            disabled={!editable} onChange={(event) => setRemark(event.target.value)} slotProps={{ htmlInput: { maxLength: 500 } }} />
        </Box>
      </Paper>
      <Paper variant="outlined" sx={{ display: 'flex', flexDirection: 'column', flex: '1 0 auto', minHeight: 320, minWidth: 0, borderRadius: 1, overflow: 'hidden', pb: 1 }}>
        <Box sx={{ p: { xs: 1.5, sm: 2 }, pb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>거래명세서 상세</Typography>
          <Typography variant="caption" color="text.secondary">출하 품목과 금액을 저장 시점 기준으로 보관합니다.</Typography>
        </Box>
        <Box sx={{ minHeight: 260, minWidth: 0, flex: '1 0 260px', overflow: 'hidden', px: 1 }}>
          <StatementDetailGrid rows={rows} />
        </Box>
      </Paper>
    </Box>
    <StatementSourcePicker open={picker} onClose={() => setPicker(false)} onSelect={(value) => void choose(value)} />
    {printing && item ? <StatementPrint item={item} onClose={() => setPrinting(false)} /> : null}
    <UnsavedChangesConfirmDialog open={blocker.state === 'blocked'} disableContinue={pending}
      onCancel={() => blocker.state === 'blocked' && blocker.reset()}
      onContinue={() => blocker.state === 'blocked' && blocker.proceed()} />
    {dialog}
  </Box>;
}
