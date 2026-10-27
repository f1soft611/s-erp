import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PageLoadBoundary } from '../src/shared/components/PageLoadBoundary';
import { useInitialLoadState } from '../src/shared/hooks/useInitialLoadState';
import { ApiNetworkError, ApiResponseError } from '../src/shared/services/apiErrors';

describe('initial page load failures', () => {
  it('retains the failure while retrying and releases it after an empty successful load', () => {
    const { result } = renderHook(() => useInitialLoadState());
    act(() => result.current.start());
    act(() => result.current.fail(new ApiNetworkError()));
    expect(result.current.error).toBe('network');
    act(() => result.current.start());
    expect(result.current.error).toBe('network');
    expect(result.current.loading).toBe(true);
    act(() => result.current.succeed());
    expect(result.current.error).toBeNull();
    act(() => result.current.fail(new ApiResponseError('server', 500)));
    expect(result.current.error).toBeNull();
  });

  it('does not convert cancellation into an initial connection failure', () => {
    const { result } = renderHook(() => useInitialLoadState());
    act(() => result.current.start());
    act(() => result.current.fail(new DOMException('cancelled', 'AbortError')));
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('keeps independent required resources separate', () => {
    const { result } = renderHook(() => ({
      list: useInitialLoadState(),
      options: useInitialLoadState(),
    }));
    act(() => {
      result.current.options.fail(new ApiNetworkError());
      result.current.list.succeed();
    });
    expect(result.current.options.error).toBe('network');
    expect(result.current.list.error).toBeNull();
  });

  it.each([
    [new ApiNetworkError(), '네트워크 상태를 확인'],
    [new ApiResponseError('private server detail', 500), '잠시 후 다시 시도'],
    [new ApiResponseError('expired', 401), '다시 로그인'],
    [new ApiResponseError('denied', 403), '조회 권한이 없습니다'],
  ])('shows a safe, specific failure and a working retry', (cause, expected) => {
    const retry = vi.fn();
    const { result } = renderHook(() => useInitialLoadState());
    act(() => result.current.fail(cause));
    const view = render(
      <PageLoadBoundary {...result.current} label="목록" onRetry={retry}>
        <div>normal layout</div>
      </PageLoadBoundary>,
    );
    expect(screen.queryByText('normal layout')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(expected);
    expect(screen.queryByText('private server detail')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '목록 다시 불러오기' }));
    expect(retry).toHaveBeenCalledTimes(1);
    act(() => result.current.start());
    view.rerender(
      <PageLoadBoundary {...result.current} label="목록" onRetry={retry}>
        <div>normal layout</div>
      </PageLoadBoundary>,
    );
    expect(screen.getByRole('button', { name: '목록 다시 불러오기' })).toBeDisabled();
    act(() => result.current.succeed());
    view.rerender(
      <PageLoadBoundary {...result.current} label="목록" onRetry={retry}>
        <div>normal layout</div>
      </PageLoadBoundary>,
    );
    expect(screen.getByText('normal layout')).toBeInTheDocument();
  });
});
