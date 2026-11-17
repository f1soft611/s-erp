import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toPageSearchFields } from '../../../../../shared/components/page-search/searchFields';
import { useInitialLoadState } from '../../../../../shared/hooks/useInitialLoadState';
import { usePageSearchDefaults } from '../../../../../shared/hooks/usePageSearchDefaults';
import { usePageSessionState } from '../../../../../shared/hooks/usePageSessionState';
import { getMaterialArrival } from '../../create/services/materialArrival.service';
import type { MaterialArrivalPageMode } from '../../create/MaterialArrivalCreatePage';
import type { MaterialArrivalItem } from '../../create/types/materialArrival.types';
import { createMaterialArrivalStatusColumns } from '../data/materialArrivalStatusColumns';
import {
  cloneMaterialArrivalStatusSearchValues,
  isMaterialArrivalStatusSearchSession,
  MATERIAL_ARRIVAL_STATUS_DEFAULT,
  searchMaterialArrivalStatus,
  toMaterialArrivalStatusFilters,
} from '../services/materialArrivalStatus.service';
import type {
  MaterialArrivalStatusFilters,
  MaterialArrivalStatusRow,
  MaterialArrivalStatusSearchSession,
  MaterialArrivalStatusSearchValues,
} from '../types/materialArrivalStatus.types';

const SESSION_KEY = 's-erp:page:materials-material-arrival-status';

/** 검색어·상세검색 값과 기본값, 세션 보존을 관리한다. (발주현황 검색 훅과 같은 동작) */
export function useMaterialArrivalStatusSearch() {
  const detailFields = useMemo(() => toPageSearchFields(createMaterialArrivalStatusColumns()), []);
  const {
    values: loadedDefaultValues,
    loading: defaultsLoading,
    error: defaultsError,
    retry: retryDefaults,
    initialLoad: defaultsInitialLoad,
  } = usePageSearchDefaults(detailFields);
  // 날짜 범위 기본값은 공통 훅이 주고, 상태 기본값(정상)은 여기서 주입한다.
  const defaultValues = useMemo<MaterialArrivalStatusSearchValues | null>(
    () => (loadedDefaultValues ? { ...loadedDefaultValues, status: MATERIAL_ARRIVAL_STATUS_DEFAULT } : null),
    [loadedDefaultValues],
  );
  const { state: searchSession, setState: setSearchSession } =
    usePageSessionState<MaterialArrivalStatusSearchSession | null>(SESSION_KEY, null, {
      // 2: 상태 기본값(정상)이 없던 예전 세션을 버린다.
      version: 2,
      validate: (value): value is MaterialArrivalStatusSearchSession | null =>
        value === null || isMaterialArrivalStatusSearchSession(value),
      persistWhen: (value) => value !== null,
    });
  const [keyword, setKeyword] = useState(searchSession?.keyword ?? '');
  const [detailValues, setDetailValues] = useState<MaterialArrivalStatusSearchValues>(
    () => cloneMaterialArrivalStatusSearchValues(searchSession?.detailValues ?? {}),
  );
  const [appliedFilters, setAppliedFilters] = useState<MaterialArrivalStatusFilters | null>(() =>
    searchSession ? toMaterialArrivalStatusFilters(searchSession.keyword, searchSession.detailValues) : null,
  );

  const applySnapshot = useCallback((snapshot: MaterialArrivalStatusSearchSession) => {
    setSearchSession(snapshot);
    setAppliedFilters(toMaterialArrivalStatusFilters(snapshot.keyword, snapshot.detailValues));
  }, [setSearchSession]);

  useEffect(() => {
    if (!defaultValues || searchSession !== null) return;
    const snapshot = { keyword: '', detailValues: cloneMaterialArrivalStatusSearchValues(defaultValues) };
    setKeyword('');
    setDetailValues(snapshot.detailValues);
    applySnapshot(snapshot);
  }, [applySnapshot, defaultValues, searchSession]);

  const applySearch = useCallback((values: MaterialArrivalStatusSearchValues = detailValues) => {
    applySnapshot({ keyword, detailValues: cloneMaterialArrivalStatusSearchValues(values) });
  }, [applySnapshot, detailValues, keyword]);

  const resetSearch = useCallback(() => {
    if (!defaultValues) return;
    const snapshot = { keyword: '', detailValues: cloneMaterialArrivalStatusSearchValues(defaultValues) };
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
export function useMaterialArrivalStatusList(filters: MaterialArrivalStatusFilters | null) {
  const [rows, setRows] = useState<MaterialArrivalStatusRow[]>([]);
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
    void searchMaterialArrivalStatus(filters)
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

export type MaterialArrivalEditorMode = Extract<MaterialArrivalPageMode, 'edit' | 'view'>;

/** 선택한 가입고의 상세 패널과 조회/수정 다이얼로그 상태를 관리한다. */
export function useMaterialArrivalStatusDetail() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [item, setItem] = useState<MaterialArrivalItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [editorMode, setEditorMode] = useState<MaterialArrivalEditorMode | null>(null);

  useEffect(() => {
    if (selectedId === null) return undefined;
    let active = true;
    setLoading(true);
    setError('');
    getMaterialArrival(selectedId)
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

  const openDetail = useCallback((materialArrivalId: number) => {
    setItem((current) => (current?.materialArrivalId === materialArrivalId ? current : null));
    setSelectedId(materialArrivalId);
  }, []);
  const closeDetail = useCallback(() => {
    setSelectedId(null);
    setItem(null);
    setError('');
    setEditorMode(null);
  }, []);
  const refreshDetail = useCallback(() => setRefreshToken((token) => token + 1), []);
  const openEditor = useCallback((mode: MaterialArrivalEditorMode) => setEditorMode(mode), []);
  const closeEditor = useCallback(() => setEditorMode(null), []);

  return { selectedId, item, loading, error, editorMode, openDetail, closeDetail, refreshDetail, openEditor, closeEditor };
}
