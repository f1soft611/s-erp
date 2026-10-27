import { useCallback, useEffect, useMemo, useState } from 'react';
import { toPageSearchFields } from '../../../../../shared/components/page-search/searchFields';
import { usePageSearchDefaults } from '../../../../../shared/hooks/usePageSearchDefaults';
import { createSalesOrderStatusColumns } from '../data/salesOrderStatusColumns';
import { toSalesOrderStatusFilters } from '../services/salesOrderStatus.service';
import type {
  SalesOrderStatusFilters,
  SalesOrderStatusSearchValues,
} from '../types/salesOrderStatus.types';

export function useSalesOrderStatusSearch() {
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
  const [keyword, setKeyword] = useState('');
  const [detailValues, setDetailValues] = useState<SalesOrderStatusSearchValues>({});
  const [appliedFilters, setAppliedFilters] = useState<SalesOrderStatusFilters | null>(null);

  useEffect(() => {
    if (!defaultValues) return;
    setDetailValues({ ...defaultValues });
    setAppliedFilters(toSalesOrderStatusFilters('', defaultValues));
  }, [defaultValues]);

  const applySearch = useCallback(
    (values: SalesOrderStatusSearchValues = detailValues) => {
      setAppliedFilters(toSalesOrderStatusFilters(keyword, values));
    },
    [detailValues, keyword],
  );

  const resetSearch = useCallback(() => {
    if (!defaultValues) return;
    setKeyword('');
    setDetailValues({ ...defaultValues });
    setAppliedFilters(toSalesOrderStatusFilters('', defaultValues));
  }, [defaultValues]);

  return {
    keyword,
    setKeyword,
    detailFields,
    detailValues,
    setDetailValues,
    defaultValues: defaultValues ?? {},
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
