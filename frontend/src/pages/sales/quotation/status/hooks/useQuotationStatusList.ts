import { useCallback, useEffect, useState } from 'react';
import { useInitialLoadState } from '../../../../../shared/hooks/useInitialLoadState';
import { searchQuotationStatus } from '../services/quotationStatus.service';
import type {
  QuotationStatusFilters,
  QuotationStatusRow,
} from '../types/quotationStatus.types';

export function useQuotationStatusList(filters: QuotationStatusFilters | null) {
  const [rows, setRows] = useState<QuotationStatusRow[]>([]);
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
    if (!filters) return;
    let active = true;
    void searchQuotationStatus(filters)
      .then((result) => {
        if (!active) return;
        setRows(result);
        setHasLoaded(true);
        succeed();
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        fail(loadError);
        setError(loadError instanceof Error ? loadError.message : '견적현황을 조회하지 못했습니다.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [fail, filters, retryRequest, start, succeed]);

  const clearError = useCallback(() => setError(''), []);
  const retry = useCallback(
    () => setRetryRequest((current) => ({ version: current.version + 1, quiet: false })),
    [],
  );
  const refreshQuietly = useCallback(
    () => setRetryRequest((current) => ({ version: current.version + 1, quiet: true })),
    [],
  );
  return { initialLoad, rows, loading, hasLoaded, error, clearError, retry, refreshQuietly };
}
