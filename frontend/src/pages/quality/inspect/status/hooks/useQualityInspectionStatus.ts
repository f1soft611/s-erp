import { useCallback, useEffect, useMemo, useState } from 'react';
import { toPageSearchFields } from '../../../../../shared/components/page-search/searchFields';
import { useInitialLoadState } from '../../../../../shared/hooks/useInitialLoadState';
import { usePageSearchDefaults } from '../../../../../shared/hooks/usePageSearchDefaults';
import { usePageSessionState } from '../../../../../shared/hooks/usePageSessionState';
import { getQualityInspection } from '../../create/services/qualityInspection.service';
import type { QualityInspectionPageMode } from '../../create/QualityInspectionCreatePage';
import type { QualityInspectionItem } from '../../create/types/qualityInspection.types';
import { createQualityInspectionStatusColumns } from '../data/qualityInspectionStatusColumns';
import {
  cloneQualityInspectionStatusSearchValues,
  isQualityInspectionStatusSearchSession,
  QUALITY_INSPECTION_STATUS_DEFAULT,
  searchQualityInspectionStatus,
  toQualityInspectionStatusFilters,
} from '../services/qualityInspectionStatus.service';
import type {
  QualityInspectionStatusFilters,
  QualityInspectionStatusRow,
  QualityInspectionStatusSearchSession,
  QualityInspectionStatusSearchValues,
} from '../types/qualityInspectionStatus.types';

const SESSION_KEY = 's-erp:page:quality-quality-inspection-status';

/** 검색어·상세검색 값과 기본값, 세션 보존을 관리한다. 상태 기본값은 정상이다(취소건은 취소·전체를 고를 때만 조회). */
export function useQualityInspectionStatusSearch() {
  const detailFields = useMemo(() => toPageSearchFields(createQualityInspectionStatusColumns()), []);
  const {
    values: loadedDefaultValues,
    loading: defaultsLoading,
    error: defaultsError,
    retry: retryDefaults,
    initialLoad: defaultsInitialLoad,
  } = usePageSearchDefaults(detailFields);
  const defaultValues = useMemo<QualityInspectionStatusSearchValues | null>(
    () => (loadedDefaultValues ? { ...loadedDefaultValues, status: QUALITY_INSPECTION_STATUS_DEFAULT } : null),
    [loadedDefaultValues],
  );
  const { state: searchSession, setState: setSearchSession } =
    usePageSessionState<QualityInspectionStatusSearchSession | null>(SESSION_KEY, null, {
      // 2: 상태 기본값(정상)이 없던 예전 세션을 버린다.
      version: 2,
      validate: (value): value is QualityInspectionStatusSearchSession | null =>
        value === null || isQualityInspectionStatusSearchSession(value),
      persistWhen: (value) => value !== null,
    });
  const [keyword, setKeyword] = useState(searchSession?.keyword ?? '');
  const [detailValues, setDetailValues] = useState<QualityInspectionStatusSearchValues>(
    () => cloneQualityInspectionStatusSearchValues(searchSession?.detailValues ?? {}),
  );
  const [appliedFilters, setAppliedFilters] = useState<QualityInspectionStatusFilters | null>(() =>
    searchSession ? toQualityInspectionStatusFilters(searchSession.keyword, searchSession.detailValues) : null,
  );

  const applySnapshot = useCallback((snapshot: QualityInspectionStatusSearchSession) => {
    setSearchSession(snapshot);
    setAppliedFilters(toQualityInspectionStatusFilters(snapshot.keyword, snapshot.detailValues));
  }, [setSearchSession]);

  if (defaultValues && searchSession === null) {
    const snapshot = { keyword: '', detailValues: cloneQualityInspectionStatusSearchValues(defaultValues) };
    setKeyword('');
    setDetailValues(snapshot.detailValues);
    applySnapshot(snapshot);
  }

  const applySearch = useCallback((values: QualityInspectionStatusSearchValues = detailValues) => {
    applySnapshot({ keyword, detailValues: cloneQualityInspectionStatusSearchValues(values) });
  }, [applySnapshot, detailValues, keyword]);

  const resetSearch = useCallback(() => {
    if (!defaultValues) return;
    const snapshot = { keyword: '', detailValues: cloneQualityInspectionStatusSearchValues(defaultValues) };
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
export function useQualityInspectionStatusList(filters: QualityInspectionStatusFilters | null) {
  const [rows, setRows] = useState<QualityInspectionStatusRow[]>([]);
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
    void searchQualityInspectionStatus(filters)
      .then((result) => {
        if (cancelled) return;
        setRows(result);
        setHasLoaded(true);
        succeed();
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        fail(loadError);
        setError(loadError instanceof Error ? loadError.message : '자재수입검사현황을 조회하지 못했습니다.');
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

export type QualityInspectionEditorMode = Extract<QualityInspectionPageMode, 'edit' | 'view'>;

/** 선택한 검사의 상세 패널과 조회/수정 다이얼로그 상태를 관리한다. */
export function useQualityInspectionStatusDetail() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [item, setItem] = useState<QualityInspectionItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [editorMode, setEditorMode] = useState<QualityInspectionEditorMode | null>(null);

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
    getQualityInspection(selectedId)
      .then((loaded) => {
        if (active) setItem(loaded);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setItem(null);
        setError(loadError instanceof Error ? loadError.message : '검사 상세를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshToken, selectedId]);

  const openDetail = useCallback((qualityInspectionId: number) => {
    setItem((current) => (current?.qualityInspectionId === qualityInspectionId ? current : null));
    setSelectedId(qualityInspectionId);
  }, []);
  const closeDetail = useCallback(() => {
    setSelectedId(null);
    setItem(null);
    setError('');
    setEditorMode(null);
  }, []);
  const refreshDetail = useCallback(() => setRefreshToken((token) => token + 1), []);
  const openEditor = useCallback((mode: QualityInspectionEditorMode) => setEditorMode(mode), []);
  const closeEditor = useCallback(() => setEditorMode(null), []);

  return { selectedId, item, loading, error, editorMode, openDetail, closeDetail, refreshDetail, openEditor, closeEditor };
}
