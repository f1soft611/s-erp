import { useCallback, useEffect, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { Alert, Box, Button, IconButton, InputAdornment, MenuItem, Paper, TextField, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import SaveIcon from '@mui/icons-material/Save';
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageLoadBoundary } from '../../../../shared/components/PageLoadBoundary';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { UnsavedChangesConfirmDialog } from '../../../../shared/components/UnsavedChangesConfirmDialog';
import { useCommonConfirmDialog } from '../../../../shared/hooks/useCommonConfirmDialog';
import { useUnsavedChangesBeforeUnload } from '../../../../shared/hooks/useUnsavedChangesBeforeUnload';
import { CustomerPicker, MaterialPickerDialog } from '../../../../shared/components/master-picker/MasterPickers';
import type { F1GridChanges, F1GridRef } from '../../../../shared/components/f1-grid';
import { searchOrderCustomers, searchOrderMaterials } from '../../order/create/services/salesOrderMaster.service';
import { activeDeliveryRows, DeliveryDetailGrid } from './components/DeliveryDetailGrid';
import { SourceOrderPicker } from './components/SourceOrderPicker';
import {
  buildDeliveryPayload, createDelivery, deleteDelivery, deliveryForm, emptyDelivery, getDelivery,
  OverDeliveryConfirmationRequired, sourceOrderForm, updateDelivery, validateDelivery,
} from './services/salesDelivery.service';
import type { DeliveryForm, DeliveryItem, DeliveryPageProps, DeliveryPayload, DeliveryRow, SourceOrderRow } from './types/salesDelivery.types';

export type DeliveryEmbeddedActionState = {
  canSave: boolean; canDelete: boolean; saving: boolean; saveDisabled: boolean; deleteDisabled: boolean;
  save: () => void; remove: () => void;
};
type Props = DeliveryPageProps & {
  salesDeliveryId?: number;
  embedded?: boolean;
  mode?: 'view' | 'edit';
  onSaved?: (item: DeliveryItem) => void;
  onDeleted?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onPendingChange?: (pending: boolean) => void;
  onEmbeddedActionsChange?: (actions: DeliveryEmbeddedActionState | null) => void;
};
export function SalesDeliveryCreatePage({
  currentMenuName, content, breadcrumbItems, selectedMenuPermissions: permissions, salesDeliveryId,
  embedded = false, mode = 'edit', onSaved, onDeleted, onDirtyChange, onPendingChange, onEmbeddedActionsChange,
}: Props) {
  const [form, setForm] = useState<DeliveryForm>(emptyDelivery);
  const [baseline, setBaseline] = useState(() => JSON.stringify(form));
  const [rows, setRows] = useState<DeliveryRow[]>([]);
  const [gridKey, setGridKey] = useState(0);
  const [item, setItem] = useState<DeliveryItem | null>(null);
  const [savedId, setSavedId] = useState<number | undefined>(salesDeliveryId);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [pending, setPending] = useState(false);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [sourceOpen, setSourceOpen] = useState(false);
  const [materialOpen, setMaterialOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [confirm, setConfirm] = useState<'new' | 'delete' | null>(null);
  const [overDelivery, setOverDelivery] = useState<{ payload: DeliveryPayload; message: string } | null>(null);
  const { confirm: requestConfirmation, dialog } = useCommonConfirmDialog();
  const grid = useRef<F1GridRef<DeliveryRow>>(null);
  const busy = useRef(false);
  const materialPatch = useRef<((changes: Partial<DeliveryRow>) => void) | null>(null);
  const canRead = Boolean(permissions?.read);
  const canSave = canRead && mode !== 'view' && Boolean(savedId ? permissions?.update : permissions?.create);
  const canDelete = canRead && mode !== 'view' && Boolean(savedId && permissions?.delete);
  const editable = canSave && !pending && !loading && !locked && !overDelivery;
  const dirty = JSON.stringify(form) !== baseline;
  useUnsavedChangesBeforeUnload(dirty);
  const blocker = useBlocker(!embedded && (dirty || pending));
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);
  useEffect(() => onPendingChange?.(pending), [pending, onPendingChange]);
  const applyForm = useCallback((next: DeliveryForm) => {
    setForm(next); setRows(next.details); setGridKey((value) => value + 1);
    setBaseline(JSON.stringify(next)); setSelectedIds([]);
  }, []);
  const applyItem = useCallback((next: DeliveryItem) => {
    setItem(next); setSavedId(next.salesDeliveryId); setLocked(false); applyForm(deliveryForm(next));
  }, [applyForm]);
  const load = useCallback(async (id: number) => {
    setLoading(true); setLoadError(false); setError('');
    try { applyItem(await getDelivery(id)); }
    catch (cause) {
      setLoadError(true); setError(cause instanceof Error ? cause.message : '출하 조회에 실패했습니다.');
    } finally { setLoading(false); }
  }, [applyItem]);
  useEffect(() => {
    if (salesDeliveryId != null && canRead) void load(salesDeliveryId);
  }, [salesDeliveryId, canRead, load]);
  const change = <K extends keyof DeliveryForm>(key: K, value: DeliveryForm[K]) => {
    setForm((current) => ({ ...current, [key]: value })); setError(''); setNotice('');
  };
  const handleChanges = useCallback((changes: F1GridChanges<DeliveryRow>) => {
    const active = activeDeliveryRows(rows, changes);
    setForm((current) => ({ ...current, details: active }));
  }, [rows]);
  const openMaterial = useCallback((patch: (changes: Partial<DeliveryRow>) => void) => {
    materialPatch.current = patch; setMaterialOpen(true);
  }, []);
  const reset = () => {
    setItem(null); setSavedId(undefined); setLocked(false); setLoadError(false);
    setError(''); setNotice(''); applyForm(emptyDelivery()); setConfirm(null); setOverDelivery(null);
  };
  const savePayload = useCallback(async (payload: DeliveryPayload) => {
    if (busy.current || !canSave) return;
    busy.current = true; setPending(true); setError(''); setNotice('');
    try {
      const saved = savedId
        ? await updateDelivery(savedId, payload)
        : await createDelivery(payload);
      setSavedId(saved.salesDeliveryId);
      setItem(saved);
      setLocked(true);
      try {
        const detail = await getDelivery(saved.salesDeliveryId);
        applyItem(detail); setNotice(`출하가 저장되었습니다. 출하번호: ${detail.deliveryNo}`); onSaved?.(detail);
      } catch {
        setError(`출하는 저장되었지만 다시 불러오지 못했습니다. 출하번호: ${saved.deliveryNo}. 재조회를 눌러 주세요.`);
      }
    } catch (cause) {
      if (cause instanceof OverDeliveryConfirmationRequired) {
        setOverDelivery({ payload, message: cause.message });
      } else {
        setError(cause instanceof Error ? cause.message : '출하 저장에 실패했습니다.');
      }
    }
    finally { busy.current = false; setPending(false); }
  }, [canSave, savedId, applyItem, onSaved]);
  const save = useCallback(async () => {
    if (!editable || busy.current) return;
    const current = { ...form, details: grid.current?.getActiveRows() ?? form.details };
    const message = validateDelivery(current);
    grid.current?.validate();
    if (message) { setError(message); return; }
    await savePayload(buildDeliveryPayload(current));
  }, [editable, form, savePayload]);
  const requestDelete = useCallback(() => setConfirm('delete'), []);
  const deleteDisabled = pending || loading || locked || Boolean(overDelivery);
  useEffect(() => {
    if (embedded) onEmbeddedActionsChange?.({
      canSave, canDelete, saving: pending, saveDisabled: !editable, deleteDisabled,
      save: () => void save(), remove: requestDelete,
    });
  }, [embedded, onEmbeddedActionsChange, canSave, canDelete, pending, editable, deleteDisabled, save, requestDelete]);
  useEffect(() => () => onEmbeddedActionsChange?.(null), [onEmbeddedActionsChange]);
  const remove = async () => {
    setConfirm(null);
    if (!canDelete || !savedId || busy.current) return;
    busy.current = true; setPending(true); setError('');
    try { await deleteDelivery(savedId); reset(); setNotice('출하가 삭제되었습니다.'); onDeleted?.(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '출하 삭제에 실패했습니다.'); }
    finally { busy.current = false; setPending(false); }
  };
  const selectSource = useCallback((source: SourceOrderRow[]) => {
    const next = sourceOrderForm(source, form.deliveryDt);
    setForm(next); setRows(next.details); setGridKey((value) => value + 1);
    setSelectedIds([]); setSourceOpen(false); setError('');
  }, [form.deliveryDt]);
  const actions: PermissionActionGroupDefinition[] = [
    { key: 'write', actions: [
      { label: '신규', icon: NoteAddOutlinedIcon, visible: Boolean(permissions?.create) && mode !== 'view',
        disabled: pending || loading || Boolean(overDelivery), onClick: () => dirty ? setConfirm('new') : reset() },
      { label: '저장', icon: SaveIcon, visible: canSave, saving: pending, disabled: !editable, onClick: () => void save() },
    ] },
    { key: 'delete', actions: [
      { label: '삭제', icon: DeleteForeverOutlinedIcon, visible: Boolean(permissions?.delete) && mode !== 'view', disabled: !canDelete || deleteDisabled, onClick: requestDelete },
    ] },
  ];
  const totals = form.details.reduce((total, row) => ({
    supply: total.supply + Number(row.supplyAmt), vat: total.vat + Number(row.vatAmt), total: total.total + Number(row.totalAmt),
  }), { supply: 0, vat: 0, total: 0 });
  if (!canRead) return <Alert severity="warning">출하등록 조회 권한이 없습니다.</Alert>;
  return <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
    {!embedded ? <PageHeader breadcrumbItems={breadcrumbItems.length ? breadcrumbItems : [currentMenuName]} description={content.description} actionGroups={actions} /> : null}
    <Box role="region" aria-label="출하 입력 내용" aria-busy={pending || loading}
      sx={{ px: embedded ? 0 : { xs: 1, sm: 2 }, pt: embedded ? 0 : 1, pb: embedded ? 0 : 2,
        display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, flex: 1, overflowX: 'hidden', overflowY: 'auto', gap: 2 }}>
      <PageMessageArea message={error} onClose={() => setError('')} />
      {notice ? <Alert severity="success">{notice}</Alert> : null}
      {locked && savedId ? <Button startIcon={<SearchIcon />} disabled={pending || loading} onClick={() => void load(savedId)}>재조회</Button> : null}
      {loading ? <Typography role="status">출하를 불러오는 중입니다.</Typography> : null}
      <PageLoadBoundary loading={loading} error={loadError ? 'server' : null} label="출하등록"
        onRetry={() => savedId && void load(savedId)}>
        <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, minWidth: 0, borderRadius: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>출하 기본정보</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' }, columnGap: 2, rowGap: 1,
            '& > .MuiFormControl-root': { m: 0 }, '& > .MuiStack-root': { mt: 0 } }}>
            <TextField size="small" label="출하번호" value={item?.deliveryNo ?? '저장 시 자동 채번'} slotProps={{ input: { readOnly: true } }}
              sx={{ '& .MuiInputBase-input': { fontSize: { xs: '0.75rem', sm: '1rem' } } }} />
            <TextField size="small" label="출하일자" type="date" required value={form.deliveryDt} disabled={!editable}
              onChange={(event) => change('deliveryDt', event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            <CustomerPicker required disabled={!editable || Boolean(savedId) || form.deliveryType === 'ORDER'} triggerMode="icon"
              value={form.customerId ? { id: form.customerId, code: form.customerCode, name: form.customerName } : null}
              search={searchOrderCustomers} onChange={(customer) => {
                setForm((current) => ({ ...current, customerId: customer.id, customerCode: customer.code, customerName: customer.name }));
              }} />
            <TextField select size="small" label="출하구분" value={form.deliveryType} disabled={!editable || Boolean(savedId)}
              onChange={async (event) => {
                const deliveryType = event.target.value as DeliveryForm['deliveryType'];
                if (
                  form.details.length &&
                  !(await requestConfirmation({
                    description: '출하구분을 변경하면 거래처와 상세가 초기화됩니다. 계속하시겠습니까?',
                  }))
                ) {
                  return;
                }
                const next = { ...emptyDelivery(), deliveryDt: form.deliveryDt, deliveryType };
                setForm(next); setRows([]); setGridKey((value) => value + 1);
              }}>
              <MenuItem value="DIRECT">직출하</MenuItem><MenuItem value="ORDER">수주출하</MenuItem>
            </TextField>
            <TextField fullWidth size="small" label="연결 수주번호" value={form.orderNo}
              slotProps={{ input: { readOnly: true, endAdornment: form.deliveryType === 'ORDER' ? <InputAdornment position="end">
                <Tooltip title="계획 선택"><span><IconButton size="small" aria-label="계획 선택" disabled={!editable || Boolean(savedId)}
                  onClick={() => setSourceOpen(true)}><SearchIcon fontSize="small" /></IconButton></span></Tooltip>
              </InputAdornment> : null } }} />
            <TextField size="small" label="출하장소" value={form.deliveryPlace} disabled={!editable} onChange={(event) => change('deliveryPlace', event.target.value)} slotProps={{ htmlInput: { maxLength: 200 } }} />
            <TextField size="small" label="배송방법" value={form.deliveryMethod} disabled={!editable} onChange={(event) => change('deliveryMethod', event.target.value)} slotProps={{ htmlInput: { maxLength: 50 } }} />
            <TextField size="small" label="비고" multiline minRows={2} sx={{ gridColumn: '1 / -1' }} value={form.remark} disabled={!editable} onChange={(event) => change('remark', event.target.value)} slotProps={{ htmlInput: { maxLength: 500 } }} />
          </Box>
        </Paper>
        <Paper variant="outlined" sx={{ display: 'flex', flexDirection: 'column', flex: '1 0 auto', minHeight: 320, minWidth: 0, borderRadius: 1, overflow: 'hidden' }}>
        <Box data-testid="sales-delivery-detail-toolbar" sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 1, alignItems: 'center', p: { xs: 1.5, sm: 2 }, pb: 1 }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>출하 상세</Typography>
            <Typography variant="caption" color="text.secondary">{mode === 'view' ? '출하 품목 내역입니다.' : '행을 추가해 품목을 선택하세요. 마우스 오른쪽 버튼으로 행을 삭제할 수 있습니다.'}</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {canSave && form.deliveryType === 'DIRECT' ? <>
            <Button size="small" variant="outlined" startIcon={<AddIcon />} disabled={!editable} onClick={() => grid.current?.addRow()}>상세 행 추가</Button>
            <Button size="small" variant="outlined" startIcon={<SearchIcon />} disabled={!editable || selectedIds.length !== 1} onClick={() => {
              const row = grid.current?.getSelectedRows()[0];
              if (!row) return;
              materialPatch.current = (patch) => {
                grid.current?.setCellValue(row.rowId, 'materialCode', {
                  id: patch.materialId, code: patch.materialCode, name: patch.materialName,
                });
              };
              setMaterialOpen(true);
            }}>품목 선택</Button>
          </> : null}
          </Box>
        </Box>
        <Box sx={{ flex: '1 0 260px', minHeight: 260, minWidth: 0, overflow: 'hidden', px: 1 }}>
          <DeliveryDetailGrid key={gridKey} gridRef={grid} rows={rows} disabled={!editable} source={form.deliveryType === 'ORDER'}
            onChanges={handleChanges} onSelection={setSelectedIds} onMaterial={openMaterial} />
        </Box>
        <Box aria-label="출하 금액 합계" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 1, p: { xs: 1.5, sm: 2 } }}>
          {([['공급가 합계', totals.supply], ['부가세 합계', totals.vat], ['총 합계', totals.total]] as const).map(([label, amount]) => (
            <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, px: 1.5, py: 1 }}>
              <Typography variant="body2" color="text.secondary">{label}</Typography>
              <Typography variant="body1" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{amount.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
            </Box>
          ))}
        </Box>
        </Paper>
      </PageLoadBoundary>
    </Box>
    {sourceOpen ? <SourceOrderPicker open onClose={() => setSourceOpen(false)} onSelect={selectSource} /> : null}
    <MaterialPickerDialog open={materialOpen} search={searchOrderMaterials} onClose={() => setMaterialOpen(false)}
      onChange={(material) => {
        materialPatch.current?.({ materialId: material.id, materialCode: material.code, materialName: material.name });
        setMaterialOpen(false); materialPatch.current = null;
      }} />
    <UnsavedChangesConfirmDialog open={confirm !== null} title={confirm === 'delete' ? '출하 삭제' : '저장하지 않은 변경사항'}
      description={confirm === 'delete' ? '이 출하를 삭제하시겠습니까?' : '입력 내용을 버리고 신규 문서를 작성하시겠습니까?'}
      onCancel={() => setConfirm(null)} onContinue={() => confirm === 'delete' ? void remove() : reset()} />
    <UnsavedChangesConfirmDialog open={overDelivery !== null} title="초과출하 확인"
      dialogTitleId="over-delivery-confirm-title"
      description={`${overDelivery?.message ?? ''} 수주·계획수량은 변경하지 않고 실제 출하수량으로 저장합니다. 초과출하로 저장하시겠습니까?`}
      continueLabel="초과출하 저장" confirmButtonColor="warning" disableContinue={pending}
      onCancel={() => setOverDelivery(null)}
      onContinue={() => {
        if (!overDelivery || busy.current) return;
        const payload = { ...overDelivery.payload, overDeliveryConfirmed: true };
        setOverDelivery(null);
        void savePayload(payload);
      }} />
    <UnsavedChangesConfirmDialog open={blocker.state === 'blocked'} disableContinue={pending}
      onCancel={() => blocker.state === 'blocked' && blocker.reset()}
      onContinue={() => blocker.state === 'blocked' && blocker.proceed()} />
    {dialog}
  </Box>;
}
