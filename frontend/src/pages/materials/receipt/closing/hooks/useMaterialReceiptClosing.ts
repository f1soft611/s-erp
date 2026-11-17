import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toPageSearchFields } from '../../../../../shared/components/page-search/searchFields';
import { useInitialLoadState } from '../../../../../shared/hooks/useInitialLoadState';
import { usePageSearchDefaults } from '../../../../../shared/hooks/usePageSearchDefaults';
import { usePageSessionState } from '../../../../../shared/hooks/usePageSessionState';
import { createClosingSearchColumns } from '../data/materialReceiptClosingColumns';
import {
  CLOSE_TYPE_DEFAULT,
  cloneMaterialReceiptClosingSearchValues,
  isMaterialReceiptClosingSearchSession,
  monthOfDate,
  searchClosingRows,
  searchClosingSuppliers,
  toMaterialReceiptClosingFilters,
} from '../services/materialReceiptClosing.service';
import type {
  MaterialReceiptClosingFilters,
  MaterialReceiptClosingRow,
  MaterialReceiptClosingSearchSession,
  MaterialReceiptClosingSearchValues,
  MaterialReceiptClosingSupplier,
} from '../types/materialReceiptClosing.types';

const SESSION_KEY = 's-erp:page:materials-material-receipt-closing';

/** 검색어·상세검색 값과 기본값(이번 달 마감월, 전체 조회구분), 세션 보존을 관리한다. */
export function useMaterialReceiptClosingSearch() {
  const detailFields = useMemo(() => toPageSearchFields(createClosingSearchColumns()), []);
  const {
    values: loadedDefaultValues,
    loading: defaultsLoading,
    error: defaultsError,
    retry: retryDefaults,
    initialLoad: defaultsInitialLoad,
  } = usePageSearchDefaults(detailFields);
  const defaultValues = useMemo<MaterialReceiptClosingSearchValues | null>(
    () => {
      if (!loadedDefaultValues) return null;
      // 마감월 기본값은 서버 날짜(입고일 종료일 기본값)의 월이다.
      const receiptDt = loadedDefaultValues.receiptDt;
      const serverDate = receiptDt && typeof receiptDt === 'object' ? receiptDt.to : undefined;
      return { ...loadedDefaultValues, closingMonth: monthOfDate(serverDate), closeType: CLOSE_TYPE_DEFAULT };
    },
    [loadedDefaultValues],
  );
  const { state: searchSession, setState: setSearchSession } =
    usePageSessionState<MaterialReceiptClosingSearchSession | null>(SESSION_KEY, null, {
      version: 1,
      validate: (value): value is MaterialReceiptClosingSearchSession | null =>
        value === null || isMaterialReceiptClosingSearchSession(value),
      persistWhen: (value) => value !== null,
    });
  const [keyword, setKeyword] = useState(searchSession?.keyword ?? '');
  const [detailValues, setDetailValues] = useState<MaterialReceiptClosingSearchValues>(
    () => cloneMaterialReceiptClosingSearchValues(searchSession?.detailValues ?? {}),
  );
  const [appliedFilters, setAppliedFilters] = useState<MaterialReceiptClosingFilters | null>(() =>
    searchSession ? toMaterialReceiptClosingFilters(searchSession.keyword, searchSession.detailValues) : null,
  );

  const applySnapshot = useCallback((snapshot: MaterialReceiptClosingSearchSession) => {
    setSearchSession(snapshot);
    setAppliedFilters(toMaterialReceiptClosingFilters(snapshot.keyword, snapshot.detailValues));
  }, [setSearchSession]);

  useEffect(() => {
    if (!defaultValues || searchSession !== null) return;
    const snapshot = { keyword: '', detailValues: cloneMaterialReceiptClosingSearchValues(defaultValues) };
    setKeyword('');
    setDetailValues(snapshot.detailValues);
    applySnapshot(snapshot);
  }, [applySnapshot, defaultValues, searchSession]);

  const applySearch = useCallback((values: MaterialReceiptClosingSearchValues = detailValues) => {
    applySnapshot({ keyword, detailValues: cloneMaterialReceiptClosingSearchValues(values) });
  }, [applySnapshot, detailValues, keyword]);

  const resetSearch = useCallback(() => {
    if (!defaultValues) return;
    const snapshot = { keyword: '', detailValues: cloneMaterialReceiptClosingSearchValues(defaultValues) };
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

/** 적용된 검색 조건으로 구매처 요약과 입고 행을 함께 조회한다. */
export function useMaterialReceiptClosingData(filters: MaterialReceiptClosingFilters | null) {
  const [suppliers, setSuppliers] = useState<MaterialReceiptClosingSupplier[]>([]);
  const [rows, setRows] = useState<MaterialReceiptClosingRow[]>([]);
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
    void Promise.all([searchClosingSuppliers(filters), searchClosingRows(filters)])
      .then(([loadedSuppliers, loadedRows]) => {
        if (cancelled) return;
        setSuppliers(loadedSuppliers);
        setRows(loadedRows);
        setHasLoaded(true);
        succeed();
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        fail(loadError);
        setError(loadError instanceof Error ? loadError.message : '매입마감 대상을 조회하지 못했습니다.');
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

  return {
    initialLoad, suppliers, rows, loading, hasLoaded, error, setError, clearError, retry, refreshQuietly,
    /** 조회가 새로 끝날 때마다 바뀌어 그리드 초기화에 쓴다. */
    dataVersion: retryRequest.version,
  };
}
