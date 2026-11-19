import { useCallback, useEffect, useMemo, useState } from 'react';
import { toPageSearchFields } from '../../../../../shared/components/page-search/searchFields';
import { useInitialLoadState } from '../../../../../shared/hooks/useInitialLoadState';
import { usePageSearchDefaults } from '../../../../../shared/hooks/usePageSearchDefaults';
import { usePageSessionState } from '../../../../../shared/hooks/usePageSessionState';
import { getPurchaseReceipt } from '../../create/services/purchaseReceipt.service';
import type { PurchaseReceiptPageMode } from '../../create/PurchaseReceiptCreatePage';
import type { PurchaseReceiptItem } from '../../create/types/purchaseReceipt.types';
import { createPurchaseReceiptStatusColumns } from '../data/purchaseReceiptStatusColumns';
import {
  clonePurchaseReceiptStatusSearchValues,
  isPurchaseReceiptStatusSearchSession,
  PURCHASE_RECEIPT_STATUS_DEFAULT,
  searchPurchaseReceiptStatus,
  toPurchaseReceiptStatusFilters,
} from '../services/purchaseReceiptStatus.service';
import type {
  PurchaseReceiptStatusFilters,
  PurchaseReceiptStatusRow,
  PurchaseReceiptStatusSearchSession,
  PurchaseReceiptStatusSearchValues,
} from '../types/purchaseReceiptStatus.types';

const SESSION_KEY = 's-erp:page:materials-purchase-receipt-status';

/** 검색어·상세검색 값과 기본값, 세션 보존을 관리한다. 상태 기본값은 정상이다(취소건은 취소·전체를 고를 때만 조회). */
export function usePurchaseReceiptStatusSearch() {
  const detailFields = useMemo(() => toPageSearchFields(createPurchaseReceiptStatusColumns()), []);
  const {
    values: loadedDefaultValues,
    loading: defaultsLoading,
    error: defaultsError,
    retry: retryDefaults,
    initialLoad: defaultsInitialLoad,
  } = usePageSearchDefaults(detailFields);
  const defaultValues = useMemo<PurchaseReceiptStatusSearchValues | null>(
    () => (loadedDefaultValues ? { ...loadedDefaultValues, status: PURCHASE_RECEIPT_STATUS_DEFAULT } : null),
    [loadedDefaultValues],
  );
  const { state: searchSession, setState: setSearchSession } =
    usePageSessionState<PurchaseReceiptStatusSearchSession | null>(SESSION_KEY, null, {
      // 2: 상태 기본값(정상)이 없던 예전 세션을 버린다.
      version: 2,
      validate: (value): value is PurchaseReceiptStatusSearchSession | null =>
        value === null || isPurchaseReceiptStatusSearchSession(value),
      persistWhen: (value) => value !== null,
    });
  const [keyword, setKeyword] = useState(searchSession?.keyword ?? '');
  const [detailValues, setDetailValues] = useState<PurchaseReceiptStatusSearchValues>(
    () => clonePurchaseReceiptStatusSearchValues(searchSession?.detailValues ?? {}),
  );
  const [appliedFilters, setAppliedFilters] = useState<PurchaseReceiptStatusFilters | null>(() =>
    searchSession ? toPurchaseReceiptStatusFilters(searchSession.keyword, searchSession.detailValues) : null,
  );

  const applySnapshot = useCallback((snapshot: PurchaseReceiptStatusSearchSession) => {
    setSearchSession(snapshot);
    setAppliedFilters(toPurchaseReceiptStatusFilters(snapshot.keyword, snapshot.detailValues));
  }, [setSearchSession]);

  if (defaultValues && searchSession === null) {
    const snapshot = { keyword: '', detailValues: clonePurchaseReceiptStatusSearchValues(defaultValues) };
    setKeyword('');
    setDetailValues(snapshot.detailValues);
    applySnapshot(snapshot);
  }

  const applySearch = useCallback((values: PurchaseReceiptStatusSearchValues = detailValues) => {
    applySnapshot({ keyword, detailValues: clonePurchaseReceiptStatusSearchValues(values) });
  }, [applySnapshot, detailValues, keyword]);

  const resetSearch = useCallback(() => {
    if (!defaultValues) return;
    const snapshot = { keyword: '', detailValues: clonePurchaseReceiptStatusSearchValues(defaultValues) };
    setKeyword('');
    setDetailValues(snapshot.detailValues);
    applySnapshot(snapshot);
  }, [applySnapshot, defaultValues]);

  return {
    keyword,
    setKeyword,
    detailFields,
    detailValues,
    appliedDetailValues: searchSession?.detailValues ?? {},
    setDetailValues,
    searchAreaDefaultValues: searchSession === null ? (defaultValues ?? {}) : {},
    appliedFilters,
    defaultsInitialized: appliedFilters !== null,
    defaultsLoading,
    defaultsError,
    defaultsInitialLoad,
    retryDefaults,
    applySearch,
    resetSearch,
  };
}

/** 적용된 검색 조건으로 목록을 조회한다. */
export function usePurchaseReceiptStatusList(filters: PurchaseReceiptStatusFilters | null) {
  const [rows, setRows] = useState<PurchaseReceiptStatusRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState('');
  const [retryRequest, setRetryRequest] = useState({ version: 0, quiet: false });
  const [previousRequest, setPreviousRequest] = useState<{
    filters: typeof filters | undefined;
    retryRequest: typeof retryRequest;
    retryVersion: number;
  }>({ filters: undefined, retryRequest, retryVersion: 0 });
  const { start, succeed, fail, ...initialLoad } = useInitialLoadState();

  if (previousRequest.filters !== filters || previousRequest.retryRequest !== retryRequest) {
    const quiet = retryRequest.quiet && retryRequest.version !== previousRequest.retryVersion;
    setPreviousRequest({
      filters,
      retryRequest,
      retryVersion: filters ? retryRequest.version : previousRequest.retryVersion,
    });
    if (filters) {
      start();
      setHasLoaded(false);
      if (!quiet) setLoading(true);
      setError('');
    }
  }

  useEffect(() => {
    if (!filters) return undefined;
    let cancelled = false;
    void searchPurchaseReceiptStatus(filters)
      .then((result) => {
        if (cancelled) return;
        setRows(result);
        setHasLoaded(true);
        succeed();
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        fail(loadError);
        setError(loadError instanceof Error ? loadError.message : '입고현황을 조회하지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters, retryRequest, start, succeed, fail]);

  const clearError = useCallback(() => setError(''), []);
  const retry = useCallback(() => setRetryRequest((current) => ({ version: current.version + 1, quiet: false })), []);
  const refreshQuietly = useCallback(
    () => setRetryRequest((current) => ({ version: current.version + 1, quiet: true })),
    [],
  );

  return { initialLoad, rows, loading, hasLoaded, error, clearError, retry, refreshQuietly };
}

export type PurchaseReceiptEditorMode = Extract<PurchaseReceiptPageMode, 'edit' | 'view'>;

/** 선택한 입고의 상세 패널과 조회/수정 다이얼로그 상태를 관리한다. */
export function usePurchaseReceiptStatusDetail() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [item, setItem] = useState<PurchaseReceiptItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [editorMode, setEditorMode] = useState<PurchaseReceiptEditorMode | null>(null);

  const [previousRequest, setPreviousRequest] = useState({ id: selectedId, token: refreshToken });

  if (previousRequest.id !== selectedId || previousRequest.token !== refreshToken) {
    setPreviousRequest({ id: selectedId, token: refreshToken });
    if (selectedId !== null) {
      setLoading(true);
      setError('');
    }
  }

  useEffect(() => {
    if (selectedId === null) return undefined;
    let active = true;
    getPurchaseReceipt(selectedId)
      .then((loaded) => {
        if (active) setItem(loaded);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setItem(null);
        setError(loadError instanceof Error ? loadError.message : '입고 상세를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshToken, selectedId]);

  const openDetail = useCallback((purchaseReceiptId: number) => {
    setItem((current) => (current?.purchaseReceiptId === purchaseReceiptId ? current : null));
    setSelectedId(purchaseReceiptId);
  }, []);
  const closeDetail = useCallback(() => {
    setSelectedId(null);
    setItem(null);
    setError('');
    setEditorMode(null);
  }, []);
  const refreshDetail = useCallback(() => setRefreshToken((token) => token + 1), []);
  const openEditor = useCallback((mode: PurchaseReceiptEditorMode) => setEditorMode(mode), []);
  const closeEditor = useCallback(() => setEditorMode(null), []);

  return { selectedId, item, loading, error, editorMode, openDetail, closeDetail, refreshDetail, openEditor, closeEditor };
}
