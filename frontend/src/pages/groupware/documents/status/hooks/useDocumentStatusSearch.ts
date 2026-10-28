import { useCallback, useEffect, useMemo, useState } from 'react';
import { toPageSearchFields } from '../../../../../shared/components/page-search/searchFields';
import { usePageSessionState } from '../../../../../shared/hooks/usePageSessionState';
import { usePageSearchDefaults } from '../../../../../shared/hooks/usePageSearchDefaults';
import { createDocumentStatusColumns } from '../data/documentStatusColumns';
import {
  cloneDetailValues,
  isDocumentStatusSearchSession,
  toDocumentStatusFilters,
} from '../services/documentStatusSearch';
import type { DocumentStatusFilters } from '../types/documentStatus.types';
import type {
  DocumentStatusSearchSession,
  DocumentStatusSearchValues,
} from '../types/documentStatusSearch.types';
import type { DocumentApprovalScope } from '../../write/types/documentWrite.types';

const DOCUMENT_STATUS_SESSION_KEY = 's-erp:page:document-status';
const DOCUMENT_STATUS_SESSION_VERSION = 1;

function withScope(
  filters: DocumentStatusFilters,
  scope: DocumentApprovalScope | null,
): DocumentStatusFilters {
  return scope ? { ...filters, scope } : filters;
}

export function useDocumentStatusSearch(
  initialScope: DocumentApprovalScope | null = null,
  onScopeChange?: (scope: DocumentApprovalScope | null) => void,
) {
  const detailFields = useMemo(
    () => toPageSearchFields(createDocumentStatusColumns()),
    [],
  );
  const {
    values: defaultValues,
    loading: defaultsLoading,
    error: defaultsError,
    retry: retryDefaults,
    initialLoad: defaultsInitialLoad,
  } = usePageSearchDefaults(detailFields);
  const { state: searchSession, setState: setSearchSession } =
    usePageSessionState<DocumentStatusSearchSession | null>(
      DOCUMENT_STATUS_SESSION_KEY,
      null,
      {
        version: DOCUMENT_STATUS_SESSION_VERSION,
        validate: (value): value is DocumentStatusSearchSession | null =>
          value === null || isDocumentStatusSearchSession(value),
        persistWhen: (value) => value !== null,
      },
    );
  const [defaultsInitialized, setDefaultsInitialized] = useState(false);
  const [keyword, setKeyword] = useState(searchSession?.keyword ?? '');
  const [detailValues, setDetailValues] = useState<DocumentStatusSearchValues>(
    () => cloneDetailValues(searchSession?.detailValues ?? {}),
  );
  const [appliedFilters, setAppliedFilters] = useState<DocumentStatusFilters>(
    () => withScope(toDocumentStatusFilters(
      searchSession?.keyword ?? '',
      searchSession?.detailValues ?? {},
    ), initialScope),
  );
  const [dashboardScope, setDashboardScope] = useState(initialScope);

  useEffect(() => {
    if (!defaultValues) return;

    if (searchSession === null) {
      const initialSnapshot: DocumentStatusSearchSession = {
        keyword: '',
        detailValues: cloneDetailValues(defaultValues),
      };
      setKeyword(initialSnapshot.keyword);
      setDetailValues(initialSnapshot.detailValues);
      setSearchSession(initialSnapshot);
      setAppliedFilters(
        withScope(toDocumentStatusFilters(
          initialSnapshot.keyword,
          initialSnapshot.detailValues,
        ), initialScope),
      );
    }
    setDefaultsInitialized(true);
  }, [defaultValues, initialScope, searchSession, setSearchSession]);

  const applySearch = useCallback(
    (values: DocumentStatusSearchValues = detailValues) => {
      const snapshot = {
        keyword,
        detailValues: cloneDetailValues(values),
      };
      setSearchSession(snapshot);
      setAppliedFilters(withScope(
        toDocumentStatusFilters(snapshot.keyword, snapshot.detailValues),
        dashboardScope,
      ));
    },
    [dashboardScope, detailValues, keyword, setSearchSession],
  );

  const resetSearch = useCallback(() => {
    if (!defaultValues) return;
    const resetDetailValues = cloneDetailValues(defaultValues);
    const resetSnapshot = {
      keyword: '',
      detailValues: resetDetailValues,
    };
    setKeyword('');
    setDetailValues(resetDetailValues);
    setDashboardScope(null);
    setSearchSession(resetSnapshot);
    setAppliedFilters(
      toDocumentStatusFilters(resetSnapshot.keyword, resetSnapshot.detailValues),
    );
    onScopeChange?.(null);
  }, [defaultValues, onScopeChange, setSearchSession]);

  const clearDashboardScope = useCallback(() => {
    setDashboardScope(null);
    setAppliedFilters((current) => {
      const next = { ...current };
      delete next.scope;
      return next;
    });
    onScopeChange?.(null);
  }, [onScopeChange]);

  return {
    keyword,
    setKeyword,
    detailFields,
    detailValues,
    setDetailValues,
    appliedFilters,
    defaultsInitialized,
    defaultsLoading,
    defaultsError,
    defaultsInitialLoad,
    retryDefaults,
    searchAreaDefaultValues: searchSession === null ? (defaultValues ?? {}) : {},
    applySearch,
    resetSearch,
    dashboardScope,
    clearDashboardScope,
  };
}
