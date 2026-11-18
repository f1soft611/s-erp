import { describe, expect, it } from 'vitest';
import {
  PRICE_HISTORY_FIELD,
  PRICE_REGISTER_FIELD,
  PRICE_STATUS_FIELD,
  PRICE_TRADE_TYPE_FIELD,
  PRICE_USE_AT_FIELD,
  searchText,
} from '../src/pages/co/master/item-partner-prices/data/priceSearchFields';

describe('단가등록 공통 조회조건', () => {
  const fields = [
    PRICE_STATUS_FIELD, PRICE_REGISTER_FIELD, PRICE_TRADE_TYPE_FIELD, PRICE_USE_AT_FIELD, PRICE_HISTORY_FIELD,
  ];

  it('세 탭이 같은 크기·그룹의 선택 필드만 쓴다(날짜 범위 없음)', () => {
    for (const field of fields) {
      expect(field).toMatchObject({ type: 'select', searchSpan: 1, group: '선택' });
    }
  });

  it('기본값이 항상 채워지는 필드는 빈 값 전체 선택지를 숨긴다', () => {
    for (const field of [PRICE_STATUS_FIELD, PRICE_REGISTER_FIELD, PRICE_HISTORY_FIELD]) {
      expect(field.allowEmpty).toBe(false);
    }
    expect(PRICE_TRADE_TYPE_FIELD.allowEmpty).toBeUndefined();
    expect(PRICE_USE_AT_FIELD.allowEmpty).toBeUndefined();
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
