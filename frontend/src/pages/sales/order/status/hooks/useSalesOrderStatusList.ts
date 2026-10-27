import { useCallback, useEffect, useState } from 'react';
import { useInitialLoadState } from '../../../../../shared/hooks/useInitialLoadState';
import { searchSalesOrderStatus } from '../services/salesOrderStatus.service';
import type {
  SalesOrderStatusFilters,
  SalesOrderStatusRow,
} from '../types/salesOrderStatus.types';

export function useSalesOrderStatusList(filters: SalesOrderStatusFilters | null) {
  const [rows, setRows] = useState<SalesOrderStatusRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryToken, setRetryToken] = useState(0);
  const { start, succeed, fail, ...initialLoad } = useInitialLoadState();

  useEffect(() => {
    if (!filters) return;
    let cancelled = false;
    start();
    setLoading(true);
    setError('');
    void searchSalesOrderStatus(filters)
      .then((result) => {
        if (!cancelled) {
          setRows(result);
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
  }, [filters, retryToken, start, succeed, fail]);

  const clearError = useCallback(() => setError(''), []);
  const retry = useCallback(() => setRetryToken((current) => current + 1), []);

  return { initialLoad, rows, loading, error, clearError, retry };
}
