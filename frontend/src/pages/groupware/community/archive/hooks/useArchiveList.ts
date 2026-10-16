import { useCallback, useMemo, useState } from 'react';
import { fetchArchivePosts } from '../services/archiveBoardService';
import type { F1GridDataSource } from '../../../../../shared/components/f1-grid';
import type { ArchivePost } from '../types/archive.types';

type UseArchiveListOptions = {
  pageUnit?: number;
  retryToken?: number;
};

type ArchiveListFilters = {
  keyword: string;
  categoryCode: string;
};

export function useArchiveList({
  pageUnit = 20,
  retryToken = 0,
}: UseArchiveListOptions = {}) {
  const [filters, setFilters] = useState<ArchiveListFilters>({
    keyword: '',
    categoryCode: '',
  });
  const dataSource = useMemo<F1GridDataSource<ArchivePost>>(
    () => ({
      pageSize: pageUnit,
      async load({ offset, limit, signal }) {
        const result = await fetchArchivePosts(
          Math.floor(offset / limit) + 1,
          limit,
          filters.keyword,
          filters.categoryCode,
          signal,
        );
        return {
          rows: result.resultList,
          totalRowCount: result.resultCnt,
        };
      },
    }),
    [filters, pageUnit, retryToken],
  );

  const setKeyword = useCallback((keyword: string) => {
    setFilters((current) =>
      current.keyword === keyword ? current : { ...current, keyword },
    );
  }, []);
  const setCategoryCode = useCallback((categoryCode: string) => {
    setFilters((current) =>
      current.categoryCode === categoryCode ? current : { ...current, categoryCode },
    );
  }, []);

  return {
    dataSource,
    pageUnit,
    keyword: filters.keyword,
    categoryCode: filters.categoryCode,
    setKeyword,
    setCategoryCode,
  };
}
