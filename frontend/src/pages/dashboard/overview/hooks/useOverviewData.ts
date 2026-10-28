import { useCallback, useEffect, useState } from 'react';
import { fetchDashboardOverview, fetchDashboardSales } from '../services/overview.service';
import type { DashboardOverview, DashboardSales } from '../types/overview';

export function useOverviewData() {
  const [overviewVersion, setOverviewVersion] = useState(0);
  const [overviewResult, setOverviewResult] = useState<{
    version: number; data: DashboardOverview | null; error: boolean;
  }>({ version: -1, data: null, error: false });
  const [month, setMonth] = useState('');
  const [salesVersion, setSalesVersion] = useState(0);
  const [salesResult, setSalesResult] = useState<{
    source: DashboardOverview | null; month: string; version: number;
    data: DashboardSales | null; error: boolean;
  }>({ source: null, month: '', version: -1, data: null, error: false });
  const overviewLoading = overviewResult.version !== overviewVersion;
  const overview = overviewLoading ? null : overviewResult.data;
  const overviewError = !overviewLoading && overviewResult.error;
  const selectedMonth = month || overview?.asOfDate.slice(0, 7) || '';
  const isCurrentSales = salesResult.source === overview
    && salesResult.month === selectedMonth && salesResult.version === salesVersion;
  const sales = isCurrentSales ? salesResult.data : null;
  const salesError = isCurrentSales && salesResult.error;

  useEffect(() => {
    const request = new AbortController();
    void fetchDashboardOverview(request.signal)
      .then((result) => {
        if (!request.signal.aborted) setOverviewResult({ version: overviewVersion, data: result, error: false });
      })
      .catch(() => {
        if (!request.signal.aborted) setOverviewResult({ version: overviewVersion, data: null, error: true });
      });
    return () => request.abort();
  }, [overviewVersion]);

  useEffect(() => {
    const request = new AbortController();
    if (!overview?.canReadSales || !selectedMonth) {
      return () => request.abort();
    }
    void fetchDashboardSales(selectedMonth, request.signal)
      .then((result) => {
        if (!request.signal.aborted) setSalesResult({
          source: overview, month: selectedMonth, version: salesVersion, data: result, error: false,
        });
      })
      .catch(() => {
        if (!request.signal.aborted) setSalesResult({
          source: overview, month: selectedMonth, version: salesVersion, data: null, error: true,
        });
      });
    return () => request.abort();
  }, [overview, selectedMonth, salesVersion]);

  const refresh = useCallback(() => setOverviewVersion((v) => v + 1), []);
  const retrySales = useCallback(() => setSalesVersion((v) => v + 1), []);
  return {
    overview, overviewLoading, overviewError, refresh,
    month: selectedMonth, setMonth, sales: sales?.month === selectedMonth ? sales : null,
    salesLoading: Boolean(overview?.canReadSales && !isCurrentSales),
    salesError, retrySales,
  };
}
