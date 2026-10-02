import { useCallback, useState } from 'react';
import {
  fetchNoticePosts,
  fetchPinnedNoticePosts,
} from '../services/noticeBoardService';
import type { NoticeBoardPostApi } from '../types/community.types';
import type { NoticeFeedItem } from '../types/community.types';
import { mapNoticePost } from '../data/noticePostAdapter';

type UseNoticeListOptions = {
  selectedNoticeFilter: string;
  noticeGubunNamesRef?: { current: Map<string, string> };
};

const noticeFailureMessage =
  '공지사항 목록을 불러오지 못했습니다.\n잠시 후 다시 시도해 주세요.';

function normalizeNoticeListResponse(
  response:
    | NoticeBoardPostApi[]
    | { resultList?: NoticeBoardPostApi[]; resultCnt?: number }
    | null
    | undefined,
) {
  if (Array.isArray(response)) {
    return { resultList: response, resultCnt: response.length };
  }
  return {
    resultList: response?.resultList ?? [],
    resultCnt: Number(response?.resultCnt ?? 0) || 0,
  };
}

export function useNoticeList({
  selectedNoticeFilter,
  noticeGubunNamesRef,
}: UseNoticeListOptions) {
  const [noticeItems, setNoticeItems] = useState<NoticeFeedItem[]>([]);
  const [pinnedNoticeItems, setPinnedNoticeItems] = useState<NoticeFeedItem[]>(
    [],
  );
  const [pinnedNoticeCount, setPinnedNoticeCount] = useState(0);
  const [noticePage, setNoticePage] = useState(1);
  const [noticeHasMore, setNoticeHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [serverItemRevision, setServerItemRevision] = useState(0);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mapPost = useCallback(
    (post: NoticeBoardPostApi) =>
      mapNoticePost(post, noticeGubunNamesRef?.current),
    [noticeGubunNamesRef],
  );

  const loadNoticePosts = useCallback(
    async ({
      silent = false,
      quiet = false,
    }: { silent?: boolean; quiet?: boolean } = {}) => {
      if (silent && !quiet) {
        setIsRefreshing(true);
      } else if (!silent) {
        setIsInitialLoading(true);
      }
      setErrorMessage(null);

      try {
        const [postsResponse, pinnedPostsResponse] = await Promise.all([
          fetchNoticePosts(1, 20, '', selectedNoticeFilter || undefined),
          typeof fetchPinnedNoticePosts === 'function'
            ? fetchPinnedNoticePosts(
                1,
                20,
                '',
                selectedNoticeFilter || undefined,
              )
            : Promise.resolve(undefined),
        ]);
        const posts = normalizeNoticeListResponse(postsResponse);
        const pinnedPosts = normalizeNoticeListResponse(pinnedPostsResponse);
        setNoticeItems(posts.resultList.map(mapPost));
        setPinnedNoticeItems(pinnedPosts.resultList.map(mapPost));
        setPinnedNoticeCount(pinnedPosts.resultCnt);
        setNoticePage(1);
        setNoticeHasMore(posts.resultList.length < posts.resultCnt);
        setServerItemRevision((revision) => revision + 1);
      } catch {
        setErrorMessage(noticeFailureMessage);
        if (!silent) setNoticeItems([]);
      } finally {
        if (silent && !quiet) {
          setIsRefreshing(false);
        } else if (!silent) {
          setIsInitialLoading(false);
        }
      }
    },
    [mapPost, selectedNoticeFilter],
  );

  const loadMoreNoticePosts = useCallback(async () => {
    if (isLoadingMore || !noticeHasMore || isInitialLoading) return;

    setIsLoadingMore(true);
    try {
      const nextPage = noticePage + 1;
      const response = await fetchNoticePosts(
        nextPage,
        20,
        '',
        selectedNoticeFilter || undefined,
      );
      const result = normalizeNoticeListResponse(response);
      setNoticeItems((current) => [
        ...current,
        ...result.resultList.map(mapPost),
      ]);
      setNoticePage(nextPage);
      setNoticeHasMore(
        noticeItems.length + result.resultList.length < result.resultCnt,
      );
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    isInitialLoading,
    isLoadingMore,
    mapPost,
    noticeHasMore,
    noticeItems.length,
    noticePage,
    selectedNoticeFilter,
  ]);

  return {
    noticeItems,
    setNoticeItems,
    pinnedNoticeItems,
    setPinnedNoticeItems,
    pinnedNoticeCount,
    noticePage,
    noticeHasMore,
    isLoadingMore,
    serverItemRevision,
    setServerItemRevision,
    isInitialLoading,
    isRefreshing,
    errorMessage,
    setErrorMessage,
    loadNoticePosts,
    loadMoreNoticePosts,
  };
}
