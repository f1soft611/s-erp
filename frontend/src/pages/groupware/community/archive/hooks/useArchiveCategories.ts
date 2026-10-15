import { useCallback, useEffect, useState } from 'react';
import {
  fetchCommonCodeGroups,
  fetchCommonCodeItems,
} from '../../../../co/master/common-code/services/commonCodeManagement.service';
import type { ArchiveCategory } from '../types/archive.types';

function asError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

export function useArchiveCategories() {
  const [categories, setCategories] = useState<ArchiveCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const groups = await fetchCommonCodeGroups({
        groupCode: 'WF_ARCHIVE_CATEGORY',
      });
      const group = groups.find(
        (candidate) => candidate.groupCode === 'WF_ARCHIVE_CATEGORY',
      );
      if (!group || group.useAt !== 'Y') {
        throw new Error(
          'The active WF_ARCHIVE_CATEGORY common-code group is unavailable.',
        );
      }

      const items = await fetchCommonCodeItems(group.id);
      setCategories(
        items
          .filter((item) => item.useAt === 'Y')
          .map((item) => ({ code: item.itemCode, name: item.itemNm })),
      );
    } catch (cause) {
      setError(asError(cause));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  return { categories, isLoading, error, loadCategories };
}
