import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GridSaveReconciliationError,
  type F1GridChanges,
  type F1GridRef,
} from '../../../../../shared/components/f1-grid';
import { useNotification } from '../../../../../shared/context/notification';
import { useInitialLoadState } from '../../../../../shared/hooks/useInitialLoadState';
import {
  fetchItemPartnerPrices,
  saveItemPartnerPriceRows,
} from '../services/itemPartnerPrice.service';
import type {
  ItemPartnerPriceBatchPayload,
  ItemPartnerPriceFilters,
  ItemPartnerPricePayload,
  ItemPartnerPriceRow,
} from '../types/itemPartnerPrice.types';

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}

function numericValue(value: number | null, label: string, optional: boolean): number | null {
  if (value == null) {
    if (optional) return null;
    throw new Error(`${label}을 입력해 주세요.`);
  }
  if (!Number.isFinite(value) || !/^\d{1,13}(?:\.\d{1,2})?$/.test(String(value))) {
    throw new Error(`${label}은 0 이상, 소수 둘째 자리까지 입력해 주세요.`);
  }
  return value;
}

export function toItemPartnerPricePayload(row: ItemPartnerPriceRow): ItemPartnerPricePayload {
  if (!Number.isSafeInteger(Number(row.materialId)) || Number(row.materialId) <= 0) {
    throw new Error('품목을 선택해 주세요.');
  }
  // 거래처를 비우면 품목 공통단가(거래처 공통)로 저장한다.
  if (row.customerId != null &&
      (!Number.isSafeInteger(Number(row.customerId)) || Number(row.customerId) <= 0)) {
    throw new Error('거래처를 확인해 주세요.');
  }
  if (row.tradeType !== '매입' && row.tradeType !== '매출') {
    throw new Error('거래구분을 선택해 주세요.');
  }
  const unitPrice = numericValue(row.unitPrice, '원화단가', true);
  const foreignUnitPrice = numericValue(row.foreignUnitPrice, '외화단가', true);
  if (unitPrice === null && foreignUnitPrice === null) {
    throw new Error('원화단가 또는 외화단가를 입력해 주세요.');
  }
  const moq = numericValue(row.moq, '최소주문수량', true);
  const currency = row.currency.trim();
  if (currency.length > 10) throw new Error('통화는 10자 이하여야 합니다.');
  if (foreignUnitPrice !== null && !currency) {
    throw new Error('외화단가를 입력하면 통화를 선택해 주세요.');
  }
  if (row.vatIncludedAt !== 'Y' && row.vatIncludedAt !== 'N') {
    throw new Error('부가세포함 여부를 선택해 주세요.');
  }
  if (row.vatIncludedAt === 'Y' && (row.taxType || 'TAXABLE') !== 'TAXABLE') {
    throw new Error('부가세 포함은 과세일 때만 선택할 수 있습니다.');
  }
  if (!validDate(row.startDt)) throw new Error('적용 시작일을 YYYY-MM-DD 형식으로 입력해 주세요.');
  const endDt = row.endDt?.trim() || null;
  if (endDt && (!validDate(endDt) || endDt < row.startDt)) {
    throw new Error('적용 종료일은 시작일 이후의 YYYY-MM-DD여야 합니다.');
  }
  if (row.useAt !== 'Y' && row.useAt !== 'N') {
    throw new Error('사용여부는 Y 또는 N이어야 합니다.');
  }
  const orderType = (row.orderType ?? '').trim();
  if (orderType && row.tradeType !== '매입') throw new Error('발주구분은 매입 단가에만 입력할 수 있습니다.');
  if (row.defaultSupplier && (row.tradeType !== '매입' || row.customerId == null || row.useAt !== 'Y')) {
    throw new Error('기본 거래처는 거래처가 있는 사용 중 매입 단가에만 지정할 수 있습니다.');
  }
  const canFlag = row.tradeType === '매입' && row.customerId != null;
  return {
    materialId: Number(row.materialId),
    customerId: row.customerId == null ? null : Number(row.customerId),
    tradeType: row.tradeType,
    unitPrice,
    taxType: row.taxType || 'TAXABLE',
    vatIncludedAt: row.vatIncludedAt,
    foreignUnitPrice,
    currency: foreignUnitPrice === null ? '' : currency,
    startDt: row.startDt,
    endDt,
    moq,
    useAt: row.useAt,
    orderType,
    ...(canFlag ? { defaultSupplier: Boolean(row.defaultSupplier) } : {}),
  };
}

export function useItemPartnerPriceManagement(initialFilters: ItemPartnerPriceFilters = {}) {
  const { showSuccess } = useNotification();
  const initialFiltersRef = useRef(initialFilters);
  const [rows, setRows] = useState<ItemPartnerPriceRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [gridKey, setGridKey] = useState(0);
  const [appliedFilters, setAppliedFilters] = useState<ItemPartnerPriceFilters>(initialFilters);
  const savingRef = useRef(false);
  const reconciliationRequired = useRef(false);
  const loadVersion = useRef(0);
  const { start, succeed, fail, ...initialLoad } = useInitialLoadState();

  const loadRows = useCallback(async (filters: ItemPartnerPriceFilters) => {
    const version = ++loadVersion.current;
    start();
    setLoading(true);
    setError('');
    try {
      const nextRows = await fetchItemPartnerPrices(filters);
      if (version !== loadVersion.current) return false;
      setRows(nextRows);
      succeed();
      reconciliationRequired.current = false;
      return true;
    } catch (cause) {
      if (version === loadVersion.current) {
        fail(cause);
        setError(cause instanceof Error ? cause.message : '단가 목록을 불러오지 못했습니다.');
      }
      return false;
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }, [start, succeed, fail]);

  useEffect(() => {
    const activeLoadVersion = loadVersion;
    void loadRows(initialFiltersRef.current);
    return () => { ++activeLoadVersion.current; };
  }, [loadRows]);

  const applyFilters = useCallback((filters: ItemPartnerPriceFilters) => {
    if (savingRef.current) return;
    setAppliedFilters(filters);
    void loadRows(filters);
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

  const saveChanges = useCallback(async (
    changes: F1GridChanges<ItemPartnerPriceRow>,
    acceptSavedRows: F1GridRef<ItemPartnerPriceRow>['acceptSavedRows'],
  ) => {
    if (reconciliationRequired.current) {
      setError(new GridSaveReconciliationError(undefined).message);
      return;
    }
    if (savingRef.current || !(
      changes.insertedRows.length || changes.updatedRows.length || changes.deletedRows.length
    )) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      if (changes.deletedRows.length) throw new Error('단가 삭제는 지원하지 않습니다. 사용여부를 변경해 주세요.');
      const requested = [...changes.insertedRows, ...changes.updatedRows];
      const payload: ItemPartnerPriceBatchPayload = {
        prices: {
          insertedRows: changes.insertedRows.map((row) => ({
            ...toItemPartnerPricePayload(row),
            priceId: String(row.priceId),
          })),
          updatedRows: changes.updatedRows.map((row) => ({
            ...toItemPartnerPricePayload(row),
            priceId: String(row.priceId),
          })),
          deletedRows: [],
        },
      };
      const savedRows = await saveItemPartnerPriceRows(payload, requested);
      try {
        setRows(acceptSavedRows(savedRows));
      } catch (cause) {
        throw new GridSaveReconciliationError(cause);
      }
      setHasChanges(false);
      showSuccess('단가를 저장했습니다.');
    } catch (cause) {
      if (cause instanceof GridSaveReconciliationError) reconciliationRequired.current = true;
      setError(cause instanceof Error ? cause.message : '단가를 저장하지 못했습니다.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [showSuccess]);

  return {
    initialLoad,
    rows,
    error,
    setError,
    loading,
    saving,
    hasChanges,
    gridKey,
    appliedFilters,
    applyFilters,
    discardChanges,
    handleChangesChange,
    saveChanges,
  };
}
