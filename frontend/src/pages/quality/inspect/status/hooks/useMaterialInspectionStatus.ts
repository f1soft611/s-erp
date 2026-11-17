import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toPageSearchFields } from '../../../../../shared/components/page-search/searchFields';
import { useInitialLoadState } from '../../../../../shared/hooks/useInitialLoadState';
import { usePageSearchDefaults } from '../../../../../shared/hooks/usePageSearchDefaults';
import { usePageSessionState } from '../../../../../shared/hooks/usePageSessionState';
import { getMaterialInspection } from '../../create/services/materialInspection.service';
import type { MaterialInspectionPageMode } from '../../create/MaterialInspectionCreatePage';
import type { MaterialInspectionItem } from '../../create/types/materialInspection.types';
import { createMaterialInspectionStatusColumns } from '../data/materialInspectionStatusColumns';
import {
  cloneMaterialInspectionStatusSearchValues,
  isMaterialInspectionStatusSearchSession,
  MATERIAL_INSPECTION_STATUS_DEFAULT,
  searchMaterialInspectionStatus,
  toMaterialInspectionStatusFilters,
} from '../services/materialInspectionStatus.service';
import type {
  MaterialInspectionStatusFilters,
  MaterialInspectionStatusRow,
  MaterialInspectionStatusSearchSession,
  MaterialInspectionStatusSearchValues,
} from '../types/materialInspectionStatus.types';

const SESSION_KEY = 's-erp:page:quality-material-inspection-status';

/** 검색어·상세검색 값과 기본값, 세션 보존을 관리한다. 상태 기본값은 정상이다(취소건은 취소·전체를 고를 때만 조회). */
export function useMaterialInspectionStatusSearch() {
  const detailFields = useMemo(() => toPageSearchFields(createMaterialInspectionStatusColumns()), []);
  const {
    values: loadedDefaultValues,
    loading: defaultsLoading,
    error: defaultsError,
    retry: retryDefaults,
    initialLoad: defaultsInitialLoad,
  } = usePageSearchDefaults(detailFields);
  const defaultValues = useMemo<MaterialInspectionStatusSearchValues | null>(
    () => (loadedDefaultValues ? { ...loadedDefaultValues, status: MATERIAL_INSPECTION_STATUS_DEFAULT } : null),
    [loadedDefaultValues],
  );
  const { state: searchSession, setState: setSearchSession } =
    usePageSessionState<MaterialInspectionStatusSearchSession | null>(SESSION_KEY, null, {
      // 2: 상태 기본값(정상)이 없던 예전 세션을 버린다.
      version: 2,
      validate: (value): value is MaterialInspectionStatusSearchSession | null =>
        value === null || isMaterialInspectionStatusSearchSession(value),
      persistWhen: (value) => value !== null,
    });
  const [keyword, setKeyword] = useState(searchSession?.keyword ?? '');
  const [detailValues, setDetailValues] = useState<MaterialInspectionStatusSearchValues>(
    () => cloneMaterialInspectionStatusSearchValues(searchSession?.detailValues ?? {}),
  );
  const [appliedFilters, setAppliedFilters] = useState<MaterialInspectionStatusFilters | null>(() =>
    searchSession ? toMaterialInspectionStatusFilters(searchSession.keyword, searchSession.detailValues) : null,
  );

  const applySnapshot = useCallback((snapshot: MaterialInspectionStatusSearchSession) => {
    setSearchSession(snapshot);
    setAppliedFilters(toMaterialInspectionStatusFilters(snapshot.keyword, snapshot.detailValues));
  }, [setSearchSession]);

  useEffect(() => {
    if (!defaultValues || searchSession !== null) return;
    const snapshot = { keyword: '', detailValues: cloneMaterialInspectionStatusSearchValues(defaultValues) };
    setKeyword('');
    setDetailValues(snapshot.detailValues);
    applySnapshot(snapshot);
  }, [applySnapshot, defaultValues, searchSession]);

  const applySearch = useCallback((values: MaterialInspectionStatusSearchValues = detailValues) => {
    applySnapshot({ keyword, detailValues: cloneMaterialInspectionStatusSearchValues(values) });
  }, [applySnapshot, detailValues, keyword]);

  const resetSearch = useCallback(() => {
    if (!defaultValues) return;
    const snapshot = { keyword: '', detailValues: cloneMaterialInspectionStatusSearchValues(defaultValues) };
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
export function useMaterialInspectionStatusList(filters: MaterialInspectionStatusFilters | null) {
  const [rows, setRows] = useState<MaterialInspectionStatusRow[]>([]);
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
    void searchMaterialInspectionStatus(filters)
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

export type MaterialInspectionEditorMode = Extract<MaterialInspectionPageMode, 'edit' | 'view'>;

/** 선택한 검사의 상세 패널과 조회/수정 다이얼로그 상태를 관리한다. */
export function useMaterialInspectionStatusDetail() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [item, setItem] = useState<MaterialInspectionItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [editorMode, setEditorMode] = useState<MaterialInspectionEditorMode | null>(null);

  useEffect(() => {
    if (selectedId === null) return undefined;
    let active = true;
    setLoading(true);
    setError('');
    getMaterialInspection(selectedId)
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

  const openDetail = useCallback((materialInspectionId: number) => {
    setItem((current) => (current?.materialInspectionId === materialInspectionId ? current : null));
    setSelectedId(materialInspectionId);
  }, []);
  const closeDetail = useCallback(() => {
    setSelectedId(null);
    setItem(null);
    setError('');
    setEditorMode(null);
  }, []);
  const refreshDetail = useCallback(() => setRefreshToken((token) => token + 1), []);
  const openEditor = useCallback((mode: MaterialInspectionEditorMode) => setEditorMode(mode), []);
  const closeEditor = useCallback(() => setEditorMode(null), []);

  return { selectedId, item, loading, error, editorMode, openDetail, closeDetail, refreshDetail, openEditor, closeEditor };
}
