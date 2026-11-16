import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toPageSearchFields } from '../../../../../shared/components/page-search/searchFields';
import { useInitialLoadState } from '../../../../../shared/hooks/useInitialLoadState';
import { usePageSearchDefaults } from '../../../../../shared/hooks/usePageSearchDefaults';
import { usePageSessionState } from '../../../../../shared/hooks/usePageSessionState';
import { getPurchaseRequest } from '../../create/services/purchaseRequest.service';
import type { PurchaseRequestPageMode } from '../../create/PurchaseRequestCreatePage';
import type { PurchaseRequestItem } from '../../create/types/purchaseRequest.types';
import { createPurchaseRequestStatusColumns } from '../data/purchaseRequestStatusColumns';
import {
  clonePurchaseRequestStatusSearchValues,
  isPurchaseRequestStatusSearchSession,
  searchPurchaseRequestStatus,
  toPurchaseRequestStatusFilters,
} from '../services/purchaseRequestStatus.service';
import type {
  PurchaseRequestStatusFilters,
  PurchaseRequestStatusRow,
  PurchaseRequestStatusSearchSession,
  PurchaseRequestStatusSearchValues,
} from '../types/purchaseRequestStatus.types';

const SESSION_KEY = 's-erp:page:materials-purchase-request-status';

/** 검색어·상세검색 값과 기본값, 세션 보존을 관리한다. (수주현황 검색 훅과 같은 동작) */
export function usePurchaseRequestStatusSearch() {
  // 기본값 계산용 필드는 고정한다. 사용용도 옵션은 화면 표시 단계에서만 주입한다.
  const detailFields = useMemo(() => toPageSearchFields(createPurchaseRequestStatusColumns()), []);
  const {
    values: defaultValues,
    loading: defaultsLoading,
    error: defaultsError,
    retry: retryDefaults,
    initialLoad: defaultsInitialLoad,
  } = usePageSearchDefaults(detailFields);
  const { state: searchSession, setState: setSearchSession } =
    usePageSessionState<PurchaseRequestStatusSearchSession | null>(SESSION_KEY, null, {
      version: 1,
      validate: (value): value is PurchaseRequestStatusSearchSession | null =>
        value === null || isPurchaseRequestStatusSearchSession(value),
      persistWhen: (value) => value !== null,
    });
  const [keyword, setKeyword] = useState(searchSession?.keyword ?? '');
  const [detailValues, setDetailValues] = useState<PurchaseRequestStatusSearchValues>(
    () => clonePurchaseRequestStatusSearchValues(searchSession?.detailValues ?? {}),
  );
  const [appliedFilters, setAppliedFilters] = useState<PurchaseRequestStatusFilters | null>(() =>
    searchSession ? toPurchaseRequestStatusFilters(searchSession.keyword, searchSession.detailValues) : null,
  );

  const applySnapshot = useCallback((snapshot: PurchaseRequestStatusSearchSession) => {
    setSearchSession(snapshot);
    setAppliedFilters(toPurchaseRequestStatusFilters(snapshot.keyword, snapshot.detailValues));
  }, [setSearchSession]);

  useEffect(() => {
    if (!defaultValues || searchSession !== null) return;
    const snapshot = { keyword: '', detailValues: clonePurchaseRequestStatusSearchValues(defaultValues) };
    setKeyword('');
    setDetailValues(snapshot.detailValues);
    applySnapshot(snapshot);
  }, [applySnapshot, defaultValues, searchSession]);

  const applySearch = useCallback((values: PurchaseRequestStatusSearchValues = detailValues) => {
    applySnapshot({ keyword, detailValues: clonePurchaseRequestStatusSearchValues(values) });
  }, [applySnapshot, detailValues, keyword]);

  const resetSearch = useCallback(() => {
    if (!defaultValues) return;
    const snapshot = { keyword: '', detailValues: clonePurchaseRequestStatusSearchValues(defaultValues) };
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
export function usePurchaseRequestStatusList(filters: PurchaseRequestStatusFilters | null) {
  const [rows, setRows] = useState<PurchaseRequestStatusRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState('');
  const [retryRequest, setRetryRequest] = useState({ version: 0, quiet: false });
  const previousRetryVersion = useRef(0);
  const { start, succeed, fail, ...initialLoad } = useInitialLoadState();

  useEffect(() => {
    if (!filters) return;
    let cancelled = false;
    const quiet = retryRequest.quiet && retryRequest.version !== previousRetryVersion.current;
    previousRetryVersion.current = retryRequest.version;
    start();
    setHasLoaded(false);
    if (!quiet) setLoading(true);
    setError('');
    void searchPurchaseRequestStatus(filters)
      .then((result) => {
        if (cancelled) return;
        setRows(result);
        setHasLoaded(true);
        succeed();
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        fail(loadError);
        setError(loadError instanceof Error ? loadError.message : '구매요청현황을 조회하지 못했습니다.');
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

export type PurchaseRequestEditorMode = Extract<PurchaseRequestPageMode, 'edit' | 'view'>;

/** 선택한 구매요청의 상세 패널과 조회/수정 다이얼로그 상태를 관리한다. */
export function usePurchaseRequestStatusDetail() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [item, setItem] = useState<PurchaseRequestItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [editorMode, setEditorMode] = useState<PurchaseRequestEditorMode | null>(null);

  useEffect(() => {
    if (selectedId === null) return;
    let active = true;
    setLoading(true);
    setError('');
    getPurchaseRequest(selectedId)
      .then((loaded) => {
        if (active) setItem(loaded);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setItem(null);
        setError(loadError instanceof Error ? loadError.message : '구매요청 상세를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshToken, selectedId]);

  const openDetail = useCallback((purchaseRequestId: number) => {
    setItem((current) => (current?.purchaseRequestId === purchaseRequestId ? current : null));
    setSelectedId(purchaseRequestId);
  }, []);
  const closeDetail = useCallback(() => {
    setSelectedId(null);
    setItem(null);
    setError('');
    setEditorMode(null);
  }, []);
  const refreshDetail = useCallback(() => setRefreshToken((token) => token + 1), []);
  const openEditor = useCallback((mode: PurchaseRequestEditorMode) => setEditorMode(mode), []);
  const closeEditor = useCallback(() => setEditorMode(null), []);

  return { selectedId, item, loading, error, editorMode, openDetail, closeDetail, refreshDetail, openEditor, closeEditor };
}
