import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ITEM_TYPES,
  ITEM_TYPE_OPTIONS,
  PRICE_HISTORY_FIELD,
  PRICE_ITEM_TYPE_FIELD,
  PRICE_REGISTER_FIELD,
  priceSearchDefaults,
  priceStatusField,
  PRICE_USE_AT_FIELD,
  searchText,
} from '../src/pages/co/master/item-partner-prices/data/priceSearchFields';

describe('단가등록 공통 조회조건', () => {
  const fields = [
    priceStatusField('매입'), priceStatusField('매출'), PRICE_REGISTER_FIELD, PRICE_ITEM_TYPE_FIELD,
    PRICE_USE_AT_FIELD, PRICE_HISTORY_FIELD,
  ];

  it('세 탭이 같은 크기·그룹의 선택 필드만 쓴다(날짜 범위 없음)', () => {
    for (const field of fields) {
      expect(field).toMatchObject({ type: 'select', searchSpan: 1, group: '선택' });
    }
  });

  it('기본값이 항상 채워지는 필드는 빈 값 전체 선택지를 숨긴다', () => {
    for (const field of [priceStatusField('매입'), priceStatusField('매출'), PRICE_REGISTER_FIELD, PRICE_HISTORY_FIELD]) {
      expect(field.allowEmpty).toBe(false);
    }
    expect(PRICE_USE_AT_FIELD.allowEmpty).toBeUndefined();
  });

  it('단가 상태 필터에는 공통단가 조건이 없고 기본 거래처 조건은 매입에만 있다', () => {
    const values = (tradeType: '매입' | '매출') => priceStatusField(tradeType).options?.map((option) => option.value);
    expect(values('매입')).toEqual(['ALL', 'NO_PRICE', 'NO_DEFAULT_SUPPLIER']);
    expect(values('매출')).toEqual(['ALL', 'NO_PRICE']);
    expect(priceStatusField('매입').options?.find((option) => option.value === 'NO_PRICE')?.label).toBe('단가 미등록 품목');
  });

  it('품목 계정분류는 멀티선택 select이고 6개 코드를 가진다', () => {
    expect(PRICE_ITEM_TYPE_FIELD).toMatchObject({ field: 'itemTypes', label: '품목 계정분류', type: 'select', multiple: true });
    expect(ITEM_TYPE_OPTIONS.map((option) => option.value)).toEqual(['PRODUCT', 'SEMI', 'GOODS', 'RAW', 'SUB', 'SUPPLY']);
    expect(ITEM_TYPE_OPTIONS.map((option) => option.label)).toEqual(['제품', '반제품', '상품', '원재료', '부재료', '소모품']);
  });

  it('조회조건 기본값은 매입이 원재료·부재료·소모품, 매출이 제품·반제품·상품이다', () => {
    expect(DEFAULT_ITEM_TYPES).toEqual({ 매입: 'RAW,SUB,SUPPLY', 매출: 'PRODUCT,SEMI,GOODS' });
    expect(priceSearchDefaults('매입', { priceFilter: 'ALL' })).toEqual({ itemTypes: 'RAW,SUB,SUPPLY', priceFilter: 'ALL' });
    expect(priceSearchDefaults('매출')).toEqual({ itemTypes: 'PRODUCT,SEMI,GOODS' });
  });

  it('이력 옵션은 현재·예정만 / 이력 포함이고 값은 N/Y다', () => {
    expect(PRICE_HISTORY_FIELD.options).toEqual([
      { value: 'N', label: '현재·예정만' },
      { value: 'Y', label: '이력 포함' },
    ]);
  });

  it('searchText는 문자열만 공백을 제거해 돌려준다', () => {
    expect(searchText({ a: ' x ', b: 3, c: { from: '', to: '' } }, 'a')).toBe('x');
    expect(searchText({ b: 3 }, 'b')).toBe('');
    expect(searchText({}, 'z')).toBe('');
  });
});
