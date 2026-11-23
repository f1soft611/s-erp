import { useCallback, useEffect, useRef, useState } from 'react';
import type { F1GridChanges } from '../../../../../shared/components/f1-grid';
import { useNotification } from '../../../../../shared/context/notification';
import { useInitialLoadState } from '../../../../../shared/hooks/useInitialLoadState';
import { getSystemDate } from '../../../../../shared/services/systemDateService';
import { DEFAULT_ITEM_TYPES } from '../data/priceSearchFields';
import { fetchItemPartnerPrices } from '../services/itemPartnerPrice.service';
import { buildMaterialPriceBatch } from '../services/itemPriceCustomerChanges';
import { fetchItemPriceOverview, saveItemPriceOverviewBatch } from '../services/itemPriceOverview.service';
import { toItemPartnerPricePayload } from './useItemPartnerPriceManagement';
import type { ItemPartnerPriceRow, ItemPartnerPriceTradeType } from '../types/itemPartnerPrice.types';
import type { ItemPriceOverviewFilters, ItemPriceOverviewRow } from '../types/itemPriceOverview.types';

/**
 * 품목 기준 탭: 품목 목록(마스터)과 선택한 품목의 거래처별 단가(디테일). 저장은 기존 일괄 저장 API를 쓴다.
 * 거래처 기준 탭과 같은 구조이며, 단가는 항상 거래처에 붙는다(공통단가 없음).
 */
export function useItemPriceOverview(tradeType: ItemPartnerPriceTradeType) {
  const { showSuccess } = useNotification();
  const initialFiltersRef = useRef<ItemPriceOverviewFilters>({ tradeType, itemTypes: DEFAULT_ITEM_TYPES[tradeType] });
  const [items, setItems] = useState<ItemPriceOverviewRow[]>([]);
  const [itemFilters, setItemFilters] = useState<ItemPriceOverviewFilters>(initialFiltersRef.current);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [selected, setSelected] = useState<ItemPriceOverviewRow | null>(null);
  const [rows, setRows] = useState<ItemPartnerPriceRow[]>([]);
  const rowsRef = useRef<ItemPartnerPriceRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [gridKey, setGridKey] = useState(0);
  const [listKey, setListKey] = useState(0);
  const [today, setToday] = useState('');
  const savingRef = useRef(false);
  const itemVersion = useRef(0);
  const rowVersion = useRef(0);
  const { start, succeed, fail, ...initialLoad } = useInitialLoadState();

  useEffect(() => {
    let active = true;
    getSystemDate().then((value) => { if (active) setToday(value); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const loadItems = useCallback(async (filters: ItemPriceOverviewFilters) => {
    const version = ++itemVersion.current;
    start();
    setItemsLoading(true);
    setError('');
    try {
      const next = await fetchItemPriceOverview(filters);
      if (version !== itemVersion.current) return next;
      setItems(next);
      setListKey((key) => key + 1);
      succeed();
      return next;
    } catch (cause) {
      if (version === itemVersion.current) {
        fail(cause);
        setError(cause instanceof Error ? cause.message : '품목 목록을 불러오지 못했습니다.');
      }
      return null;
    } finally {
      if (version === itemVersion.current) setItemsLoading(false);
    }
  }, [start, succeed, fail]);

  const loadRows = useCallback(async (materialId: number) => {
    const version = ++rowVersion.current;
    setRowsLoading(true);
    setError('');
    try {
      // 품목 단가는 현재 적용 중·예정만 보여 준다(과거 이력은 "단가 이력 조회" 탭).
      const next = await fetchItemPartnerPrices({ materialId, useAt: 'Y', tradeType });
      if (version !== rowVersion.current) return;
      rowsRef.current = next;
      setRows(next);
      setHasChanges(false);
      setGridKey((key) => key + 1);
    } catch (cause) {
      if (version === rowVersion.current) {
        setError(cause instanceof Error ? cause.message : '품목 단가를 불러오지 못했습니다.');
      }
    } finally {
      if (version === rowVersion.current) setRowsLoading(false);
    }
  }, [tradeType]);

  useEffect(() => {
    const active = itemVersion;
    void loadItems(initialFiltersRef.current);
    return () => { ++active.current; };
  }, [loadItems]);

  const searchItems = useCallback((filters: ItemPriceOverviewFilters) => {
    if (savingRef.current) return;
    const next = { ...filters, tradeType };
    setItemFilters(next);
    void loadItems(next);
  }, [loadItems, tradeType]);

  const selectItem = useCallback((item: ItemPriceOverviewRow | null) => {
    setSelected(item);
    rowsRef.current = [];
    setRows([]);
    setHasChanges(false);
    if (item) void loadRows(item.materialId);
  }, [loadRows]);

  const discardChanges = useCallback(() => {
    setHasChanges(false);
    setGridKey((key) => key + 1);
  }, []);

  const handleChangesChange = useCallback((changes: F1GridChanges<ItemPartnerPriceRow>) => {
    setHasChanges(Boolean(
      changes.insertedRows.length || changes.updatedRows.length || changes.deletedRows.length,
    ));
  }, []);

  /** 저장 뒤 목록(거래처 수·기본 거래처)을 다시 읽고 선택 품목의 단가도 다시 읽는다. */
  const refreshAfterSave = useCallback(async () => {
    await loadItems(itemFilters);
    if (selected) await loadRows(selected.materialId);
  }, [itemFilters, selected, loadItems, loadRows]);

  const saveChanges = useCallback(async (changes: F1GridChanges<ItemPartnerPriceRow>) => {
    if (savingRef.current || !selected) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      const batch = buildMaterialPriceBatch(changes, rowsRef.current, selected.materialId, today);
      if (!batch.prices.insertedRows.length && !batch.prices.updatedRows.length && !batch.prices.deletedRows.length) {
        throw new Error('저장할 단가 변경 사항이 없습니다.');
      }
      await saveItemPriceOverviewBatch(batch);
      showSuccess('단가를 저장했습니다.');
      await refreshAfterSave();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '단가를 저장하지 못했습니다.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [selected, today, showSuccess, refreshAfterSave]);

  /** 엑셀로 검증을 통과한 신규 단가를 바로 저장한다(품목·거래처코드는 엑셀 값을 그대로 쓴다). */
  const saveImportedRows = useCallback(async (imported: ItemPartnerPriceRow[]) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      const insertedRows = imported.map((row) => ({
        ...toItemPartnerPricePayload(row),
        priceId: String(row.priceId),
      }));
      await saveItemPriceOverviewBatch({ prices: { insertedRows, updatedRows: [], deletedRows: [] } });
      showSuccess(`엑셀의 단가 ${insertedRows.length}건을 저장했습니다.`);
      await refreshAfterSave();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '엑셀 단가를 저장하지 못했습니다.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [showSuccess, refreshAfterSave]);

  return {
    initialLoad, items, itemFilters, itemsLoading, selected, rows, rowsLoading,
    error, setError, saving, hasChanges, gridKey, listKey, today,
    searchItems, selectItem, discardChanges, handleChangesChange, saveChanges, saveImportedRows,
  };
}
