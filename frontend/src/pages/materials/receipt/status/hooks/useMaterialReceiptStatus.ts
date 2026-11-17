import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toPageSearchFields } from '../../../../../shared/components/page-search/searchFields';
import { useInitialLoadState } from '../../../../../shared/hooks/useInitialLoadState';
import { usePageSearchDefaults } from '../../../../../shared/hooks/usePageSearchDefaults';
import { usePageSessionState } from '../../../../../shared/hooks/usePageSessionState';
import { getMaterialReceipt } from '../../create/services/materialReceipt.service';
import type { MaterialReceiptPageMode } from '../../create/MaterialReceiptCreatePage';
import type { MaterialReceiptItem } from '../../create/types/materialReceipt.types';
import { createMaterialReceiptStatusColumns } from '../data/materialReceiptStatusColumns';
import {
  cloneMaterialReceiptStatusSearchValues,
  isMaterialReceiptStatusSearchSession,
  MATERIAL_RECEIPT_STATUS_DEFAULT,
  searchMaterialReceiptStatus,
  toMaterialReceiptStatusFilters,
} from '../services/materialReceiptStatus.service';
import type {
  MaterialReceiptStatusFilters,
  MaterialReceiptStatusRow,
  MaterialReceiptStatusSearchSession,
  MaterialReceiptStatusSearchValues,
} from '../types/materialReceiptStatus.types';

const SESSION_KEY = 's-erp:page:materials-material-receipt-status';

/** 검색어·상세검색 값과 기본값, 세션 보존을 관리한다. 상태 기본값은 정상이다(취소건은 취소·전체를 고를 때만 조회). */
export function useMaterialReceiptStatusSearch() {
  const detailFields = useMemo(() => toPageSearchFields(createMaterialReceiptStatusColumns()), []);
  const {
    values: loadedDefaultValues,
    loading: defaultsLoading,
    error: defaultsError,
    retry: retryDefaults,
    initialLoad: defaultsInitialLoad,
  } = usePageSearchDefaults(detailFields);
  const defaultValues = useMemo<MaterialReceiptStatusSearchValues | null>(
    () => (loadedDefaultValues ? { ...loadedDefaultValues, status: MATERIAL_RECEIPT_STATUS_DEFAULT } : null),
    [loadedDefaultValues],
  );
  const { state: searchSession, setState: setSearchSession } =
    usePageSessionState<MaterialReceiptStatusSearchSession | null>(SESSION_KEY, null, {
      // 2: 상태 기본값(정상)이 없던 예전 세션을 버린다.
      version: 2,
      validate: (value): value is MaterialReceiptStatusSearchSession | null =>
        value === null || isMaterialReceiptStatusSearchSession(value),
      persistWhen: (value) => value !== null,
    });
  const [keyword, setKeyword] = useState(searchSession?.keyword ?? '');
  const [detailValues, setDetailValues] = useState<MaterialReceiptStatusSearchValues>(
    () => cloneMaterialReceiptStatusSearchValues(searchSession?.detailValues ?? {}),
  );
  const [appliedFilters, setAppliedFilters] = useState<MaterialReceiptStatusFilters | null>(() =>
    searchSession ? toMaterialReceiptStatusFilters(searchSession.keyword, searchSession.detailValues) : null,
  );

  const applySnapshot = useCallback((snapshot: MaterialReceiptStatusSearchSession) => {
    setSearchSession(snapshot);
    setAppliedFilters(toMaterialReceiptStatusFilters(snapshot.keyword, snapshot.detailValues));
  }, [setSearchSession]);

  useEffect(() => {
    if (!defaultValues || searchSession !== null) return;
    const snapshot = { keyword: '', detailValues: cloneMaterialReceiptStatusSearchValues(defaultValues) };
    setKeyword('');
    setDetailValues(snapshot.detailValues);
    applySnapshot(snapshot);
  }, [applySnapshot, defaultValues, searchSession]);

  const applySearch = useCallback((values: MaterialReceiptStatusSearchValues = detailValues) => {
    applySnapshot({ keyword, detailValues: cloneMaterialReceiptStatusSearchValues(values) });
  }, [applySnapshot, detailValues, keyword]);

  const resetSearch = useCallback(() => {
    if (!defaultValues) return;
    const snapshot = { keyword: '', detailValues: cloneMaterialReceiptStatusSearchValues(defaultValues) };
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
export function useMaterialReceiptStatusList(filters: MaterialReceiptStatusFilters | null) {
  const [rows, setRows] = useState<MaterialReceiptStatusRow[]>([]);
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
    void searchMaterialReceiptStatus(filters)
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

export type MaterialReceiptEditorMode = Extract<MaterialReceiptPageMode, 'edit' | 'view'>;

/** 선택한 입고의 상세 패널과 조회/수정 다이얼로그 상태를 관리한다. */
export function useMaterialReceiptStatusDetail() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [item, setItem] = useState<MaterialReceiptItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [editorMode, setEditorMode] = useState<MaterialReceiptEditorMode | null>(null);

  useEffect(() => {
    if (selectedId === null) return undefined;
    let active = true;
    setLoading(true);
    setError('');
    getMaterialReceipt(selectedId)
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

  const openDetail = useCallback((materialReceiptId: number) => {
    setItem((current) => (current?.materialReceiptId === materialReceiptId ? current : null));
    setSelectedId(materialReceiptId);
  }, []);
  const closeDetail = useCallback(() => {
    setSelectedId(null);
    setItem(null);
    setError('');
    setEditorMode(null);
  }, []);
  const refreshDetail = useCallback(() => setRefreshToken((token) => token + 1), []);
  const openEditor = useCallback((mode: MaterialReceiptEditorMode) => setEditorMode(mode), []);
  const closeEditor = useCallback(() => setEditorMode(null), []);

  return { selectedId, item, loading, error, editorMode, openDetail, closeDetail, refreshDetail, openEditor, closeEditor };
}
