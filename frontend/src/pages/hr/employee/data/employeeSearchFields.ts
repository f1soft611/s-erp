import type { PageSearchField, PageSearchFieldValue } from '../../../../shared/components/page-search/searchFields';
import type { EmployeeFilters, EmployeeStatusFilter } from '../types/employee.types';

/** 상세검색 "선택" 그룹의 재직 구분. 기본은 재직(휴직 포함)이다. */
export const EMPLOYEE_STATUS_FIELD: PageSearchField = {
  field: 'status', label: '재직 구분', type: 'select', searchSpan: 1, group: '선택', allowEmpty: false,
  options: [
    { value: 'ACTIVE', label: '재직(휴직 포함)' },
    { value: 'RETIRED', label: '퇴직' },
    { value: 'ALL', label: '전체' },
  ],
};

export const EMPLOYEE_DEFAULT_VALUES: Record<string, PageSearchFieldValue> = { status: 'ACTIVE' };

export function toEmployeeFilters(keyword: string, values: Record<string, PageSearchFieldValue>): EmployeeFilters {
  const raw = values.status;
  const status: EmployeeStatusFilter = raw === 'RETIRED' || raw === 'ALL' ? raw : 'ACTIVE';
  return { keyword: keyword.trim(), status };
}
