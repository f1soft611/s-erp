import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMocks = vi.hoisted(() => ({
  apiDelete: vi.fn(),
  apiDownload: vi.fn(),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPostFormData: vi.fn(),
  apiPut: vi.fn(),
}));

const commonCodeMocks = vi.hoisted(() => ({
  fetchCommonCodeGroups: vi.fn(),
  fetchCommonCodeItems: vi.fn(),
}));

vi.mock('../src/shared/services/apiClient', () => apiMocks);
vi.mock(
  '../src/pages/co/master/common-code/services/commonCodeManagement.service',
  () => commonCodeMocks,
);

import {
  createArchivePost,
  deleteArchiveAttachment,
  deleteArchivePost,
  downloadArchiveAttachment,
  fetchArchivePostDetail,
  fetchArchivePosts,
  updateArchivePost,
  uploadArchiveAttachment,
} from '../src/pages/groupware/community/archive/services/archiveBoardService';
import { useArchiveCategories } from '../src/pages/groupware/community/archive/hooks/useArchiveCategories';
import { useArchiveList } from '../src/pages/groupware/community/archive/hooks/useArchiveList';
import type { ArchivePost } from '../src/pages/groupware/community/archive/types/archive.types';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('archive board service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('serializes list pagination and optional search and category filters', async () => {
    apiMocks.apiGet.mockResolvedValue({
      resultList: [{ postId: 7, title: 'Travel policy' }],
      resultCnt: 21,
    });
    await expect(
      fetchArchivePosts(2, 10, 'travel policy', 'GUIDE'),
    ).resolves.toEqual({
      resultList: [{ postId: 7, title: 'Travel policy' }],
      resultCnt: 21,
    });
    expect(apiMocks.apiGet).toHaveBeenCalledWith(
      '/api/v1/groupware/boards/archive/posts?pageIndex=2&pageUnit=10&keyword=travel+policy&categoryCode=GUIDE',
    );
  });

  it('preserves searchable content and attachment count in typed list rows', async () => {
    const post: ArchivePost = {
      postId: 8,
      title: 'Guide',
      contents: 'Description',
      contentsText: 'Description',
      categoryCode: 'GUIDE',
      attachmentCount: 2,
    };
    apiMocks.apiGet.mockResolvedValue({ resultList: [post], resultCnt: 1 });

    await expect(fetchArchivePosts(1, 20)).resolves.toEqual({
      resultList: [post],
      resultCnt: 1,
    });
  });

  it('omits empty optional list filters and normalizes missing ResultVO fields', async () => {
    apiMocks.apiGet.mockResolvedValue({});

    await expect(fetchArchivePosts(1, 20, '  ', '')).resolves.toEqual({
      resultList: [],
      resultCnt: 0,
    });
    expect(apiMocks.apiGet).toHaveBeenCalledWith(
      '/api/v1/groupware/boards/archive/posts?pageIndex=1&pageUnit=20',
    );
  });

  it('preserves list request errors', async () => {
    const failure = new Error('network failed');
    apiMocks.apiGet.mockRejectedValue(failure);

    await expect(fetchArchivePosts(1, 20, '')).rejects.toBe(failure);
  });

  it('uses the detail, create, update, and delete archive endpoints', async () => {
    const payload = {
      title: 'Guide',
      contents: 'Plain text description',
      categoryCode: 'GUIDE',
    };
    apiMocks.apiGet.mockResolvedValue({ item: { postId: 9, ...payload } });
    apiMocks.apiPost.mockResolvedValue({ item: { postId: 10, ...payload } });
    apiMocks.apiPut.mockResolvedValue({ item: { postId: 9, ...payload } });
    apiMocks.apiDelete.mockResolvedValue(undefined);

    await expect(fetchArchivePostDetail(9)).resolves.toEqual({
      postId: 9,
      ...payload,
    });
    await createArchivePost(payload);
    await updateArchivePost(9, payload);
    await deleteArchivePost(9);

    expect(apiMocks.apiGet).toHaveBeenCalledWith(
      '/api/v1/groupware/boards/archive/posts/9',
    );
    expect(apiMocks.apiPost).toHaveBeenCalledWith(
      '/api/v1/groupware/boards/archive/posts',
      payload,
    );
    expect(apiMocks.apiPut).toHaveBeenCalledWith(
      '/api/v1/groupware/boards/archive/posts/9',
      payload,
    );
    expect(apiMocks.apiDelete).toHaveBeenCalledWith(
      '/api/v1/groupware/boards/archive/posts/9',
    );
  });

  it('uploads one file as multipart field file', async () => {
    const file = new File(['archive data'], 'guide.pdf', {
      type: 'application/pdf',
    });
    apiMocks.apiPostFormData.mockResolvedValue({ item: { boardFileId: 4 } });

    await expect(uploadArchiveAttachment(9, file)).resolves.toEqual({
      boardFileId: 4,
    });

    const [path, body] = apiMocks.apiPostFormData.mock.calls[0] as [
      string,
      FormData,
    ];
    expect(path).toBe(
      '/api/v1/groupware/boards/archive/posts/9/attachments',
    );
    expect(body.get('file')).toBe(file);
    expect(Array.from(body.keys())).toEqual(['file']);
  });

  it('passes post ownership parameters to attachment removal and download', async () => {
    apiMocks.apiDelete.mockResolvedValue(undefined);
    apiMocks.apiDownload.mockResolvedValue(undefined);
    const attachment = { boardFileId: 12, postId: 9, fileName: 'guide.pdf' };

    await deleteArchiveAttachment(12, 9);
    await downloadArchiveAttachment(attachment);

    expect(apiMocks.apiDelete).toHaveBeenCalledWith(
      '/api/v1/groupware/boards/archive/attachments/12?postId=9',
    );
    expect(apiMocks.apiDownload).toHaveBeenCalledWith(
      '/api/v1/groupware/boards/archive/attachments/12/download?postId=9',
      'guide.pdf',
    );
  });
});

describe('archive categories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads active categories in API order from the archive category group', async () => {
    commonCodeMocks.fetchCommonCodeGroups.mockResolvedValue([
      { id: '5', groupCode: 'WF_ARCHIVE_CATEGORY', useAt: 'Y' },
    ]);
    commonCodeMocks.fetchCommonCodeItems.mockResolvedValue([
      {
        itemCode: 'POLICY',
        itemNm: 'Policies',
        useAt: 'Y',
      },
      {
        itemCode: 'OLD',
        itemNm: 'Retired',
        useAt: 'N',
      },
      {
        itemCode: 'GUIDE',
        itemNm: 'Guides',
        useAt: 'Y',
      },
    ]);

    const { result } = renderHook(() => useArchiveCategories());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(commonCodeMocks.fetchCommonCodeGroups).toHaveBeenCalledWith({
      groupCode: 'WF_ARCHIVE_CATEGORY',
    });
    expect(commonCodeMocks.fetchCommonCodeItems).toHaveBeenCalledWith('5');
    expect(result.current.categories).toEqual([
      { code: 'POLICY', name: 'Policies' },
      { code: 'GUIDE', name: 'Guides' },
    ]);
    expect(result.current.error).toBeNull();
  });

  it('surfaces a missing or inactive archive category group', async () => {
    commonCodeMocks.fetchCommonCodeGroups.mockResolvedValue([
      { id: '5', groupCode: 'WF_ARCHIVE_CATEGORY', useAt: 'N' },
    ]);

    const { result } = renderHook(() => useArchiveCategories());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(commonCodeMocks.fetchCommonCodeItems).not.toHaveBeenCalled();
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.categories).toEqual([]);
  });

  it('surfaces an unavailable archive category group', async () => {
    commonCodeMocks.fetchCommonCodeGroups.mockResolvedValue([]);

    const { result } = renderHook(() => useArchiveCategories());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(commonCodeMocks.fetchCommonCodeItems).not.toHaveBeenCalled();
    expect(result.current.error?.message).toMatch('WF_ARCHIVE_CATEGORY');
  });

  it('surfaces common-code request failures and supports retry', async () => {
    const failure = new Error('category service unavailable');
    commonCodeMocks.fetchCommonCodeGroups
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce([
        { id: '5', groupCode: 'WF_ARCHIVE_CATEGORY', useAt: 'Y' },
      ]);
    commonCodeMocks.fetchCommonCodeItems.mockResolvedValue([]);

    const { result } = renderHook(() => useArchiveCategories());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe(failure);

    await act(async () => result.current.loadCategories());
    expect(result.current.error).toBeNull();
  });

  it('does not let stale category success overwrite a newer load', async () => {
    const olderGroups = deferred<
      Array<{ id: string; groupCode: string; useAt: string }>
    >();
    commonCodeMocks.fetchCommonCodeGroups
      .mockReturnValueOnce(olderGroups.promise)
      .mockResolvedValueOnce([
        { id: 'new', groupCode: 'WF_ARCHIVE_CATEGORY', useAt: 'Y' },
      ]);
    commonCodeMocks.fetchCommonCodeItems
      .mockResolvedValueOnce([
        { itemCode: 'NEW', itemNm: 'New category', useAt: 'Y' },
      ])
      .mockResolvedValueOnce([
        { itemCode: 'OLD', itemNm: 'Old category', useAt: 'Y' },
      ]);

    const { result } = renderHook(() => useArchiveCategories());
    await waitFor(() =>
      expect(commonCodeMocks.fetchCommonCodeGroups).toHaveBeenCalledTimes(1),
    );
    act(() => {
      void result.current.loadCategories();
    });
    await waitFor(() =>
      expect(result.current.categories).toEqual([
        { code: 'NEW', name: 'New category' },
      ]),
    );

    await act(async () => {
      olderGroups.resolve([
        { id: 'old', groupCode: 'WF_ARCHIVE_CATEGORY', useAt: 'Y' },
      ]);
      await olderGroups.promise;
    });
    await waitFor(() =>
      expect(commonCodeMocks.fetchCommonCodeItems).toHaveBeenCalledTimes(2),
    );

    expect(result.current.categories).toEqual([
      { code: 'NEW', name: 'New category' },
    ]);
  });

  it('ignores stale category failures and loading updates while a newer load is pending', async () => {
    const olderGroups = deferred<
      Array<{ id: string; groupCode: string; useAt: string }>
    >();
    const newerGroups = deferred<
      Array<{ id: string; groupCode: string; useAt: string }>
    >();
    commonCodeMocks.fetchCommonCodeGroups
      .mockReturnValueOnce(olderGroups.promise)
      .mockReturnValueOnce(newerGroups.promise);

    const { result } = renderHook(() => useArchiveCategories());
    await waitFor(() =>
      expect(commonCodeMocks.fetchCommonCodeGroups).toHaveBeenCalledTimes(1),
    );
    act(() => {
      void result.current.loadCategories();
    });
    await waitFor(() =>
      expect(commonCodeMocks.fetchCommonCodeGroups).toHaveBeenCalledTimes(2),
    );

    await act(async () => {
      olderGroups.reject(new Error('stale category failure'));
      await olderGroups.promise.catch(() => undefined);
    });
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      newerGroups.resolve([
        { id: 'new', groupCode: 'WF_ARCHIVE_CATEGORY', useAt: 'Y' },
      ]);
      await newerGroups.promise;
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });
});

describe('archive list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.apiGet.mockResolvedValue({ resultList: [], resultCnt: 0 });
  });

  it('loads server filters and resets pagination when search or category changes', async () => {
    const { result } = renderHook(() => useArchiveList({ pageUnit: 10 }));
    await waitFor(() =>
      expect(apiMocks.apiGet).toHaveBeenLastCalledWith(
        '/api/v1/groupware/boards/archive/posts?pageIndex=1&pageUnit=10',
      ),
    );

    act(() => result.current.setPageIndex(4));
    await waitFor(() =>
      expect(apiMocks.apiGet).toHaveBeenLastCalledWith(
        '/api/v1/groupware/boards/archive/posts?pageIndex=4&pageUnit=10',
      ),
    );

    act(() => result.current.setKeyword('  policy  '));
    await waitFor(() =>
      expect(apiMocks.apiGet).toHaveBeenLastCalledWith(
        '/api/v1/groupware/boards/archive/posts?pageIndex=1&pageUnit=10&keyword=policy',
      ),
    );

    act(() => result.current.setCategoryCode('GUIDE'));
    await waitFor(() =>
      expect(apiMocks.apiGet).toHaveBeenLastCalledWith(
        '/api/v1/groupware/boards/archive/posts?pageIndex=1&pageUnit=10&keyword=policy&categoryCode=GUIDE',
      ),
    );
  });

  it('exposes list load errors instead of reporting an empty success', async () => {
    const failure = new Error('archive list unavailable');
    apiMocks.apiGet.mockRejectedValue(failure);

    const { result } = renderHook(() => useArchiveList());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe(failure);
  });

  it('does not let an older filter response overwrite the current list', async () => {
    let resolveOlder!: (value: {
      resultList: Array<{ postId: number; title: string }>;
      resultCnt: number;
    }) => void;
    const olderResponse = new Promise<{
      resultList: Array<{ postId: number; title: string }>;
      resultCnt: number;
    }>((resolve) => {
      resolveOlder = resolve;
    });
    apiMocks.apiGet
      .mockReturnValueOnce(olderResponse)
      .mockResolvedValueOnce({
        resultList: [{ postId: 2, title: 'Current filter' }],
        resultCnt: 1,
      });

    const { result } = renderHook(() => useArchiveList());
    await waitFor(() => expect(apiMocks.apiGet).toHaveBeenCalledTimes(1));

    act(() => result.current.setKeyword('current'));
    await waitFor(() => expect(apiMocks.apiGet).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(result.current.posts).toEqual([
        { postId: 2, title: 'Current filter' },
      ]),
    );

    await act(async () => {
      resolveOlder({
        resultList: [{ postId: 1, title: 'Stale filter' }],
        resultCnt: 1,
      });
      await olderResponse;
    });

    expect(result.current.posts).toEqual([
      { postId: 2, title: 'Current filter' },
    ]);
  });
});
