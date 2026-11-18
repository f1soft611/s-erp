import { useCallback, useEffect, useRef, useState } from 'react';
import type { F1GridChanges } from '../../../../../shared/components/f1-grid';
import { useNotification } from '../../../../../shared/context/NotificationContext';
import { useInitialLoadState } from '../../../../../shared/hooks/useInitialLoadState';
import { getSystemDate } from '../../../../../shared/services/systemDateService';
import { fetchItemPriceOverview, saveItemPriceOverviewBatch } from '../services/itemPriceOverview.service';
import {
  buildItemPriceBatch,
  buildItemPriceRemoveBatch,
  type ItemPriceRemoveMode,
} from '../services/itemPriceOverviewChanges';
import type {
  ItemPriceOverviewFilters,
  ItemPriceOverviewRow,
  ItemPriceSideKey,
} from '../types/itemPriceOverview.types';

export function useItemPriceOverview(initialFilters: ItemPriceOverviewFilters = {}) {
  const { showSuccess } = useNotification();
  const initialFiltersRef = useRef(initialFilters);
  const [rows, setRows] = useState<ItemPriceOverviewRow[]>([]);
  const rowsRef = useRef<ItemPriceOverviewRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [gridKey, setGridKey] = useState(0);
  const [today, setToday] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<ItemPriceOverviewFilters>(initialFilters);
  const savingRef = useRef(false);
  const loadVersion = useRef(0);
  const { start, succeed, fail, ...initialLoad } = useInitialLoadState();

  useEffect(() => {
    let active = true;
    getSystemDate().then((value) => { if (active) setToday(value); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const loadRows = useCallback(async (filters: ItemPriceOverviewFilters) => {
    const version = ++loadVersion.current;
    start();
    setLoading(true);
    setError('');
    try {
      const nextRows = await fetchItemPriceOverview(filters);
      if (version !== loadVersion.current) return false;
      rowsRef.current = nextRows;
      setRows(nextRows);
      setHasChanges(false);
      setGridKey((key) => key + 1);
      succeed();
      return true;
    } catch (cause) {
      if (version === loadVersion.current) {
        fail(cause);
        setError(cause instanceof Error ? cause.message : '품목 기준 단가를 불러오지 못했습니다.');
      }
      return false;
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }, [start, succeed, fail]);

  useEffect(() => {
    const active = loadVersion;
    void loadRows(initialFiltersRef.current);
    return () => { ++active.current; };
  }, [loadRows]);

  const applyFilters = useCallback((filters: ItemPriceOverviewFilters) => {
    if (savingRef.current) return;
    setAppliedFilters(filters);
    void loadRows(filters);
  }, [loadRows]);

  const discardChanges = useCallback(() => {
    setHasChanges(false);
    setGridKey((key) => key + 1);
  }, []);

  const handleChangesChange = useCallback((changes: F1GridChanges<ItemPriceOverviewRow>) => {
    setHasChanges(Boolean(
      changes.insertedRows.length || changes.updatedRows.length || changes.deletedRows.length,
    ));
  }, []);

  const saveChanges = useCallback(async (changes: F1GridChanges<ItemPriceOverviewRow>) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      if (changes.deletedRows.length) throw new Error('단가 삭제는 지원하지 않습니다.');
      const batch = buildItemPriceBatch(changes, rowsRef.current, today);
      if (!batch.prices.insertedRows.length && !batch.prices.updatedRows.length) {
        throw new Error('저장할 단가 변경 사항이 없습니다.');
      }
      await saveItemPriceOverviewBatch(batch);
      showSuccess('단가를 저장했습니다.');
      await loadRows(appliedFilters);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '단가를 저장하지 못했습니다.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [today, appliedFilters, loadRows, showSuccess]);

  /** 선택한 행의 구분별 단가를 삭제(오등록 정정) 또는 미사용 처리하고 다시 조회한다. */
  const removePrices = useCallback(async (
    row: ItemPriceOverviewRow,
    sides: ItemPriceSideKey[],
    mode: ItemPriceRemoveMode,
  ) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      const batch = buildItemPriceRemoveBatch(row, sides, mode);
      await saveItemPriceOverviewBatch(batch);
      showSuccess(mode === 'delete' ? '단가를 삭제했습니다.' : '단가를 미사용 처리했습니다.');
      await loadRows(appliedFilters);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '단가를 처리하지 못했습니다.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [appliedFilters, loadRows, showSuccess]);

  /** 엑셀 업로드로 값이 바뀐 품목 행을 같은 규칙으로 저장하고 다시 조회한다. */
  const applyImport = useCallback(async (updatedRows: ItemPriceOverviewRow[]) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      const batch = buildItemPriceBatch(
        { insertedRows: [], updatedRows, deletedRows: [] }, rowsRef.current, today,
      );
      await saveItemPriceOverviewBatch(batch);
      showSuccess(`엑셀의 단가 ${batch.prices.insertedRows.length + batch.prices.updatedRows.length}건을 저장했습니다.`);
      await loadRows(appliedFilters);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '엑셀 단가를 저장하지 못했습니다.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [today, appliedFilters, loadRows, showSuccess]);

  return {
    applyImport,
    removePrices,
    initialLoad, rows, error, setError, loading, saving, hasChanges, gridKey, today,
    appliedFilters, applyFilters, discardChanges, handleChangesChange, saveChanges,
  };
}
