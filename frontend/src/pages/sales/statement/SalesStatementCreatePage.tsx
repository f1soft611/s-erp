import { useCallback, useEffect, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import SaveIcon from '@mui/icons-material/Save';
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import PrintIcon from '@mui/icons-material/Print';
import { Alert, Box, IconButton, InputAdornment, Paper, TextField, Typography } from '@mui/material';
import { PageHeader } from '../../../shared/components/PageHeader';
import { PageMessageArea } from '../../../shared/components/PageMessageArea';
import { UnsavedChangesConfirmDialog } from '../../../shared/components/UnsavedChangesConfirmDialog';
import { useCommonConfirmDialog } from '../../../shared/hooks/useCommonConfirmDialog';
import { useUnsavedChangesBeforeUnload } from '../../../shared/hooks/useUnsavedChangesBeforeUnload';
import { F1Grid, type F1GridColumn } from '../../../shared/components/f1-grid';
import { getDelivery, localDate } from '../delivery/create/services/salesDelivery.service';
import { StatementSourcePicker } from './StatementSourcePicker';
import { StatementPrint } from './StatementPrint';
import { createStatement, deleteStatement, getStatement, updateStatement } from './statement.service';
import type { StatementDetail, StatementItem, StatementPageProps, StatementSource } from './types';

export type StatementEmbeddedActions = {
  canSave: boolean; canDelete: boolean; saving: boolean; saveDisabled: boolean;
  save: () => void; remove: () => void; print: () => void; canPrint: boolean;
};
type Props = StatementPageProps & {
  statementId?: number; embedded?: boolean; mode?: 'view' | 'edit';
  onSaved?: () => void; onDeleted?: () => void;
  onDirtyChange?: (dirty: boolean) => void; onPendingChange?: (pending: boolean) => void;
  onEmbeddedActionsChange?: (actions: StatementEmbeddedActions | null) => void;
};
const columns: F1GridColumn<StatementDetail>[] = [
  { field: 'lineNo', headerName: 'No', type: 'rownumber', width: 56, align: 'center' },
  { field: 'materialCode', headerName: '품목코드', width: 120, align: 'center' },
  { field: 'materialName', headerName: '품목명', width: 180, align: 'center' },
  { field: 'materialSpec', headerName: '품목규격', width: 150, align: 'center' },
  { field: 'unit', headerName: '단위', width: 80, align: 'center' },
  ...(['deliveryQty', 'unitPrice', 'supplyAmt', 'vatAmt', 'totalAmt'] as const).map((field, index) => ({
    field, headerName: ['수량', '단가', '공급가', 'VAT', '합계'][index],
    type: 'decimal' as const, decimalPlaces: 2, width: 130, align: 'right' as const,
  })),
];

export function SalesStatementCreatePage({
  currentMenuName, content, breadcrumbItems, selectedMenuPermissions: permissions,
  statementId, embedded = false, mode = 'edit', onSaved, onDeleted,
  onDirtyChange, onPendingChange, onEmbeddedActionsChange,
}: Props) {
  const [id, setId] = useState(statementId);
  const [item, setItem] = useState<StatementItem | null>(null);
  const [source, setSource] = useState<StatementSource | null>(null);
  const [rows, setRows] = useState<StatementDetail[]>([]);
  const [date, setDate] = useState(localDate);
  const [remark, setRemark] = useState('');
  const [baseline, setBaseline] = useState(() => JSON.stringify([null, localDate(), '']));
  const [picker, setPicker] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const busy = useRef(false);
  const canRead = Boolean(permissions?.read);
  const canSave = canRead && mode !== 'view' && Boolean(id ? permissions?.update : permissions?.create);
  const canDelete = canRead && mode !== 'view' && Boolean(id && permissions?.delete);
  const editable = canSave && !pending;
  const { confirm, dialog } = useCommonConfirmDialog();
  const dirty = JSON.stringify([source?.salesDeliveryId ?? null, date, remark]) !== baseline;
  useUnsavedChangesBeforeUnload(dirty);
  const blocker = useBlocker(!embedded && (dirty || pending));
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);
  useEffect(() => onPendingChange?.(pending), [pending, onPendingChange]);
  const apply = useCallback((value: StatementItem) => {
    setItem(value); setId(value.salesStatementId);
    setSource({ salesDeliveryId: value.salesDeliveryId, deliveryNo: value.deliveryNo, deliveryDt: value.deliveryDt,
      deliveryType: value.deliveryType, customerName: value.customerName ?? '', totalAmt: value.totalAmt });
    setDate(value.statementDt); setRemark(value.remark ?? ''); setRows(value.details);
    setBaseline(JSON.stringify([value.salesDeliveryId, value.statementDt, value.remark ?? '']));
  }, []);
  useEffect(() => {
    if (!statementId || !canRead) return;
    let active = true;
    setPending(true);
    getStatement(statementId).then((value) => { if (active) apply(value); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : '명세서 조회에 실패했습니다.'); })
      .finally(() => { if (active) setPending(false); });
    return () => { active = false; };
  }, [statementId, canRead, apply]);
  const choose = useCallback(async (value: StatementSource) => {
    setPicker(false); setPending(true); setError('');
    try {
      const delivery = await getDelivery(value.salesDeliveryId);
      setSource(value);
      setRows(delivery.details.map((row) => ({ ...row, salesStatementDetailId: row.salesDeliveryDetailId, materialSpec: row.materialSpec ?? null })));
    } catch (cause) { setError(cause instanceof Error ? cause.message : '출하 조회에 실패했습니다.'); }
    finally { setPending(false); }
  }, []);
  const reset = useCallback(() => {
    const today = localDate();
    setId(undefined); setItem(null); setSource(null); setRows([]); setDate(today); setRemark('');
    setBaseline(JSON.stringify([null, today, ''])); setError(''); setNotice('');
  }, []);
  const save = useCallback(async () => {
    if (!editable || busy.current) return;
    if (!source || !date) { setError('출하와 명세일을 입력해 주세요.'); return; }
    busy.current = true; setPending(true); setError(''); setNotice('');
    try {
      const value = id ? await updateStatement(id, { statementDt: date, remark })
        : await createStatement({ salesDeliveryId: source.salesDeliveryId, statementDt: date, remark });
      apply(value); setNotice(`거래명세서가 저장되었습니다. 명세번호: ${value.statementNo}`); onSaved?.();
    } catch (cause) { setError(cause instanceof Error ? cause.message : '거래명세서 저장에 실패했습니다.'); }
    finally { busy.current = false; setPending(false); }
  }, [editable, source, date, remark, id, apply, onSaved]);
  const remove = useCallback(async () => {
    if (!canDelete || !id || busy.current) return;
    if (!(await confirm({ title: '거래명세서 삭제', description: '거래명세서를 삭제하시겠습니까?' }))) return;
    busy.current = true; setPending(true); setError('');
    try { await deleteStatement(id); reset(); onDeleted?.(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '거래명세서 삭제에 실패했습니다.'); }
    finally { busy.current = false; setPending(false); }
  }, [canDelete, id, reset, onDeleted, confirm]);
  const handleNew = useCallback(async () => {
    if (dirty && !(await confirm({ description: '입력 내용을 초기화하시겠습니까?' }))) return;
    reset();
  }, [confirm, dirty, reset]);
  const print = useCallback(() => setPrinting(true), []);
  useEffect(() => {
    if (embedded) onEmbeddedActionsChange?.({
      canSave, canDelete, saving: pending, saveDisabled: !editable,
      save: () => void save(), remove: () => void remove(), print, canPrint: Boolean(item),
    });
  }, [embedded, onEmbeddedActionsChange, canSave, canDelete, pending, editable, save, remove, print, item]);
  useEffect(() => () => onEmbeddedActionsChange?.(null), [onEmbeddedActionsChange]);
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
      <PageMessageArea message={error} onClose={() => setError('')} />
      {notice ? <Alert severity="success">{notice}</Alert> : null}
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
          <F1Grid ariaLabel="거래명세서 상세 목록" rows={rows} columns={columns} rowKey="salesStatementDetailId"
            showCheckbox={false} selectionMode="row" canExportExcel={false} allowAddRowInContextMenu={false}
            allowDeleteRowInContextMenu={false} allowDuplicateRowInContextMenu={false} height="100%" />
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
