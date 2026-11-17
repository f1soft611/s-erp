import { useCallback, useEffect, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { useCommonConfirmDialog } from '../../../../../../shared/hooks/useCommonConfirmDialog';
import { useUnsavedChangesBeforeUnload } from '../../../../../../shared/hooks/useUnsavedChangesBeforeUnload';
import { normalizeDateInput } from '../../../../../../shared/components/f1-grid/editing/DateEditor';
import { getDelivery, localDate } from '../../../delivery/create/services/salesDelivery.service';
import { createStatement, deleteStatement, getStatement, updateStatement } from '../../services/salesStatement.service';
import type { StatementDetail, StatementItem, StatementSource } from '../../types/salesStatement.types';
import type { SalesStatementCreateProps } from '../types/salesStatementCreate.types';

export function useSalesStatementCreate({
  selectedMenuPermissions: permissions,
  statementId, embedded = false, mode = 'edit', onSaved, onDeleted,
  onDirtyChange, onPendingChange, onEmbeddedActionsChange,
}: SalesStatementCreateProps) {
  const [id, setId] = useState(statementId);
  const [item, setItem] = useState<StatementItem | null>(null);
  const [source, setSource] = useState<StatementSource | null>(null);
  const [rows, setRows] = useState<StatementDetail[]>([]);
  const [date, setDate] = useState(localDate);
  const [dateError, setDateError] = useState('');
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
    setDateError('');
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
    setDateError('');
    setBaseline(JSON.stringify([null, today, ''])); setError(''); setNotice('');
  }, []);
  const changeDate = useCallback((value: string) => {
    setDate(value); setDateError('');
  }, []);
  const commitDate = useCallback(() => {
    const normalized = normalizeDateInput(date);
    if (normalized) setDate(normalized);
    setDateError(normalized ? '' : date.trim()
      ? '올바른 명세일을 입력해 주세요.' : '명세일을 입력해 주세요.');
    return normalized;
  }, [date]);
  const save = useCallback(async () => {
    if (!editable || busy.current) return;
    const statementDt = commitDate();
    if (!statementDt) return;
    if (!source) { setError('출하와 명세일을 입력해 주세요.'); return; }
    busy.current = true; setPending(true); setError(''); setNotice('');
    try {
      const value = id ? await updateStatement(id, { statementDt, remark })
        : await createStatement({ salesDeliveryId: source.salesDeliveryId, statementDt, remark });
      apply(value); setNotice(`거래명세서가 저장되었습니다. 명세번호: ${value.statementNo}`); onSaved?.();
    } catch (cause) { setError(cause instanceof Error ? cause.message : '거래명세서 저장에 실패했습니다.'); }
    finally { busy.current = false; setPending(false); }
  }, [editable, source, commitDate, remark, id, apply, onSaved]);
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

  return {
    id, item, source, rows, date, changeDate, commitDate, dateError, remark, setRemark, picker, setPicker, printing, setPrinting,
    pending, error, setError, notice, canRead, canSave, canDelete, editable, dirty, blocker, dialog,
    choose, save, remove, handleNew, print,
  };
}
