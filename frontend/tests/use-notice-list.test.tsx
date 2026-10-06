import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const serviceMocks = vi.hoisted(() => ({
  fetchNoticePosts: vi.fn(),
  fetchPinnedNoticePosts: vi.fn(),
}));

vi.mock(
  '../src/pages/groupware/community/notice/services/noticeBoardService',
  () => serviceMocks,
);

import { useNoticeList } from '../src/pages/groupware/community/notice/hooks/useNoticeList';

describe('useNoticeList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.fetchNoticePosts.mockResolvedValue({
      resultList: [{ postId: 3 }],
      resultCnt: 1,
    });
    serviceMocks.fetchPinnedNoticePosts.mockResolvedValue({
      resultList: [{ postId: 2 }],
      resultCnt: 4,
    });
  });

  it('loads pinned and regular posts using the active category filter', async () => {
    const { result } = renderHook(() =>
      useNoticeList({ selectedNoticeFilter: 'OPS' }),
    );

    await act(async () => {
      await result.current.loadNoticePosts();
    });

    await waitFor(() => expect(result.current.isInitialLoading).toBe(false));
    expect(serviceMocks.fetchNoticePosts).toHaveBeenCalledWith(
      1,
      20,
      '',
      'OPS',
    );
    expect(serviceMocks.fetchPinnedNoticePosts).toHaveBeenCalledWith(
      1,
      20,
      '',
      'OPS',
    );
    expect(result.current.noticeItems.map((item) => item.id)).toEqual([3]);
    expect(result.current.pinnedNoticeItems.map((item) => item.id)).toEqual([
      2,
    ]);
    expect(result.current.pinnedNoticeCount).toBe(4);
    expect(result.current.serverItemRevision).toBe(1);
  });
});
