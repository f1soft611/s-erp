import { apiGet, apiPost } from '../../../../../shared/services/apiClient';
import { MAX_STATEMENT_DETAIL_COUNT } from '../../../shared/statementDetailLimit';
import type {
  RevenueClosingCustomerSummaryRow,
  RevenueClosingDetailRow,
} from '../types/revenueClosing.types';

const PATH = '/api/v1/sales/revenue-closings/search';
const CLOSE_PATH = '/api/v1/sales/revenue-closings/close';

export type RevenueClosingSearch = {
  deliveryDtFrom: string;
  deliveryDtTo: string;
  keyword: string;
  customerIds: number[];
};

export type RevenueClosingSearchResult = {
  details: RevenueClosingDetailRow[];
  customerSummaries: RevenueClosingCustomerSummaryRow[];
};

export type RevenueClosingBatchItem = {
  salesStatementId: number;
  statementNo: string;
};

export async function searchRevenueClosings(
  search: RevenueClosingSearch,
): Promise<RevenueClosingSearchResult> {
  const params = new URLSearchParams({
    deliveryDtFrom: search.deliveryDtFrom,
    deliveryDtTo: search.deliveryDtTo,
    keyword: search.keyword.trim(),
  });
  search.customerIds.forEach((customerId) => params.append('customerIds', String(customerId)));

  const response = await apiGet<unknown>(`${PATH}?${params.toString()}`);
  if (!isSearchResult(response)) {
    throw new Error('매출마감 조회 응답을 확인해 주세요.');
  }
  return response;
}

export async function closeRevenueClosings(
  salesDeliveryDetailIds: number[],
  statementDt: string,
): Promise<{ closedCount: number; items: RevenueClosingBatchItem[] }> {
  const ids = [...new Set(salesDeliveryDetailIds)];
  if (ids.length > MAX_STATEMENT_DETAIL_COUNT) {
    throw new Error('매출마감은 출하 상세를 최대 100건까지 처리할 수 있습니다.');
  }
  if (ids.length === 0 || ids.some((id) => !Number.isSafeInteger(id) || id < 1)) {
    throw new Error('마감할 출하를 선택해 주세요.');
  }
  if (!isIsoDate(statementDt)) {
    throw new Error('명세일을 확인해 주세요.');
  }

  const response = await apiPost<unknown>(CLOSE_PATH, {
    salesDeliveryDetailIds: ids,
    statementDt,
  });
  if (!isBatchResult(response) || response.closedCount !== ids.length) {
    throw new Error('매출마감 처리 응답을 확인해 주세요.');
  }
  return response;
}

function isSearchResult(value: unknown): value is RevenueClosingSearchResult {
  if (typeof value !== 'object' || value === null) return false;
  const result = value as Record<string, unknown>;
  return Array.isArray(result.details)
    && result.details.every(isDetailRow)
    && Array.isArray(result.customerSummaries)
    && result.customerSummaries.every(isCustomerSummaryRow);
}

function isDetailRow(value: unknown): value is RevenueClosingDetailRow {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return Number.isSafeInteger(row.rowId)
    && Number.isSafeInteger(row.customerId)
    && typeof row.deliveryNo === 'string'
    && typeof row.deliveryDt === 'string'
    && typeof row.customerCode === 'string'
    && typeof row.customerName === 'string'
    && typeof row.materialCode === 'string'
    && typeof row.materialName === 'string'
    && (row.orderNo === null || typeof row.orderNo === 'string')
    && (row.closingStatus === 'CLOSED' || row.closingStatus === 'OPEN')
    && isFiniteNumber(row.quantity)
    && isFiniteNumber(row.salesAmount)
    && isFiniteNumber(row.vatAmount)
    && isFiniteNumber(row.totalAmount);
}

function isCustomerSummaryRow(value: unknown): value is RevenueClosingCustomerSummaryRow {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return Number.isSafeInteger(row.customerId)
    && typeof row.customerCode === 'string'
    && typeof row.customerName === 'string'
    && isFiniteNumber(row.totalCount)
    && isFiniteNumber(row.closedCount)
    && isFiniteNumber(row.openCount);
}

function isBatchResult(
  value: unknown,
): value is { closedCount: number; items: RevenueClosingBatchItem[] } {
  if (typeof value !== 'object' || value === null || !Array.isArray((value as Record<string, unknown>).items)) {
    return false;
  }
  const result = value as Record<string, unknown>;
  return Number.isSafeInteger(result.closedCount)
    && (result.items as unknown[]).every((item) => {
      if (typeof item !== 'object' || item === null) return false;
      const statement = item as Record<string, unknown>;
      return Number.isSafeInteger(statement.salesStatementId)
        && typeof statement.statementNo === 'string';
    });
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
