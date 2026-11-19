import type { PageSearchField, PageSearchFieldValue } from '../../../../../shared/components/page-search/searchFields';

/**
 * 단가등록 세 탭(품목 기준·거래처 기준·단가 이력 조회)이 같이 쓰는 조회조건 정의.
 * 구매자재 현황처럼 통합검색 + 상세검색의 "선택" 그룹(같은 크기·순서·라벨)으로 통일한다.
 * 적용 기준일은 서버 날짜(기본 오늘)를 쓰고 화면 조건으로 두지 않는다.
 */
const GROUP = '선택';

export const PRICE_STATUS_FIELD: PageSearchField = {
  field: 'priceFilter', label: '단가 상태', type: 'select', searchSpan: 1, group: GROUP, allowEmpty: false,
  options: [
    { value: 'ALL', label: '전체' },
    { value: 'NO_PURCHASE', label: '매입 기본단가 미등록' },
    { value: 'NO_SALES', label: '매출 기본단가 미등록' },
    { value: 'HAS_SPECIAL', label: '특별단가 있는 품목' },
  ],
};

export const PRICE_REGISTER_FIELD: PageSearchField = {
  field: 'registerFilter', label: '단가 등록 여부', type: 'select', searchSpan: 1, group: GROUP, allowEmpty: false,
  options: [
    { value: 'ALL', label: '전체' },
    { value: 'REGISTERED', label: '단가 등록' },
    { value: 'UNREGISTERED', label: '단가 미등록' },
  ],
};

export const PRICE_TRADE_TYPE_FIELD: PageSearchField = {
  field: 'tradeType', label: '거래구분', type: 'select', searchSpan: 1, group: GROUP,
  options: [{ value: '매입', label: '매입' }, { value: '매출', label: '매출' }],
};

export const PRICE_USE_AT_FIELD: PageSearchField = {
  field: 'useAt', label: '사용여부', type: 'select', searchSpan: 1, group: GROUP,
  options: [{ value: 'Y', label: '사용' }, { value: 'N', label: '미사용' }],
};

export const PRICE_HISTORY_FIELD: PageSearchField = {
  field: 'includeHistory', label: '단가 이력', type: 'select', searchSpan: 1, group: GROUP, allowEmpty: false,
  options: [
    { value: 'N', label: '현재·예정만' },
    { value: 'Y', label: '이력 포함' },
  ],
};

export function searchText(values: Record<string, PageSearchFieldValue>, field: string): string {
  const value = values[field];
  return typeof value === 'string' ? value.trim() : '';
}
