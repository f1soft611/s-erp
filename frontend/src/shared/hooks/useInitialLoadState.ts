import { useCallback, useMemo, useRef, useState } from 'react';
import { ApiNetworkError, ApiResponseError, isRequestAborted } from '../services/apiErrors';

export type PageLoadError = 'network' | 'authentication' | 'forbidden' | 'server';

export function toPageLoadError(cause: unknown): PageLoadError {
  return cause instanceof ApiNetworkError ? 'network'
    : cause instanceof ApiResponseError && cause.status === 401 ? 'authentication'
      : cause instanceof ApiResponseError && cause.status === 403 ? 'forbidden'
        : 'server';
}

/** networkOnly: 서버 연결 실패(network)일 때만 페이지 오류 화면을 표시하고, 그 외 오류는 기존 화면 내 메시지에 맡긴다. */
export function useInitialLoadState({ networkOnly = false }: { networkOnly?: boolean } = {}) {
  const hasSucceeded = useRef(false);
  const [error, setError] = useState<PageLoadError | null>(null);
  const [loading, setLoading] = useState(false);

  const start = useCallback(() => setLoading(true), []);
  const succeed = useCallback(() => {
    hasSucceeded.current = true;
    setError(null);
    setLoading(false);
  }, []);
  const fail = useCallback((cause: unknown) => {
    setLoading(false);
    if (hasSucceeded.current) return;
    if (isRequestAborted(cause)) return;
    const kind = toPageLoadError(cause);
    if (networkOnly && kind !== 'network') return;
    setError(kind);
  }, [networkOnly]);

  return useMemo(
    () => ({ error, loading, start, succeed, fail }),
    [error, loading, start, succeed, fail],
  );
}
