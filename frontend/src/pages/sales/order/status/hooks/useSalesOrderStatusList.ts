import { useCallback, useEffect, useRef, useState } from 'react';
import { useInitialLoadState } from '../../../../../shared/hooks/useInitialLoadState';
import { searchSalesOrderStatus } from '../services/salesOrderStatus.service';
import type {
  SalesOrderStatusFilters,
  SalesOrderStatusRow,
} from '../types/salesOrderStatus.types';

export function useSalesOrderStatusList(filters: SalesOrderStatusFilters | null) {
  const [rows, setRows] = useState<SalesOrderStatusRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState('');
  const [retryRequest, setRetryRequest] = useState({ version: 0, quiet: false });
  const previousRetryVersion = useRef(0);
  const { start, succeed, fail, ...initialLoad } = useInitialLoadState();

  useEffect(() => {
    if (!filters) return;
    let cancelled = false;
    const isQuietReload =
      retryRequest.quiet && retryRequest.version !== previousRetryVersion.current;
    previousRetryVersion.current = retryRequest.version;
    start();
    setHasLoaded(false);
    if (!isQuietReload) setLoading(true);
    setError('');
    void searchSalesOrderStatus(filters)
      .then((result) => {
        if (!cancelled) {
          setRows(result);
          setHasLoaded(true);
          succeed();
        }
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        fail(loadError);
        setError(
          loadError instanceof Error ? loadError.message : '수주현황을 조회하지 못했습니다.',
        );
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
  /** 그리드 로딩 표시 없이 현재 조건으로 재조회(수정·삭제 후 갱신용) */
  const refreshQuietly = useCallback(
    () => setRetryRequest((current) => ({ version: current.version + 1, quiet: true })),
    [],
  );

  return { initialLoad, rows, loading, hasLoaded, error, clearError, retry, refreshQuietly };
}
