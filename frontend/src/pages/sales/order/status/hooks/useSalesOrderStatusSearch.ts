import { useCallback, useEffect, useMemo, useState } from 'react';
import { toPageSearchFields } from '../../../../../shared/components/page-search/searchFields';
import { usePageSessionState } from '../../../../../shared/hooks/usePageSessionState';
import { usePageSearchDefaults } from '../../../../../shared/hooks/usePageSearchDefaults';
import { createSalesOrderStatusColumns } from '../data/salesOrderStatusColumns';
import {
  cloneSalesOrderStatusSearchValues,
  isSalesOrderStatusSearchSession,
  readDashboardSalesSearch,
  toSalesOrderStatusFilters,
} from '../services/salesOrderStatus.service';
import type {
  SalesOrderStatusFilters,
  SalesOrderStatusSearchSession,
  SalesOrderStatusSearchValues,
} from '../types/salesOrderStatus.types';

const SALES_ORDER_STATUS_SESSION_KEY = 's-erp:page:sales-order-status';
const SALES_ORDER_STATUS_SESSION_VERSION = 1;

export function useSalesOrderStatusSearch() {
  const [dashboardSearch] = useState(() => readDashboardSalesSearch(window.location.search));
  const detailFields = useMemo(
    () => toPageSearchFields(createSalesOrderStatusColumns()),
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
    usePageSessionState<SalesOrderStatusSearchSession | null>(
      SALES_ORDER_STATUS_SESSION_KEY,
      dashboardSearch,
      {
        version: SALES_ORDER_STATUS_SESSION_VERSION,
        validate: (value): value is SalesOrderStatusSearchSession | null =>
          !dashboardSearch && (value === null || isSalesOrderStatusSearchSession(value)),
        persistWhen: (value) => value !== null,
      },
    );
  const initialSearch = dashboardSearch ?? searchSession;
  const [keyword, setKeyword] = useState(initialSearch?.keyword ?? '');
  const [detailValues, setDetailValues] = useState<SalesOrderStatusSearchValues>(
    () => cloneSalesOrderStatusSearchValues(initialSearch?.detailValues ?? {}),
  );
  const [appliedFilters, setAppliedFilters] = useState<SalesOrderStatusFilters | null>(
    () =>
      initialSearch
        ? toSalesOrderStatusFilters(initialSearch.keyword, initialSearch.detailValues)
        : null,
  );

  useEffect(() => {
    if (!defaultValues || searchSession !== null || dashboardSearch) return;
    const initialSnapshot: SalesOrderStatusSearchSession = {
      keyword: '',
      detailValues: cloneSalesOrderStatusSearchValues(defaultValues),
    };
    setKeyword(initialSnapshot.keyword);
    setDetailValues(initialSnapshot.detailValues);
    setSearchSession(initialSnapshot);
    setAppliedFilters(
      toSalesOrderStatusFilters(initialSnapshot.keyword, initialSnapshot.detailValues),
    );
  }, [defaultValues, searchSession, setSearchSession, dashboardSearch]);

  const applySearch = useCallback(
    (values: SalesOrderStatusSearchValues = detailValues) => {
      const snapshot: SalesOrderStatusSearchSession = {
        keyword,
        detailValues: cloneSalesOrderStatusSearchValues(values),
      };
      setSearchSession(snapshot);
      setAppliedFilters(toSalesOrderStatusFilters(snapshot.keyword, snapshot.detailValues));
    },
    [detailValues, keyword, setSearchSession],
  );

  const resetSearch = useCallback(() => {
    if (!defaultValues) return;
    const resetSnapshot: SalesOrderStatusSearchSession = {
      keyword: '',
      detailValues: cloneSalesOrderStatusSearchValues(defaultValues),
    };
    setKeyword('');
    setDetailValues(resetSnapshot.detailValues);
    setSearchSession(resetSnapshot);
    setAppliedFilters(
      toSalesOrderStatusFilters(resetSnapshot.keyword, resetSnapshot.detailValues),
    );
  }, [defaultValues, setSearchSession]);

  return {
    keyword,
    setKeyword,
    detailFields,
    detailValues,
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
