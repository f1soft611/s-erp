import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toPageSearchFields } from '../../../../../shared/components/page-search/searchFields';
import { useInitialLoadState } from '../../../../../shared/hooks/useInitialLoadState';
import { usePageSearchDefaults } from '../../../../../shared/hooks/usePageSearchDefaults';
import { usePageSessionState } from '../../../../../shared/hooks/usePageSessionState';
import { getPurchaseArrival } from '../../create/services/purchaseArrival.service';
import type { PurchaseArrivalPageMode } from '../../create/PurchaseArrivalCreatePage';
import type { PurchaseArrivalItem } from '../../create/types/purchaseArrival.types';
import { createPurchaseArrivalStatusColumns } from '../data/purchaseArrivalStatusColumns';
import {
  clonePurchaseArrivalStatusSearchValues,
  isPurchaseArrivalStatusSearchSession,
  PURCHASE_ARRIVAL_STATUS_DEFAULT,
  searchPurchaseArrivalStatus,
  toPurchaseArrivalStatusFilters,
} from '../services/purchaseArrivalStatus.service';
import type {
  PurchaseArrivalStatusFilters,
  PurchaseArrivalStatusRow,
  PurchaseArrivalStatusSearchSession,
  PurchaseArrivalStatusSearchValues,
} from '../types/purchaseArrivalStatus.types';

const SESSION_KEY = 's-erp:page:materials-purchase-arrival-status';

/** 검색어·상세검색 값과 기본값, 세션 보존을 관리한다. (발주현황 검색 훅과 같은 동작) */
export function usePurchaseArrivalStatusSearch() {
  const detailFields = useMemo(() => toPageSearchFields(createPurchaseArrivalStatusColumns()), []);
  const {
    values: loadedDefaultValues,
    loading: defaultsLoading,
    error: defaultsError,
    retry: retryDefaults,
    initialLoad: defaultsInitialLoad,
  } = usePageSearchDefaults(detailFields);
  // 날짜 범위 기본값은 공통 훅이 주고, 상태 기본값(정상)은 여기서 주입한다.
  const defaultValues = useMemo<PurchaseArrivalStatusSearchValues | null>(
    () => (loadedDefaultValues ? { ...loadedDefaultValues, status: PURCHASE_ARRIVAL_STATUS_DEFAULT } : null),
    [loadedDefaultValues],
  );
  const { state: searchSession, setState: setSearchSession } =
    usePageSessionState<PurchaseArrivalStatusSearchSession | null>(SESSION_KEY, null, {
      // 2: 상태 기본값(정상)이 없던 예전 세션을 버린다.
      version: 2,
      validate: (value): value is PurchaseArrivalStatusSearchSession | null =>
        value === null || isPurchaseArrivalStatusSearchSession(value),
      persistWhen: (value) => value !== null,
    });
  const [keyword, setKeyword] = useState(searchSession?.keyword ?? '');
  const [detailValues, setDetailValues] = useState<PurchaseArrivalStatusSearchValues>(
    () => clonePurchaseArrivalStatusSearchValues(searchSession?.detailValues ?? {}),
  );
  const [appliedFilters, setAppliedFilters] = useState<PurchaseArrivalStatusFilters | null>(() =>
    searchSession ? toPurchaseArrivalStatusFilters(searchSession.keyword, searchSession.detailValues) : null,
  );

  const applySnapshot = useCallback((snapshot: PurchaseArrivalStatusSearchSession) => {
    setSearchSession(snapshot);
    setAppliedFilters(toPurchaseArrivalStatusFilters(snapshot.keyword, snapshot.detailValues));
  }, [setSearchSession]);

  useEffect(() => {
    if (!defaultValues || searchSession !== null) return;
    const snapshot = { keyword: '', detailValues: clonePurchaseArrivalStatusSearchValues(defaultValues) };
    setKeyword('');
    setDetailValues(snapshot.detailValues);
    applySnapshot(snapshot);
  }, [applySnapshot, defaultValues, searchSession]);

  const applySearch = useCallback((values: PurchaseArrivalStatusSearchValues = detailValues) => {
    applySnapshot({ keyword, detailValues: clonePurchaseArrivalStatusSearchValues(values) });
  }, [applySnapshot, detailValues, keyword]);

  const resetSearch = useCallback(() => {
    if (!defaultValues) return;
    const snapshot = { keyword: '', detailValues: clonePurchaseArrivalStatusSearchValues(defaultValues) };
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
export function usePurchaseArrivalStatusList(filters: PurchaseArrivalStatusFilters | null) {
  const [rows, setRows] = useState<PurchaseArrivalStatusRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState('');
  const [retryRequest, setRetryRequest] = useState({ version: 0, quiet: false });
  const previousRetryVersion = useRef(0);
  const { start, succeed, fail, ...initialLoad } = useInitialLoadState();

  useEffect(() => {
    if (!filters) return undefined;
    let cancelled = false;
    const quiet = retryRequest.quiet && retryRequest.version !== previousRetryVersion.current;
    previousRetryVersion.current = retryRequest.version;
    start();
    setHasLoaded(false);
    if (!quiet) setLoading(true);
    setError('');
    void searchPurchaseArrivalStatus(filters)
      .then((result) => {
        if (cancelled) return;
        setRows(result);
        setHasLoaded(true);
        succeed();
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        fail(loadError);
        setError(loadError instanceof Error ? loadError.message : '가입고현황을 조회하지 못했습니다.');
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

export type PurchaseArrivalEditorMode = Extract<PurchaseArrivalPageMode, 'edit' | 'view'>;

/** 선택한 가입고의 상세 패널과 조회/수정 다이얼로그 상태를 관리한다. */
export function usePurchaseArrivalStatusDetail() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [item, setItem] = useState<PurchaseArrivalItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [editorMode, setEditorMode] = useState<PurchaseArrivalEditorMode | null>(null);

  useEffect(() => {
    if (selectedId === null) return undefined;
    let active = true;
    setLoading(true);
    setError('');
    getPurchaseArrival(selectedId)
      .then((loaded) => {
        if (active) setItem(loaded);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setItem(null);
        setError(loadError instanceof Error ? loadError.message : '가입고 상세를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshToken, selectedId]);

  const openDetail = useCallback((purchaseArrivalId: number) => {
    setItem((current) => (current?.purchaseArrivalId === purchaseArrivalId ? current : null));
    setSelectedId(purchaseArrivalId);
  }, []);
  const closeDetail = useCallback(() => {
    setSelectedId(null);
    setItem(null);
    setError('');
    setEditorMode(null);
  }, []);
  const refreshDetail = useCallback(() => setRefreshToken((token) => token + 1), []);
  const openEditor = useCallback((mode: PurchaseArrivalEditorMode) => setEditorMode(mode), []);
  const closeEditor = useCallback(() => setEditorMode(null), []);

  return { selectedId, item, loading, error, editorMode, openDetail, closeDetail, refreshDetail, openEditor, closeEditor };
}
