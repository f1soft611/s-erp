import type { PageSearchFieldValue } from '../../../../shared/components/page-search/searchFields';
import type { OrderHistoryFilters } from '../types/order.types';
import { daysAgoString, todayString } from './orderGridData';

export function defaultHistoryValues(): Record<string, PageSearchFieldValue> {
  return { processDt: { from: daysAgoString(30), to: todayString() } };
}

function selected(value: PageSearchFieldValue | undefined): string {
  return value == null || typeof value === 'object' ? '' : String(value).trim();
}

/** 검색 입력(통합검색어 + 상세검색 값)을 처리 내역 조회 조건으로 바꾼다. */
export function toHistoryFilters(keyword: string, values: Record<string, PageSearchFieldValue>): OrderHistoryFilters {
  const range = values.processDt;
  const from = range && typeof range === 'object' ? range.from : undefined;
  const to = range && typeof range === 'object' ? range.to : undefined;
  return {
    from: from || undefined,
    to: to || undefined,
    keyword: keyword.trim() || undefined,
    orderType: selected(values.orderType) || undefined,
    source: selected(values.source) || undefined,
  };
}
