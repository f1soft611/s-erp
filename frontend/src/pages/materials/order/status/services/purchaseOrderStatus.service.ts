import type { PageSearchFieldValue } from '../../../../../shared/components/page-search/searchFields';
import { apiGet } from '../../../../../shared/services/apiClient';
import type {
  PurchaseOrderStatusFilters,
  PurchaseOrderStatusListResponse,
  PurchaseOrderStatusRow,
  PurchaseOrderStatusSearchSession,
  PurchaseOrderStatusSearchValues,
} from '../types/purchaseOrderStatus.types';

const PURCHASE_ORDER_STATUS_PATH = '/api/v1/materials/purchase-order-status';

/** 상태 조회 조건: 정상(기본), 취소, 전체(취소 포함). 취소 이력이 있는 모든 현황 화면의 공통 규칙이다. */
export const PURCHASE_ORDER_STATUS_DEFAULT = 'ACTIVE';
export const PURCHASE_ORDER_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: '정상' },
  { value: 'CANCELED', label: '취소' },
  { value: 'ALL', label: '전체' },
];

export const PURCHASE_ORDER_SOURCE_OPTIONS = [
  { value: 'CONFIRM', label: '확정' },
  { value: 'DIRECT', label: '직접' },
];

/** 입고대기마감 검색 선택지. 비우면 전체. */
export const PURCHASE_ORDER_RECEIPT_CLOSE_OPTIONS = [
  { value: 'OPEN', label: '미마감' },
  { value: 'CLOSED', label: '마감' },
];

export function purchaseOrderStatusLabel(status: string | null | undefined): string {
  return PURCHASE_ORDER_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? String(status ?? '');
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

export function isPurchaseOrderStatusSearchSession(value: unknown): value is PurchaseOrderStatusSearchSession {
  return (
    isRecord(value) &&
    typeof value.keyword === 'string' &&
    isRecord(value.detailValues) &&
    Object.values(value.detailValues).every(isPageSearchFieldValue)
  );
}

export function clonePurchaseOrderStatusSearchValues(
  values: PurchaseOrderStatusSearchValues,
): PurchaseOrderStatusSearchValues {
  return Object.fromEntries(
    Object.entries(values).map(([field, value]) => [
      field,
      value !== null && typeof value === 'object' ? { ...value } : value,
    ]),
  );
}

function readText(values: PurchaseOrderStatusSearchValues, field: string) {
  const value = values[field];
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  return String(value).trim() || undefined;
}

function readDateRange(values: PurchaseOrderStatusSearchValues, field: string) {
  const value = values[field];
  if (!value || typeof value !== 'object') return {};
  return { from: value.from?.trim() || undefined, to: value.to?.trim() || undefined };
}

export function toPurchaseOrderStatusFilters(
  keyword: string,
  values: PurchaseOrderStatusSearchValues,
): PurchaseOrderStatusFilters {
  const orderDt = readDateRange(values, 'orderDt');
  const deliveryDt = readDateRange(values, 'deliveryDt');
  const filters: PurchaseOrderStatusFilters = {
    keyword: keyword.trim() || undefined,
    orderNo: readText(values, 'orderNo'),
    orderDtFrom: orderDt.from,
    orderDtTo: orderDt.to,
    supplierKeyword: readText(values, 'supplierName'),
    // 상태를 비우면 서버도 정상만 조회하므로 같은 값을 명시해 둔다(예전에 저장된 검색 세션 복원 포함).
    status: readText(values, 'status') ?? PURCHASE_ORDER_STATUS_DEFAULT,
    sourceType: readText(values, 'sourceType'),
    receiptCloseType: readText(values, 'receiptCloseType'),
    materialKeyword: readText(values, 'materialCode'),
    deliveryDtFrom: deliveryDt.from,
    deliveryDtTo: deliveryDt.to,
  };
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined),
  ) as PurchaseOrderStatusFilters;
}

export async function searchPurchaseOrderStatus(
  filters: PurchaseOrderStatusFilters,
): Promise<PurchaseOrderStatusRow[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.append(key, value);
  });
  const query = params.toString();
  const response = await apiGet<PurchaseOrderStatusListResponse>(
    query ? `${PURCHASE_ORDER_STATUS_PATH}?${query}` : PURCHASE_ORDER_STATUS_PATH,
  );
  return response?.resultList ?? [];
}
