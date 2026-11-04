import { useCallback, useEffect, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { Alert, Box, Button, MenuItem, Paper, TextField, Typography } from '@mui/material';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageLoadBoundary } from '../../../../shared/components/PageLoadBoundary';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { UnsavedChangesConfirmDialog } from '../../../../shared/components/UnsavedChangesConfirmDialog';
import { useUnsavedChangesBeforeUnload } from '../../../../shared/hooks/useUnsavedChangesBeforeUnload';
import { CustomerPicker, MaterialPickerDialog } from '../../../../shared/components/master-picker/MasterPickers';
import type { F1GridChanges, F1GridRef } from '../../../../shared/components/f1-grid';
import { searchOrderCustomers, searchOrderMaterials } from '../../order/create/services/salesOrderMaster.service';
import { activeDeliveryRows, DeliveryDetailGrid } from './components/DeliveryDetailGrid';
import { SourceOrderPicker } from './components/SourceOrderPicker';
import {
  buildDeliveryPayload, createDelivery, deleteDelivery, deliveryForm, emptyDelivery, getDelivery,
  sourceOrderForm, updateDelivery, validateDelivery,
} from './services/salesDelivery.service';
import type { DeliveryForm, DeliveryItem, DeliveryPageProps, DeliveryRow, SourceOrderRow } from './types/salesDelivery.types';

type Props = DeliveryPageProps & {
  salesDeliveryId?: number;
  embedded?: boolean;
  onSaved?: (item: DeliveryItem) => void;
  onDeleted?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onPendingChange?: (pending: boolean) => void;
};
export function SalesDeliveryCreatePage({
  currentMenuName, content, breadcrumbItems, selectedMenuPermissions: permissions, salesDeliveryId,
  embedded = false, onSaved, onDeleted, onDirtyChange, onPendingChange,
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
  const grid = useRef<F1GridRef<DeliveryRow>>(null);
  const busy = useRef(false);
  const materialPatch = useRef<((changes: Partial<DeliveryRow>) => void) | null>(null);
  const canRead = Boolean(permissions?.read);
  const canSave = canRead && Boolean(savedId ? permissions?.update : permissions?.create);
  const canDelete = canRead && Boolean(savedId && permissions?.delete);
  const editable = canSave && !pending && !loading && !locked;
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
      setLoadError(true); setError(cause instanceof Error ? cause.message : '납품 조회에 실패했습니다.');
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
    setError(''); setNotice(''); applyForm(emptyDelivery()); setConfirm(null);
  };
  const save = async () => {
    if (!editable || busy.current) return;
    const current = { ...form, details: grid.current?.getActiveRows() ?? form.details };
    const message = validateDelivery(current);
    grid.current?.validate();
    if (message) { setError(message); return; }
    busy.current = true; setPending(true); setError(''); setNotice('');
    try {
      const saved = savedId
        ? await updateDelivery(savedId, buildDeliveryPayload(current))
        : await createDelivery(buildDeliveryPayload(current));
      setSavedId(saved.salesDeliveryId);
      setItem(saved);
      setLocked(true);
      try {
        const detail = await getDelivery(saved.salesDeliveryId);
        applyItem(detail); setNotice(`납품이 저장되었습니다. 납품번호: ${detail.deliveryNo}`); onSaved?.(detail);
      } catch {
        setError(`납품은 저장되었지만 다시 불러오지 못했습니다. 납품번호: ${saved.deliveryNo}. 재조회를 눌러 주세요.`);
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : '납품 저장에 실패했습니다.'); }
    finally { busy.current = false; setPending(false); }
  };
  const remove = async () => {
    setConfirm(null);
    if (!canDelete || !savedId || busy.current) return;
    busy.current = true; setPending(true); setError('');
    try { await deleteDelivery(savedId); reset(); setNotice('납품이 삭제되었습니다.'); onDeleted?.(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '납품 삭제에 실패했습니다.'); }
    finally { busy.current = false; setPending(false); }
  };
  const selectSource = useCallback((source: SourceOrderRow[]) => {
    const next = sourceOrderForm(source, form.deliveryDt);
    setForm(next); setRows(next.details); setGridKey((value) => value + 1);
    setSelectedIds([]); setSourceOpen(false); setError('');
  }, [form.deliveryDt]);
  const actions = <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
    {!embedded && permissions?.create && canRead ? <Button disabled={pending || loading} onClick={() => dirty ? setConfirm('new') : reset()}>신규</Button> : null}
    {savedId && canRead ? <Button disabled={pending || loading} onClick={() => {
      if (!dirty || window.confirm('저장되지 않은 변경사항을 버리고 다시 조회하시겠습니까?')) void load(savedId);
    }}>재조회</Button> : null}
    {canSave ? <Button variant="contained" disabled={!editable} onClick={() => void save()}>{pending ? '저장 중' : '저장'}</Button> : null}
    {canDelete ? <Button color="error" disabled={pending || loading || locked} onClick={() => setConfirm('delete')}>삭제</Button> : null}
  </Box>;
  const totals = form.details.reduce((total, row) => ({
    supply: total.supply + Number(row.supplyAmt), vat: total.vat + Number(row.vatAmt), total: total.total + Number(row.totalAmt),
  }), { supply: 0, vat: 0, total: 0 });
  if (!canRead) return <Alert severity="warning">납품등록 조회 권한이 없습니다.</Alert>;
  return <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
    {!embedded ? <PageHeader breadcrumbItems={breadcrumbItems.length ? breadcrumbItems : [currentMenuName]} description={content.description} /> : null}
    <Box sx={{ p: { xs: 1, sm: 2 }, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, flex: 1, overflow: 'auto', gap: 1 }}>
      {actions}
      <PageMessageArea message={error} onClose={() => setError('')} />
      {notice ? <Alert severity="success">{notice}</Alert> : null}
      {loading ? <Typography role="status">납품을 불러오는 중입니다.</Typography> : null}
      <PageLoadBoundary loading={loading} error={loadError ? 'server' : null} label="납품등록"
        onRetry={() => savedId && void load(savedId)}>
        <Paper variant="outlined" sx={{ p: 2, minWidth: 0 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' }, columnGap: 2, rowGap: 1 }}>
            <TextField size="small" label="납품번호" value={item?.deliveryNo ?? '저장 시 자동 채번'} slotProps={{ input: { readOnly: true } }} />
            <TextField size="small" label="납품일자" type="date" required value={form.deliveryDt} disabled={!editable}
              onChange={(event) => change('deliveryDt', event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField select size="small" label="납품구분" value={form.deliveryType} disabled={!editable || Boolean(savedId)}
              onChange={(event) => {
                const next = { ...emptyDelivery(), deliveryDt: form.deliveryDt, deliveryType: event.target.value as DeliveryForm['deliveryType'] };
                if (form.details.length && !window.confirm('납품구분을 변경하면 거래처와 상세가 초기화됩니다. 계속하시겠습니까?')) return;
                setForm(next); setRows([]); setGridKey((value) => value + 1);
              }}>
              <MenuItem value="DIRECT">직납품</MenuItem><MenuItem value="ORDER">수주납품</MenuItem>
            </TextField>
            <CustomerPicker required disabled={!editable || Boolean(savedId) || form.deliveryType === 'ORDER'} triggerMode="icon"
              value={form.customerId ? { id: form.customerId, code: form.customerCode, name: form.customerName } : null}
              search={searchOrderCustomers} onChange={(customer) => {
                setForm((current) => ({ ...current, customerId: customer.id, customerCode: customer.code, customerName: customer.name }));
              }} />
            {form.deliveryType === 'ORDER' ? <Box sx={{ display: 'flex', gap: 1, minWidth: 0 }}>
              <TextField fullWidth size="small" label="연결 수주번호" value={form.orderNo} slotProps={{ input: { readOnly: true } }} />
              <Button disabled={!editable || Boolean(savedId)} sx={{ flexShrink: 0 }} onClick={() => setSourceOpen(true)}>수주 선택</Button>
            </Box> : null}
            <TextField size="small" label="납품장소" value={form.deliveryPlace} disabled={!editable} onChange={(event) => change('deliveryPlace', event.target.value)} slotProps={{ htmlInput: { maxLength: 200 } }} />
            <TextField size="small" label="배송방법" value={form.deliveryMethod} disabled={!editable} onChange={(event) => change('deliveryMethod', event.target.value)} slotProps={{ htmlInput: { maxLength: 50 } }} />
            <TextField size="small" label="비고" value={form.remark} disabled={!editable} onChange={(event) => change('remark', event.target.value)} slotProps={{ htmlInput: { maxLength: 500 } }} />
          </Box>
        </Paper>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          <Typography variant="subtitle2">납품 상세</Typography>
          {canSave && form.deliveryType === 'DIRECT' ? <>
            <Button disabled={!editable} onClick={() => grid.current?.addRow()}>상세 행 추가</Button>
            <Button disabled={!editable || selectedIds.length !== 1} onClick={() => {
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
          {canSave ? <Button color="error" disabled={!editable || !selectedIds.length} onClick={() => grid.current?.deleteSelectedRows()}>선택 행 삭제</Button> : null}
        </Box>
        <Box sx={{ flex: 1, minHeight: 300, minWidth: 0, overflow: 'hidden' }}>
          <DeliveryDetailGrid key={gridKey} gridRef={grid} rows={rows} disabled={!editable} source={form.deliveryType === 'ORDER'}
            onChanges={handleChanges} onSelection={setSelectedIds} onMaterial={openMaterial} />
        </Box>
        <Box aria-label="납품 금액 합계" sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 2, p: 1 }}>
          <Typography>공급가 합계 {totals.supply.toFixed(2)}</Typography><Typography>VAT 합계 {totals.vat.toFixed(2)}</Typography>
          <Typography sx={{ fontWeight: 700 }}>총 합계 {totals.total.toFixed(2)}</Typography>
        </Box>
      </PageLoadBoundary>
    </Box>
    {sourceOpen ? <SourceOrderPicker open onClose={() => setSourceOpen(false)} onSelect={selectSource} /> : null}
    <MaterialPickerDialog open={materialOpen} search={searchOrderMaterials} onClose={() => setMaterialOpen(false)}
      onChange={(material) => {
        materialPatch.current?.({ materialId: material.id, materialCode: material.code, materialName: material.name });
        setMaterialOpen(false); materialPatch.current = null;
      }} />
    <UnsavedChangesConfirmDialog open={confirm !== null} title={confirm === 'delete' ? '납품 삭제' : '저장하지 않은 변경사항'}
      description={confirm === 'delete' ? '이 납품을 삭제하시겠습니까?' : '입력 내용을 버리고 신규 문서를 작성하시겠습니까?'}
      onCancel={() => setConfirm(null)} onContinue={() => confirm === 'delete' ? void remove() : reset()} />
    <UnsavedChangesConfirmDialog open={blocker.state === 'blocked'} disableContinue={pending}
      onCancel={() => blocker.state === 'blocked' && blocker.reset()}
      onContinue={() => blocker.state === 'blocked' && blocker.proceed()} />
  </Box>;
}
