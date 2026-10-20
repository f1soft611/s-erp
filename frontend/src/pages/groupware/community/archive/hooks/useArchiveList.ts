import { useCallback, useMemo, useState } from 'react';
import { fetchArchiveFiles } from '../services/archiveBoardService';
import type { F1GridDataSource } from '../../../../../shared/components/f1-grid';
import type { ArchiveFileRow } from '../types/archive.types';

type UseArchiveListOptions = {
  pageUnit?: number;
  retryToken?: number;
};

type ArchiveListFilters = {
  keyword: string;
  folderCode: string;
};

export function useArchiveList({
  pageUnit = 20,
  retryToken = 0,
}: UseArchiveListOptions = {}) {
  const [filters, setFilters] = useState<ArchiveListFilters>({
    keyword: '',
    folderCode: '',
  });
  const dataSource = useMemo<F1GridDataSource<ArchiveFileRow>>(
    () => ({
      pageSize: pageUnit,
      async load({ offset, limit, signal }) {
        const result = await fetchArchiveFiles(
          offset,
          limit,
          filters.keyword,
          filters.folderCode,
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
      current.folderCode === categoryCode ? current : { ...current, folderCode: categoryCode },
    );
  }, []);

  return {
    dataSource,
    pageUnit,
    keyword: filters.keyword,
    categoryCode: filters.folderCode,
    setKeyword,
    setCategoryCode,
  };
}
