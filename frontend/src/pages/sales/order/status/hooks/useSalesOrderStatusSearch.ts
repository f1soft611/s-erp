import { useCallback, useEffect, useMemo, useState } from 'react';
import { toPageSearchFields } from '../../../../../shared/components/page-search/searchFields';
import { usePageSessionState } from '../../../../../shared/hooks/usePageSessionState';
import { usePageSearchDefaults } from '../../../../../shared/hooks/usePageSearchDefaults';
import { createSalesOrderStatusColumns } from '../data/salesOrderStatusColumns';
import { useSalesOrderCommonCodes } from '../../hooks/useSalesOrderCommonCodes';
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
  const {
    codes: commonCodes,
    loading: commonCodesLoading,
    error: commonCodesError,
    retry: retryCommonCodes,
  } = useSalesOrderCommonCodes();
  const [dashboardSearch] = useState(() => readDashboardSalesSearch(window.location.search));
  const detailFields = useMemo(
    () =>
      toPageSearchFields(
        createSalesOrderStatusColumns({
          orderStatusOptions: commonCodes.orderStatusOptions,
          progressStatusOptions: commonCodes.progressStatusOptions,
          deliveryMethodOptions: commonCodes.deliveryMethodOptions,
        }),
      ),
    [commonCodes.deliveryMethodOptions, commonCodes.orderStatusOptions, commonCodes.progressStatusOptions],
  );
  const {
    values: defaultValues,
    loading: defaultsLoading,
    error: defaultsError,
    retry: retryDefaults,
    initialLoad: defaultsInitialLoad,
  } = usePageSearchDefaults(detailFields, !commonCodesLoading && !commonCodesError);
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
  const retryDefaultsWithCodes = useCallback(() => {
    retryCommonCodes();
    retryDefaults();
  }, [retryCommonCodes, retryDefaults]);
  const codeMissingError =
    !commonCodesLoading &&
    !commonCodesError &&
    commonCodes.progressStatusOptions.length === 0
      ? '수주 상태 공통코드가 등록되지 않았습니다. 공통코드 등록 후 다시 불러와 주세요.'
      : null;

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
    defaultsLoading: defaultsLoading || commonCodesLoading,
    defaultsError: commonCodesError ?? codeMissingError ?? defaultsError,
    defaultsInitialLoad,
    retryDefaults: retryDefaultsWithCodes,
    commonCodes,
    commonCodesError,
    codeMissingError,
    applySearch,
    resetSearch,
  };
}
