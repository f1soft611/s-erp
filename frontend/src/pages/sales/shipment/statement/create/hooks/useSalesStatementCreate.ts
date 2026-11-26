import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isApiNetworkError } from '../../../../../../shared/services/apiErrors';
import { useBlocker } from 'react-router-dom';
import { useCommonConfirmDialog } from '../../../../../../shared/hooks/useCommonConfirmDialog';
import { useUnsavedChangesBeforeUnload } from '../../../../../../shared/hooks/useUnsavedChangesBeforeUnload';
import { normalizeDateInput } from '../../../../../../shared/components/f1-grid/editing/dateInput';
import { getSystemDate } from '../../../../../../shared/services/systemDateService';
import type { F1GridRowId } from '../../../../../../shared/components/f1-grid';
import { calculateGridSummary } from '../../../../../../shared/components/f1-grid/utils/gridSummary';
import { useInitialLoadState } from '../../../../../../shared/hooks/useInitialLoadState';
import { getDelivery } from '../../../delivery/create/services/salesDelivery.service';
import { MAX_STATEMENT_DETAIL_COUNT } from '../../../../shared/statementDetailLimit';
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
  const [sources, setSources] = useState<StatementSource[]>([]);
  const [selectedRowIds, setSelectedRowIds] = useState<F1GridRowId[]>([]);
  const [rows, setRows] = useState<StatementDetail[]>([]);
  const [date, setDate] = useState('');
  const [dateError, setDateError] = useState('');
  const [remark, setRemark] = useState('');
  const [baseline, setBaseline] = useState(() => JSON.stringify([[], '', '', []]));
  const [picker, setPicker] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const busy = useRef(false);
  const dateTouchedRef = useRef(false);
  const canRead = Boolean(permissions?.read);
  const canSave = canRead && mode !== 'view' && Boolean(id ? permissions?.update : permissions?.create);
  const canDelete = canRead && mode !== 'view' && Boolean(id && permissions?.delete);
  const editable = canSave && !pending;
  const { confirm, dialog } = useCommonConfirmDialog();
  const source = useMemo<StatementSource | null>(() => {
    if (sources.length === 0) return null;
    return {
      ...sources[0],
      deliveryNo: sources.map((value) => value.deliveryNo).join(', '),
      deliveryDt: sources.map((value) => value.deliveryDt).join(', '),
      totalAmt: calculateGridSummary(sources, { field: 'totalAmt', headerName: '합계', type: 'currency', exactDecimal: true, summaryType: 'sum' }) ?? 0,
    };
  }, [sources]);
  const selectedIds = useMemo(() => rows
    .filter((row) => selectedRowIds.includes(row.salesStatementDetailId))
    .map((row) => row.salesDeliveryDetailId)
    .filter((detailId): detailId is number => detailId !== null), [rows, selectedRowIds]);
  const dirty = JSON.stringify([
    sources.map((value) => value.salesDeliveryId),
    date,
    remark,
    selectedIds,
  ]) !== baseline;
  useUnsavedChangesBeforeUnload(dirty);
  const { start: startLoad, succeed: succeedLoad, fail: failLoad, ...initialLoad } = useInitialLoadState({ networkOnly: true });
  const [loadRetry, setLoadRetry] = useState(0);
  const retryLoad = useCallback(() => setLoadRetry((value) => value + 1), []);
  const blocker = useBlocker(!embedded && (dirty || pending));
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);
  useEffect(() => onPendingChange?.(pending), [pending, onPendingChange]);
  useEffect(() => {
    if (statementId != null) return;
    let active = true;
    startLoad();
    void getSystemDate()
      .then((today) => {
        if (active) succeedLoad();
        if (!active || dateTouchedRef.current) return;
        dateTouchedRef.current = true;
        setDate(today);
        setBaseline((current) => {
          const values = JSON.parse(current) as [number[], string, string, number[]];
          values[1] = today;
          return JSON.stringify(values);
        });
      })
      .catch((cause: unknown) => {
        if (!active) return;
        failLoad(cause);
        if (!isApiNetworkError(cause)) setError(cause instanceof Error
          ? `서버 기준일을 불러오지 못했습니다. ${cause.message}`
          : '서버 기준일을 불러오지 못했습니다.');
      });
    return () => { active = false; };
  }, [statementId, loadRetry, startLoad, succeedLoad, failLoad]);
  const apply = useCallback((value: StatementItem) => {
    setItem(value); setId(value.salesStatementId);
    const detailIds = value.details
      .map((detail) => detail.salesDeliveryDetailId)
      .filter((detailId): detailId is number => detailId !== null);
    setSources([{
      salesDeliveryId: value.salesDeliveryId,
      customerId: value.customerId,
      deliveryNo: value.deliveryNo,
      deliveryDt: value.deliveryDt,
      deliveryType: value.deliveryType,
      customerName: value.customerName ?? '',
      totalAmt: value.totalAmt,
      salesDeliveryDetailIds: detailIds,
    }]);
    setSelectedRowIds([]);
    setDate(value.statementDt); setRemark(value.remark ?? ''); setRows(value.details);
    dateTouchedRef.current = true;
    setDateError('');
    setBaseline(JSON.stringify([[value.salesDeliveryId], value.statementDt, value.remark ?? '', []]));
  }, []);
  useEffect(() => {
    if (!statementId || !canRead) return;
    let active = true;
    setPending(true);
    startLoad();
    getStatement(statementId).then((value) => { if (active) { apply(value); succeedLoad(); } })
      .catch((cause) => {
        if (!active) return;
        failLoad(cause);
        if (!isApiNetworkError(cause)) setError(cause instanceof Error ? cause.message : '명세서 조회에 실패했습니다.');
      })
      .finally(() => { if (active) setPending(false); });
    return () => { active = false; };
  }, [statementId, canRead, apply, loadRetry, startLoad, succeedLoad, failLoad]);
  const choose = useCallback(async (values: StatementSource[]) => {
    setPicker(false); setPending(true); setError('');
    try {
      const detailsBySource = await Promise.all(values.map(async (value) => {
        const delivery = await getDelivery(value.salesDeliveryId);
        const availableIds = new Set(value.salesDeliveryDetailIds);
        return delivery.details
          .filter((row) => availableIds.has(row.salesDeliveryDetailId))
          .map((row) => ({
            ...row,
            salesStatementDetailId: row.salesDeliveryDetailId,
            materialSpec: row.materialSpec ?? null,
            sourceDeliveryNo: value.deliveryNo,
            sourceDeliveryDt: value.deliveryDt,
          }));
      }));
      const nextRows = detailsBySource.flat().map((row, index) => ({ ...row, lineNo: index + 1 }));
      setSources(values);
      setRows(nextRows);
      setSelectedRowIds([]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : '출하 조회에 실패했습니다.'); }
    finally { setPending(false); }
  }, []);
  const reset = useCallback(async () => {
    setPending(true); setError(''); setNotice('');
    dateTouchedRef.current = false;
    setId(undefined); setItem(null); setSources([]); setSelectedRowIds([]); setRows([]); setDate(''); setRemark('');
    setDateError('');
    setBaseline(JSON.stringify([[], '', '', []]));
    try {
      const today = await getSystemDate();
      dateTouchedRef.current = true;
      setDate(today);
      setBaseline(JSON.stringify([[], today, '', []]));
    } catch (cause) {
      setError(cause instanceof Error
        ? `서버 기준일을 불러오지 못했습니다. ${cause.message}`
        : '서버 기준일을 불러오지 못했습니다.');
    } finally {
      setPending(false);
    }
  }, []);
  const changeDate = useCallback((value: string) => {
    dateTouchedRef.current = true;
    setDate(value); setDateError(''); setError('');
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
    if (!id && selectedIds.length === 0) { setError('거래명세서 상세를 선택해 주세요.'); return; }
    if (!id && new Set(selectedIds).size > MAX_STATEMENT_DETAIL_COUNT) {
      setError('거래명세서는 출하 상세를 최대 100건까지 발행할 수 있습니다.');
      return;
    }
    busy.current = true; setPending(true); setError(''); setNotice('');
    try {
      const value = id ? await updateStatement(id, { statementDt, remark })
        : await createStatement({
          salesDeliveryId: source.salesDeliveryId,
          salesDeliveryDetailIds: selectedIds,
          statementDt,
          remark,
        });
      apply(value); setNotice(`거래명세서가 저장되었습니다. 명세번호: ${value.statementNo}`); onSaved?.();
    } catch (cause) { setError(cause instanceof Error ? cause.message : '거래명세서 저장에 실패했습니다.'); }
    finally { busy.current = false; setPending(false); }
  }, [editable, source, commitDate, remark, id, apply, onSaved, selectedIds]);
  const remove = useCallback(async () => {
    if (!canDelete || !id || busy.current) return;
    if (!(await confirm({ title: '거래명세서 삭제', description: '거래명세서를 삭제하시겠습니까?' }))) return;
    busy.current = true; setPending(true); setError('');
    try { await deleteStatement(id); await reset(); onDeleted?.(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '거래명세서 삭제에 실패했습니다.'); }
    finally { busy.current = false; setPending(false); }
  }, [canDelete, id, reset, onDeleted, confirm]);
  const handleNew = useCallback(async () => {
    if (dirty && !(await confirm({ description: '입력 내용을 초기화하시겠습니까?' }))) return;
    await reset();
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
    id, item, source, rows, selectedRowIds, setSelectedRowIds, date, changeDate, commitDate, dateError, remark, setRemark, picker, setPicker, printing, setPrinting,
    pending, error, setError, notice, canRead, canSave, canDelete, editable, dirty, blocker, dialog,
    choose, save, remove, handleNew, print, initialLoad, retryLoad,
  };
}
