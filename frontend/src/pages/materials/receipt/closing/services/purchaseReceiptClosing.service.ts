import type { PageSearchFieldValue } from '../../../../../shared/components/page-search/searchFields';
import { apiGet, apiPost } from '../../../../../shared/services/apiClient';
import type {
  ClosingTaxType,
  PurchaseReceiptClosingFilters,
  PurchaseReceiptClosingRequestRow,
  PurchaseReceiptClosingRow,
  PurchaseReceiptClosingSearchSession,
  PurchaseReceiptClosingSearchValues,
  PurchaseReceiptClosingSupplier,
} from '../types/purchaseReceiptClosing.types';

const CLOSING_PATH = '/api/v1/materials/purchase-closings';

export const CLOSE_TYPE_DEFAULT = 'ALL';
export const CLOSE_TYPE_OPTIONS = [
  { value: 'ALL', label: '전체' },
  { value: 'CLOSED', label: '마감등록' },
  { value: 'OPEN', label: '마감미등록' },
];

export const TAX_TYPE_OPTIONS: Array<{ value: ClosingTaxType; label: string }> = [
  { value: 'TAXABLE', label: '과세' },
  { value: 'ZERO_RATED', label: '영세' },
  { value: 'EXEMPT', label: '면세' },
];

export const VAT_INCLUDED_OPTIONS = [
  { value: 'N', label: '별도' },
  { value: 'Y', label: '포함' },
];

/** `YYYYMM` → `YYYY-MM`. */
export function formatClosingMonth(month: string | null | undefined): string {
  if (!month) return '';
  return /^\d{6}$/.test(month) ? `${month.slice(0, 4)}-${month.slice(4)}` : month;
}

/** `YYYY-MM-DD`(서버 날짜 기본값)의 월을 `YYYYMM`로 돌려준다. 날짜가 아니면 빈 문자열이다(브라우저 날짜로 대체하지 않는다). */
export function monthOfDate(date: string | null | undefined): string {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(date ?? '');
  return match ? `${match[1]}${match[2]}` : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPageSearchFieldValue(value: unknown): value is PageSearchFieldValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (!isRecord(value)) return false;
  return (
    Object.keys(value).every((key) => key === 'from' || key === 'to') &&
    (value.from === undefined || typeof value.from === 'string') &&
    (value.to === undefined || typeof value.to === 'string')
  );
}

export function isPurchaseReceiptClosingSearchSession(
  value: unknown,
): value is PurchaseReceiptClosingSearchSession {
  return (
    isRecord(value) &&
    typeof value.keyword === 'string' &&
    isRecord(value.detailValues) &&
    Object.values(value.detailValues).every(isPageSearchFieldValue)
  );
}

export function clonePurchaseReceiptClosingSearchValues(
  values: PurchaseReceiptClosingSearchValues,
): PurchaseReceiptClosingSearchValues {
  return Object.fromEntries(
    Object.entries(values).map(([field, value]) => [
      field,
      value !== null && typeof value === 'object' ? { ...value } : value,
    ]),
  );
}

function readText(values: PurchaseReceiptClosingSearchValues, field: string) {
  const value = values[field];
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  return String(value).trim() || undefined;
}

function readDateRange(values: PurchaseReceiptClosingSearchValues, field: string) {
  const value = values[field];
  if (!value || typeof value !== 'object') return {};
  return { from: value.from?.trim() || undefined, to: value.to?.trim() || undefined };
}

export function toPurchaseReceiptClosingFilters(
  keyword: string,
  values: PurchaseReceiptClosingSearchValues,
): PurchaseReceiptClosingFilters {
  const receiptDt = readDateRange(values, 'receiptDt');
  const filters: PurchaseReceiptClosingFilters = {
    keyword: keyword.trim() || undefined,
    receiptFrom: receiptDt.from,
    receiptTo: receiptDt.to,
    // 마감월이 없으면 입고일 종료일(서버 날짜 기본값)의 월을 쓴다. 브라우저 날짜로 대체하지 않는다.
    closingMonth: readText(values, 'closingMonth') ?? monthOfDate(receiptDt.to),
    closeType: readText(values, 'closeType') ?? CLOSE_TYPE_DEFAULT,
    orderNo: readText(values, 'orderNo'),
  };
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined),
  ) as PurchaseReceiptClosingFilters;
}

function toQuery(values: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value) params.append(key, value);
  });
  return params.toString();
}

/** 구매처 요약은 기간·마감월·품목 검색어만 쓴다(조회구분·발주번호는 입고 행 조회에만 적용). */
export async function searchClosingSuppliers(
  filters: PurchaseReceiptClosingFilters,
): Promise<PurchaseReceiptClosingSupplier[]> {
  const query = toQuery({
    receiptFrom: filters.receiptFrom,
    receiptTo: filters.receiptTo,
    closingMonth: filters.closingMonth,
    keyword: filters.keyword,
  });
  const response = await apiGet<{ resultList?: PurchaseReceiptClosingSupplier[] }>(
    `${CLOSING_PATH}/suppliers?${query}`,
  );
  return response?.resultList ?? [];
}

export async function searchClosingRows(
  filters: PurchaseReceiptClosingFilters,
): Promise<PurchaseReceiptClosingRow[]> {
  const response = await apiGet<{ resultList?: PurchaseReceiptClosingRow[] }>(
    `${CLOSING_PATH}?${toQuery({ ...filters })}`,
  );
  return response?.resultList ?? [];
}

export async function closeReceiptRows(
  closingMonth: string,
  rows: PurchaseReceiptClosingRequestRow[],
): Promise<number> {
  const response = await apiPost<{ count?: number }>(`${CLOSING_PATH}/close`, { closingMonth, rows });
  return response?.count ?? rows.length;
}

export async function releaseReceiptRows(receiptDetailIds: number[]): Promise<number> {
  const response = await apiPost<{ count?: number }>(`${CLOSING_PATH}/release`, { receiptDetailIds });
  return response?.count ?? receiptDetailIds.length;
}
