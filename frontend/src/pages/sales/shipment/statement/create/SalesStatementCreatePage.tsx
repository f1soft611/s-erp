import SearchIcon from '@mui/icons-material/Search';
import SaveIcon from '@mui/icons-material/Save';
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import PrintIcon from '@mui/icons-material/Print';
import { Alert, Box, IconButton, InputAdornment, Paper, TextField, Typography } from '@mui/material';
import { usePolicyDecimalStatus } from '../../../../../shared/components/f1-grid/core/gridDecimalPolicyContext';
import { getDecimalColumnContract, resolveDecimalColumn } from '../../../../../shared/services/decimalColumnContract';
import { formatSalesOrderAmount, sumExactSalesAmounts } from '../../../order/create/data/salesOrderAmounts';
import { PageLoadBoundary } from '../../../../../shared/components/PageLoadBoundary';
import { resetGridDecimalPolicyCache } from '../../../../../shared/services/gridDecimalPolicy.service';
import { PageHeader } from '../../../../../shared/components/PageHeader';
import { UnsavedChangesConfirmDialog } from '../../../../../shared/components/UnsavedChangesConfirmDialog';
import { DateEditor } from '../../../../../shared/components/f1-grid/editing/DateEditor';
import { StatementSourcePicker } from './components/StatementSourcePicker';
import { StatementDetailGrid } from './components/StatementDetailGrid';
import { StatementPrint } from '../components/StatementPrint';
import { useSalesStatementCreate } from './hooks/useSalesStatementCreate';
import type { SalesStatementCreateProps } from './types/salesStatementCreate.types';

export function SalesStatementCreatePage(props: SalesStatementCreateProps) {
  const { currentMenuName, content, breadcrumbItems, selectedMenuPermissions: permissions, embedded = false } = props;
  const {
    id, item, source, rows, selectedRowIds, setSelectedRowIds, date, changeDate, commitDate, dateError, remark, setRemark, picker, setPicker, printing, setPrinting,
    pending, error, setError, notice, canRead, canSave, canDelete, editable, dirty, blocker, dialog,
    choose, save, remove, handleNew, print, initialLoad, retryLoad,
  } = useSalesStatementCreate(props);
  const policyState = usePolicyDecimalStatus();
  const policy = policyState.rule;
  const amountRule = policy && ('places' in policy ? policy : policy.currency);
  const contract = getDecimalColumnContract('sales.delivery');
  const summaryRules = policy && {
    supplyAmount: resolveDecimalColumn(contract.supplyAmt, policy),
    vatAmount: resolveDecimalColumn(contract.vatAmt, policy),
    totalAmount: resolveDecimalColumn(contract.deliveryTotal, policy),
  };
  let totals: ReturnType<typeof sumExactSalesAmounts> | null;
  try {
    const summed = id ? rows : rows.filter((row) => selectedRowIds.includes(row.salesStatementDetailId));
    totals = amountRule ? sumExactSalesAmounts(summed.map((row) => ({
      supplyAmount: row.supplyAmt, vatAmount: row.vatAmt, totalAmount: row.totalAmt,
    })), amountRule, summaryRules) : null;
  } catch {
    totals = null;
  }
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
    <PageLoadBoundary {...initialLoad} error={initialLoad.error ?? (policyState.network ? 'network' : null)} label="거래명세서등록"
      onRetry={() => { if (policyState.network) resetGridDecimalPolicyCache(); retryLoad(); }}>
    <Box role="region" aria-label="거래명세서 입력 내용" aria-busy={pending}
      sx={{ px: embedded ? 0 : 2, pt: embedded ? 0 : 2, pb: embedded ? 0 : 2,
        display: 'flex', flexDirection: 'column',
        minWidth: 0, minHeight: 0, flex: 1, overflowX: 'hidden', overflowY: 'auto', gap: 2 }}>
      {notice ? <Alert severity="success">{notice}</Alert> : null}
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      <Paper variant="outlined" sx={{ p: 2, minWidth: 0, borderRadius: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>거래명세서 기본정보</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' },
          columnGap: 2, rowGap: 1, '& > .MuiFormControl-root': { m: 0 } }}>
          <TextField size="small" label="명세번호" value={item?.statementNo ?? '저장 시 자동 채번'} slotProps={{ input: { readOnly: true } }} />
          <DateEditor label="명세일" variant="outlined" autoFocus={false} required value={date} disabled={!editable}
            onChange={changeDate} onBlur={commitDate} error={Boolean(dateError)} helperText={dateError} />
          <TextField size="small" label="출하번호" value={source?.deliveryNo ?? ''}
            slotProps={{ input: { readOnly: true, endAdornment: <InputAdornment position="end">
              <IconButton size="small" aria-label="출하 선택" disabled={!editable || Boolean(id)} onClick={() => setPicker(true)}>
                <SearchIcon fontSize="small" />
              </IconButton></InputAdornment> } }} />
          <TextField size="small" label="거래처" value={source?.customerName ?? ''} slotProps={{ input: { readOnly: true } }} />
          <DateEditor label="출하일자" variant="outlined" autoFocus={false}
            value={source?.deliveryDt.split(', ')[0] ?? ''} disabled
            onChange={changeDate}
            helperText={source?.deliveryNo.includes(', ') ? '첫 출하 기준' : undefined} />
          <TextField size="small" label="비고" multiline minRows={2} sx={{ gridColumn: '1 / -1' }} value={remark}
            disabled={!editable} onChange={(event) => setRemark(event.target.value)} slotProps={{ htmlInput: { maxLength: 500 } }} />
        </Box>
      </Paper>
      <Paper variant="outlined" sx={{ display: 'flex', flexDirection: 'column', flex: '1 0 auto', minHeight: 320, minWidth: 0, borderRadius: 1, overflow: 'hidden', pb: 1 }}>
        <Box sx={{ p: 2, pb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>거래명세서 상세</Typography>
          <Typography variant="caption" color="text.secondary">출하 품목과 금액을 저장 시점 기준으로 보관합니다.</Typography>
        </Box>
        <Box sx={{ minHeight: 260, minWidth: 0, flex: '1 0 260px', overflow: 'hidden', px: 2 }}>
          <StatementDetailGrid
            rows={rows}
            selectable={!id}
            selectedRowIds={selectedRowIds}
            onSelectionChange={setSelectedRowIds}
          />
        </Box>
        <Box aria-label="거래명세서 금액 합계" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 1, p: 2 }}>
          {([['공급가 합계', totals?.supplyAmount, summaryRules?.supplyAmount], ['부가세 합계', totals?.vatAmount, summaryRules?.vatAmount], ['총 합계', totals?.totalAmount, summaryRules?.totalAmount]] as const).map(([label, value, displayRule]) => (
            <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, px: 1.5, py: 1 }}>
              <Typography variant="body2" color="text.secondary">{label}</Typography>
              <Typography variant="body1" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{value === undefined ? (amountRule ? '계산 범위 초과' : '-') : formatSalesOrderAmount(value, displayRule ?? amountRule)}</Typography>
            </Box>
          ))}
        </Box>
      </Paper>
    </Box>
    </PageLoadBoundary>
    {picker ? <StatementSourcePicker open onClose={() => setPicker(false)} onSelect={(value) => void choose(value)} /> : null}
    {printing && item ? <StatementPrint item={item} onClose={() => setPrinting(false)} /> : null}
    <UnsavedChangesConfirmDialog open={blocker.state === 'blocked'} disableContinue={pending}
      onCancel={() => blocker.state === 'blocked' && blocker.reset()}
      onContinue={() => blocker.state === 'blocked' && blocker.proceed()} />
    {dialog}
  </Box>;
}
