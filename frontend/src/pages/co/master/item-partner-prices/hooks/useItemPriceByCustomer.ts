import { useCallback, useEffect, useRef, useState } from 'react';
import type { F1GridChanges } from '../../../../../shared/components/f1-grid';
import { useNotification } from '../../../../../shared/context/notification';
import { useInitialLoadState } from '../../../../../shared/hooks/useInitialLoadState';
import { getSystemDate } from '../../../../../shared/services/systemDateService';
import { fetchItemPartnerPrices } from '../services/itemPartnerPrice.service';
import { fetchItemPriceCustomers } from '../services/itemPriceCustomer.service';
import { buildCustomerPriceBatch } from '../services/itemPriceCustomerChanges';
import { saveItemPriceOverviewBatch } from '../services/itemPriceOverview.service';
import { toItemPartnerPricePayload } from './useItemPartnerPriceManagement';
import type { ItemPartnerPriceRow } from '../types/itemPartnerPrice.types';
import type { ItemPriceCustomerFilters, ItemPriceCustomerRow } from '../types/itemPriceCustomer.types';

/** 거래처 기준 탭: 거래처 목록(마스터)과 선택한 거래처의 단가(디테일). 저장은 기존 일괄 저장 API를 쓴다. */
export function useItemPriceByCustomer() {
  const { showSuccess } = useNotification();
  const initialFiltersRef = useRef<ItemPriceCustomerFilters>({});
  const [customers, setCustomers] = useState<ItemPriceCustomerRow[]>([]);
  const [customerFilters, setCustomerFilters] = useState<ItemPriceCustomerFilters>({});
  const [customersLoading, setCustomersLoading] = useState(true);
  const [selected, setSelected] = useState<ItemPriceCustomerRow | null>(null);
  const [includeHistory, setIncludeHistory] = useState(false);
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
  const customerVersion = useRef(0);
  const rowVersion = useRef(0);
  const { start, succeed, fail, ...initialLoad } = useInitialLoadState();

  useEffect(() => {
    let active = true;
    getSystemDate().then((value) => { if (active) setToday(value); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const loadCustomers = useCallback(async (filters: ItemPriceCustomerFilters) => {
    const version = ++customerVersion.current;
    start();
    setCustomersLoading(true);
    setError('');
    try {
      const next = await fetchItemPriceCustomers(filters);
      if (version !== customerVersion.current) return next;
      setCustomers(next);
      setListKey((key) => key + 1);
      succeed();
      return next;
    } catch (cause) {
      if (version === customerVersion.current) {
        fail(cause);
        setError(cause instanceof Error ? cause.message : '거래처 목록을 불러오지 못했습니다.');
      }
      return null;
    } finally {
      if (version === customerVersion.current) setCustomersLoading(false);
    }
  }, [start, succeed, fail]);

  const loadRows = useCallback(async (customerId: number, history: boolean) => {
    const version = ++rowVersion.current;
    setRowsLoading(true);
    setError('');
    try {
      const next = await fetchItemPartnerPrices({ customerId, includeHistory: history, useAt: 'Y' });
      if (version !== rowVersion.current) return;
      rowsRef.current = next;
      setRows(next);
      setHasChanges(false);
      setGridKey((key) => key + 1);
    } catch (cause) {
      if (version === rowVersion.current) {
        setError(cause instanceof Error ? cause.message : '거래처 단가를 불러오지 못했습니다.');
      }
    } finally {
      if (version === rowVersion.current) setRowsLoading(false);
    }
  }, []);

  useEffect(() => {
    const active = customerVersion;
    void loadCustomers(initialFiltersRef.current);
    return () => { ++active.current; };
  }, [loadCustomers]);

  const searchCustomers = useCallback((filters: ItemPriceCustomerFilters) => {
    if (savingRef.current) return;
    setCustomerFilters(filters);
    void loadCustomers(filters);
  }, [loadCustomers]);

  const selectCustomer = useCallback((customer: ItemPriceCustomerRow | null) => {
    setSelected(customer);
    rowsRef.current = [];
    setRows([]);
    setHasChanges(false);
    if (customer) void loadRows(customer.customerId, includeHistory);
  }, [includeHistory, loadRows]);

  const changeIncludeHistory = useCallback((value: boolean) => {
    setIncludeHistory(value);
    if (selected) void loadRows(selected.customerId, value);
  }, [selected, loadRows]);

  const discardChanges = useCallback(() => {
    setHasChanges(false);
    setGridKey((key) => key + 1);
  }, []);

  const handleChangesChange = useCallback((changes: F1GridChanges<ItemPartnerPriceRow>) => {
    setHasChanges(Boolean(
      changes.insertedRows.length || changes.updatedRows.length || changes.deletedRows.length,
    ));
  }, []);

  const refreshAfterSave = useCallback(async () => {
    await loadCustomers(customerFilters);
    if (selected) await loadRows(selected.customerId, includeHistory);
  }, [customerFilters, selected, includeHistory, loadCustomers, loadRows]);

  const saveChanges = useCallback(async (changes: F1GridChanges<ItemPartnerPriceRow>) => {
    if (savingRef.current || !selected) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      const batch = buildCustomerPriceBatch(changes, rowsRef.current, selected.customerId, today);
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

  /** 엑셀로 검증을 통과한 신규 단가를 바로 저장한다(거래처코드는 엑셀 값을 그대로 쓴다). */
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
    initialLoad, customers, customerFilters, customersLoading, selected, includeHistory, rows, rowsLoading,
    error, setError, saving, hasChanges, gridKey, listKey, today,
    searchCustomers, selectCustomer, changeIncludeHistory, discardChanges, handleChangesChange,
    saveChanges, saveImportedRows,
  };
}
