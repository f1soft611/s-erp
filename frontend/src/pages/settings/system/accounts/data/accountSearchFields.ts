import type { PageSearchField, PageSearchFieldValue } from '../../../../../shared/components/page-search/searchFields';
import type { AccountFilters, AccountStatusFilter } from '../types/account.types';

/** 상세검색 "선택" 그룹의 계정 상태. 기본은 전체다. */
export const ACCOUNT_STATUS_FIELD: PageSearchField = {
  field: 'status', label: '계정 상태', type: 'select', searchSpan: 1, group: '선택', allowEmpty: false,
  options: [
    { value: 'ALL', label: '전체' },
    { value: 'ACTIVE', label: '사용' },
    { value: 'DISABLED', label: '미허용' },
    { value: 'LOCKED', label: '잠김' },
    { value: 'RETIRED', label: '퇴직' },
  ],
};

export const ACCOUNT_DEFAULT_VALUES: Record<string, PageSearchFieldValue> = { status: 'ALL' };

const STATUSES: AccountStatusFilter[] = ['ALL', 'ACTIVE', 'DISABLED', 'LOCKED', 'RETIRED'];

export function toAccountFilters(keyword: string, values: Record<string, PageSearchFieldValue>): AccountFilters {
  const raw = values.status;
  const status = STATUSES.find((candidate) => candidate === raw) ?? 'ALL';
  return { keyword: keyword.trim(), status };
}
