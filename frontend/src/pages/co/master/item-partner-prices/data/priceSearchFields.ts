import type { PageSearchField, PageSearchFieldValue } from '../../../../../shared/components/page-search/searchFields';

/**
 * 단가등록 세 탭(품목 기준·거래처 기준·단가 이력 조회)이 같이 쓰는 조회조건 정의.
 * 구매자재 현황처럼 통합검색 + 상세검색의 "선택" 그룹(같은 크기·순서·라벨)으로 통일한다.
 * 적용 기준일은 서버 날짜(기본 오늘)를 쓰고 화면 조건으로 두지 않는다.
 */
const GROUP = '선택';

/** 품목 계정분류(tb_material_info.material_type_code) 코드와 이름. */
export const ITEM_TYPE_OPTIONS = [
  { value: 'PRODUCT', label: '제품' },
  { value: 'SEMI', label: '반제품' },
  { value: 'GOODS', label: '상품' },
  { value: 'RAW', label: '원재료' },
  { value: 'SUB', label: '부재료' },
  { value: 'SUPPLY', label: '소모품' },
];

/** 화면 거래구분별 계정분류 기본값(쉼표 구분). 매입은 원재료·부재료·소모품, 매출은 제품·반제품·상품. */
export const DEFAULT_ITEM_TYPES: Record<'매입' | '매출', string> = {
  매입: 'RAW,SUB,SUPPLY',
  매출: 'PRODUCT,SEMI,GOODS',
};

/** 품목 계정분류 멀티선택 조회조건. 아무것도 고르지 않으면 전체다. */
export const PRICE_ITEM_TYPE_FIELD: PageSearchField = {
  field: 'itemTypes', label: '품목 계정분류', type: 'select', searchSpan: 1, group: GROUP, multiple: true,
  options: ITEM_TYPE_OPTIONS,
};

/** 거래구분 화면의 조회조건 기본값: 계정분류 기본값 + 이 화면에서 쓰는 다른 조건의 기본값. */
export function priceSearchDefaults(
  tradeType: '매입' | '매출',
  extra: Record<string, PageSearchFieldValue> = {},
): Record<string, PageSearchFieldValue> {
  return { itemTypes: DEFAULT_ITEM_TYPES[tradeType], ...extra };
}

/** 거래구분(매입단가등록/매출단가등록) 화면의 단가 상태 필터. 기본 거래처 조건은 매입에만 있다. */
export function priceStatusField(tradeType: '매입' | '매출'): PageSearchField {
  return {
    field: 'priceFilter', label: '단가 상태', type: 'select', searchSpan: 1, group: GROUP, allowEmpty: false,
    options: [
      { value: 'ALL', label: '전체' },
      { value: 'NO_PRICE', label: '단가 미등록 품목' },
      ...(tradeType === '매입' ? [{ value: 'NO_DEFAULT_SUPPLIER', label: '기본 거래처 미지정(2곳 이상)' }] : []),
    ],
  };
}

export const PRICE_REGISTER_FIELD: PageSearchField = {
  field: 'registerFilter', label: '단가 등록 여부', type: 'select', searchSpan: 1, group: GROUP, allowEmpty: false,
  options: [
    { value: 'ALL', label: '전체' },
    { value: 'REGISTERED', label: '단가 등록' },
    { value: 'UNREGISTERED', label: '단가 미등록' },
  ],
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
