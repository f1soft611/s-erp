import type { PageSearchFieldValue } from '../../../../../shared/components/page-search/searchFields';
import { apiGet } from '../../../../../shared/services/apiClient';
import type {
  PurchaseRequestStatusFilters,
  PurchaseRequestStatusListResponse,
  PurchaseRequestStatusRow,
  PurchaseRequestStatusSearchSession,
  PurchaseRequestStatusSearchValues,
} from '../types/purchaseRequestStatus.types';

const PURCHASE_REQUEST_STATUS_PATH = '/api/v1/materials/purchase-request-status';

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

export function isPurchaseRequestStatusSearchSession(
  value: unknown,
): value is PurchaseRequestStatusSearchSession {
  return (
    isRecord(value) &&
    typeof value.keyword === 'string' &&
    isRecord(value.detailValues) &&
    Object.values(value.detailValues).every(isPageSearchFieldValue)
  );
}

export function clonePurchaseRequestStatusSearchValues(
  values: PurchaseRequestStatusSearchValues,
): PurchaseRequestStatusSearchValues {
  return Object.fromEntries(
    Object.entries(values).map(([field, value]) => [
      field,
      value !== null && typeof value === 'object' ? { ...value } : value,
    ]),
  );
}

function readText(values: PurchaseRequestStatusSearchValues, field: string) {
  const value = values[field];
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  return String(value).trim() || undefined;
}

function readDateRange(values: PurchaseRequestStatusSearchValues, field: string) {
  const value = values[field];
  if (!value || typeof value !== 'object') return {};
  return { from: value.from?.trim() || undefined, to: value.to?.trim() || undefined };
}

export function toPurchaseRequestStatusFilters(
  keyword: string,
  values: PurchaseRequestStatusSearchValues,
): PurchaseRequestStatusFilters {
  const requestDt = readDateRange(values, 'requestDt');
  const requestDeliveryDt = readDateRange(values, 'requestDeliveryDt');
  const filters: PurchaseRequestStatusFilters = {
    keyword: keyword.trim() || undefined,
    requestNo: readText(values, 'requestNo'),
    requestDtFrom: requestDt.from,
    requestDtTo: requestDt.to,
    requesterKeyword: readText(values, 'requesterName'),
    status: readText(values, 'status'),
    materialKeyword: readText(values, 'materialCode'),
    requestDeliveryDtFrom: requestDeliveryDt.from,
    requestDeliveryDtTo: requestDeliveryDt.to,
    useType: readText(values, 'useTypeName'),
  };
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined),
  ) as PurchaseRequestStatusFilters;
}

export async function searchPurchaseRequestStatus(
  filters: PurchaseRequestStatusFilters,
): Promise<PurchaseRequestStatusRow[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.append(key, value);
  });
  const query = params.toString();
  const response = await apiGet<PurchaseRequestStatusListResponse>(
    query ? `${PURCHASE_REQUEST_STATUS_PATH}?${query}` : PURCHASE_REQUEST_STATUS_PATH,
  );
  return response?.resultList ?? [];
}
