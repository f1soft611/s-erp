import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchOrderHistory } from '../services/order.service';
import type { OrderHistoryFilters, OrderHistoryRow } from '../types/order.types';

function messageOf(cause: unknown, fallback: string): string {
  return cause instanceof Error && cause.message ? cause.message : fallback;
}

/** 처리 내역 탭의 조회. 필터를 바꾸거나 refreshToken이 바뀌면 다시 조회한다(처리 직후 갱신용). */
export function useOrderHistory(initialFilters: OrderHistoryFilters, refreshToken: number) {
  const [filters, setFilters] = useState<OrderHistoryFilters>(initialFilters);
  const [rows, setRows] = useState<OrderHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const version = useRef(0);

  useEffect(() => {
    const current = ++version.current;
    const load = async () => {
      setLoading(true);
      try {
        const loaded = await fetchOrderHistory(filters);
        if (current !== version.current) return;
        setRows(loaded);
        setError('');
      } catch (cause) {
        if (current !== version.current) return;
        setRows([]);
        setError(messageOf(cause, '처리 내역을 불러오지 못했습니다.'));
      } finally {
        if (current === version.current) setLoading(false);
      }
    };
    void load();
    return () => { version.current += 1; };
  }, [filters, refreshToken]);

  const apply = useCallback((next: OrderHistoryFilters) => setFilters({ ...next }), []);

  return { filters, rows, loading, error, setError, apply };
}
