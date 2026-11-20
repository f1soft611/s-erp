import type {
  PageSearchField,
  PageSearchFieldValue,
} from '../../../../../shared/components/page-search/searchFields';
import type { WarehouseFilters } from '../types/warehouseManagement.types';

/** 상세검색 "사용". 기본은 사용 중인 창고만 보고, 미사용(삭제 대신 상태만 바꾼 창고)·전체로 바꿀 수 있다. */
export const WAREHOUSE_USE_FILTER_FIELD: PageSearchField = {
  field: 'useFilter',
  label: '사용',
  type: 'select',
  searchSpan: 1,
  allowEmpty: false,
  options: [
    { value: 'Y', label: '사용' },
    { value: 'N', label: '미사용' },
    { value: 'ALL', label: '전체' },
  ],
};

export const DEFAULT_WAREHOUSE_DETAIL_VALUES: Record<string, PageSearchFieldValue> = {
  useFilter: 'Y',
};

/** 조회 조건이 없을 때(처음 열기)의 기본 조건: 사용 중인 창고만. */
export const DEFAULT_WAREHOUSE_FILTERS: WarehouseFilters = { useAt: 'Y' };

export type WarehouseSearchSession = {
  keyword: string;
  detailValues: Record<string, PageSearchFieldValue>;
};

function selected(value: PageSearchFieldValue | undefined): string {
  return value == null || typeof value === 'object' ? '' : String(value).trim();
}

/** 검색 입력값을 API 조건으로 바꾼다. 사용여부가 비어 있으면(예: 이전 세션 값) 사용으로 본다. */
export function toWarehouseSearchFilters(session: WarehouseSearchSession): WarehouseFilters {
  const warehouseType = selected(session.detailValues.warehouseType);
  const useFilter = selected(session.detailValues.useFilter) || 'Y';
  return {
    keyword: session.keyword.trim() || undefined,
    warehouseType: warehouseType || undefined,
    useAt: useFilter === 'Y' || useFilter === 'N' ? useFilter : undefined,
  };
}
