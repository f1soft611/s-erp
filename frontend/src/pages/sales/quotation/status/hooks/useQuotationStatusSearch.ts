import { useCallback, useEffect, useMemo, useState } from 'react';
import { toPageSearchFields } from '../../../../../shared/components/page-search/searchFields';
import { usePageSessionState } from '../../../../../shared/hooks/usePageSessionState';
import { usePageSearchDefaults } from '../../../../../shared/hooks/usePageSearchDefaults';
import { createQuotationStatusColumns } from '../data/quotationStatusColumns';
import {
  cloneQuotationStatusSearchValues,
  isQuotationStatusSearchSession,
  toQuotationStatusFilters,
  validateQuotationStatusRange,
} from '../services/quotationStatus.service';
import type {
  QuotationStatusFilters,
  QuotationStatusSearchSession,
  QuotationStatusSearchValues,
} from '../types/quotationStatus.types';

const SESSION_KEY = 's-erp:page:quotation-status';
const SESSION_VERSION = 1;

export function useQuotationStatusSearch() {
  const detailFields = useMemo(
    () => toPageSearchFields(createQuotationStatusColumns()),
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
    usePageSessionState<QuotationStatusSearchSession | null>(
      SESSION_KEY,
      null,
      {
        version: SESSION_VERSION,
        validate: (value): value is QuotationStatusSearchSession | null =>
          value === null || isQuotationStatusSearchSession(value),
        persistWhen: (value) => value !== null,
      },
    );
  const [keyword, setKeyword] = useState(searchSession?.keyword ?? '');
  const [appliedKeyword, setAppliedKeyword] = useState(searchSession?.keyword ?? '');
  const [detailValues, setDetailValues] = useState<QuotationStatusSearchValues>(
    () => cloneQuotationStatusSearchValues(searchSession?.detailValues ?? {}),
  );
  const [appliedValues, setAppliedValues] = useState<QuotationStatusSearchValues | null>(
    () => searchSession?.detailValues ?? null,
  );
  const [searchError, setSearchError] = useState('');
  const appliedFilters = useMemo<QuotationStatusFilters | null>(
    () => appliedValues ? toQuotationStatusFilters(appliedValues, appliedKeyword) : null,
    [appliedValues, appliedKeyword],
  );

  useEffect(() => {
    if (!defaultValues) return;
    if (
      searchSession !== null
      && validateQuotationStatusRange(searchSession.detailValues) === ''
    ) return;
    const snapshot: QuotationStatusSearchSession = {
      keyword: '',
      detailValues: cloneQuotationStatusSearchValues(defaultValues),
    };
    setKeyword('');
    setAppliedKeyword('');
    setDetailValues(snapshot.detailValues);
    setAppliedValues(snapshot.detailValues);
    setSearchSession(snapshot);
  }, [defaultValues, searchSession, setSearchSession]);

  const applySearch = useCallback((values: QuotationStatusSearchValues = detailValues) => {
    const error = validateQuotationStatusRange(values);
    setSearchError(error);
    if (error) return false;
    const snapshot: QuotationStatusSearchSession = {
      keyword,
      detailValues: cloneQuotationStatusSearchValues(values),
    };
    setAppliedKeyword(keyword);
    setDetailValues(snapshot.detailValues);
    setAppliedValues(snapshot.detailValues);
    setSearchSession(snapshot);
    return true;
  }, [detailValues, keyword, setSearchSession]);

  const resetSearch = useCallback(() => {
    if (!defaultValues) return;
    const snapshot: QuotationStatusSearchSession = {
      keyword: '',
      detailValues: cloneQuotationStatusSearchValues(defaultValues),
    };
    setKeyword('');
    setAppliedKeyword('');
    setDetailValues(snapshot.detailValues);
    setAppliedValues(snapshot.detailValues);
    setSearchError('');
    setSearchSession(snapshot);
  }, [defaultValues, setSearchSession]);

  return {
    keyword,
    setKeyword,
    detailFields,
    detailValues,
    appliedDetailValues: searchSession?.detailValues ?? {},
    setDetailValues,
    defaultValues: searchSession === null ? (defaultValues ?? {}) : {},
    appliedFilters,
    defaultsInitialized: appliedFilters !== null,
    defaultsLoading,
    defaultsError,
    defaultsInitialLoad,
    retryDefaults,
    searchError,
    clearSearchError: () => setSearchError(''),
    applySearch,
    resetSearch,
  };
}
