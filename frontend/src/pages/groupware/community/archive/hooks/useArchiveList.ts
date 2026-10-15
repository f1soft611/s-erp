import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchArchivePosts } from '../services/archiveBoardService';
import type { ArchivePageResult } from '../types/archive.types';

type UseArchiveListOptions = {
  pageUnit?: number;
};

type ArchiveListFilters = {
  pageIndex: number;
  keyword: string;
  categoryCode: string;
};

const emptyPage: ArchivePageResult = { resultList: [], resultCnt: 0 };

function asError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

export function useArchiveList({ pageUnit = 20 }: UseArchiveListOptions = {}) {
  const [filters, setFilters] = useState<ArchiveListFilters>({
    pageIndex: 1,
    keyword: '',
    categoryCode: '',
  });
  const [page, setPage] = useState<ArchivePageResult>(emptyPage);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const requestSequence = useRef(0);

  const loadArchivePosts = useCallback(async () => {
    const currentRequest = ++requestSequence.current;
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchArchivePosts(
        filters.pageIndex,
        pageUnit,
        filters.keyword,
        filters.categoryCode,
      );
      if (currentRequest === requestSequence.current) {
        setPage(result);
      }
    } catch (cause) {
      if (currentRequest === requestSequence.current) {
        setError(asError(cause));
      }
    } finally {
      if (currentRequest === requestSequence.current) {
        setIsLoading(false);
      }
    }
  }, [filters.categoryCode, filters.keyword, filters.pageIndex, pageUnit]);

  useEffect(() => {
    void loadArchivePosts();
    return () => {
      requestSequence.current += 1;
    };
  }, [loadArchivePosts]);

  const setPageIndex = useCallback((pageIndex: number) => {
    setFilters((current) =>
      current.pageIndex === pageIndex ? current : { ...current, pageIndex },
    );
  }, []);
  const setKeyword = useCallback((keyword: string) => {
    setFilters((current) =>
      current.keyword === keyword
        ? current
        : { ...current, keyword, pageIndex: 1 },
    );
  }, []);
  const setCategoryCode = useCallback((categoryCode: string) => {
    setFilters((current) =>
      current.categoryCode === categoryCode
        ? current
        : { ...current, categoryCode, pageIndex: 1 },
    );
  }, []);

  return {
    posts: page.resultList,
    resultCnt: page.resultCnt,
    pageIndex: filters.pageIndex,
    pageUnit,
    keyword: filters.keyword,
    categoryCode: filters.categoryCode,
    isLoading,
    error,
    setPageIndex,
    setKeyword,
    setCategoryCode,
    loadArchivePosts,
  };
}
