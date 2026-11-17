import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useServerDateDefault } from '../src/shared/hooks/useServerDateDefault';
import { getSystemDate } from '../src/shared/services/systemDateService';

vi.mock('../src/shared/services/systemDateService', () => ({ getSystemDate: vi.fn() }));
const getSystemDateMock = vi.mocked(getSystemDate);

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe('useServerDateDefault', () => {
  beforeEach(() => vi.clearAllMocks());

  it('passes the server date once when enabled and never uses the browser clock', async () => {
    getSystemDateMock.mockResolvedValue('2031-02-03');
    const onDate = vi.fn();
    const onError = vi.fn();
    renderHook(() => useServerDateDefault({ enabled: true, onDate, onError }));
    await waitFor(() => expect(onDate).toHaveBeenCalledWith('2031-02-03'));
    expect(onDate).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it('does not call the server when disabled (saved documents keep their own date)', async () => {
    const onDate = vi.fn();
    renderHook(() => useServerDateDefault({ enabled: false, onDate, onError: vi.fn() }));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(getSystemDateMock).not.toHaveBeenCalled();
    expect(onDate).not.toHaveBeenCalled();
  });

  it('reports a failure without filling in any date', async () => {
    getSystemDateMock.mockRejectedValue(new Error('서버 오류'));
    const onDate = vi.fn();
    const onError = vi.fn();
    renderHook(() => useServerDateDefault({ enabled: true, onDate, onError }));
    await waitFor(() => expect(onError).toHaveBeenCalledWith('서버 기준일을 불러오지 못했습니다. 서버 오류'));
    expect(onDate).not.toHaveBeenCalled();
  });

  it('ignores a late server date after the user changed the date', async () => {
    const pending = deferred<string>();
    getSystemDateMock.mockReturnValue(pending.promise);
    const onDate = vi.fn();
    const { result } = renderHook(() => useServerDateDefault({ enabled: true, onDate, onError: vi.fn() }));
    act(() => result.current.markTouched());
    await act(async () => { pending.resolve('2031-02-03'); await pending.promise; });
    expect(onDate).not.toHaveBeenCalled();
  });

  it('reload fetches the server date again even after the user typed one', async () => {
    getSystemDateMock.mockResolvedValueOnce('2031-02-03').mockResolvedValueOnce('2031-02-04');
    const onDate = vi.fn();
    const { result } = renderHook(() => useServerDateDefault({ enabled: true, onDate, onError: vi.fn() }));
    await waitFor(() => expect(onDate).toHaveBeenCalledTimes(1));
    act(() => result.current.markTouched());
    await act(async () => { await result.current.reload(); });
    expect(onDate).toHaveBeenLastCalledWith('2031-02-04');
    expect(onDate).toHaveBeenCalledTimes(2);
  });

  it('reload reports a failure through onError only', async () => {
    getSystemDateMock.mockResolvedValueOnce('2031-02-03').mockRejectedValueOnce(new Error('끊김'));
    const onDate = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() => useServerDateDefault({ enabled: true, onDate, onError }));
    await waitFor(() => expect(onDate).toHaveBeenCalledTimes(1));
    await act(async () => { await result.current.reload(); });
    expect(onError).toHaveBeenCalledWith('서버 기준일을 불러오지 못했습니다. 끊김');
    expect(onDate).toHaveBeenCalledTimes(1);
  });

  it('drops a response that arrives after unmount', async () => {
    const pending = deferred<string>();
    getSystemDateMock.mockReturnValue(pending.promise);
    const onDate = vi.fn();
    const { unmount } = renderHook(() => useServerDateDefault({ enabled: true, onDate, onError: vi.fn() }));
    unmount();
    await act(async () => { pending.resolve('2031-02-03'); await pending.promise; });
    expect(onDate).not.toHaveBeenCalled();
  });

  it('uses the latest callbacks without refetching when they change', async () => {
    getSystemDateMock.mockResolvedValue('2031-02-03');
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ onDate }) => useServerDateDefault({ enabled: true, onDate, onError: vi.fn() }),
      { initialProps: { onDate: first } });
    rerender({ onDate: second });
    await waitFor(() => expect(second).toHaveBeenCalledWith('2031-02-03'));
    expect(first).not.toHaveBeenCalled();
    expect(getSystemDateMock).toHaveBeenCalledTimes(1);
  });
});
