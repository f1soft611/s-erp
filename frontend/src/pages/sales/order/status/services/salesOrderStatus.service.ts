import type { PageSearchFieldValue } from '../../../../../shared/components/page-search/searchFields';
import { apiGet } from '../../../../../shared/services/apiClient';
import type {
  SalesOrderStatusFilters,
  SalesOrderStatusListResponse,
  SalesOrderStatusRow,
  SalesOrderStatusSearchSession,
  SalesOrderStatusSearchValues,
} from '../types/salesOrderStatus.types';

const SALES_ORDER_STATUS_PATH = '/api/v1/sales/order-status';

export function readDashboardSalesSearch(search: string): SalesOrderStatusSearchSession | null {
  const params = new URLSearchParams(search);
  const month = params.get('dashboardMonth') ?? '';
  if (/^(19\d{2}|[2-9]\d{3})-(0[1-9]|1[0-2])$/.test(month) && !month.startsWith('9999')) {
    const [year, value] = month.split('-').map(Number);
    const lastDay = new Date(Date.UTC(year, value, 0)).getUTCDate();
    return { keyword: '', detailValues: { orderDt: { from: `${month}-01`, to: `${month}-${lastDay}` } } };
  }
  const from = params.get('dashboardDueFrom') ?? '';
  const to = params.get('dashboardDueTo') ?? '';
  const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (validDate(from) && validDate(to) && from <= to) {
    return {
      keyword: '',
      detailValues: { deliveryDt: { from, to }, orderNo: params.get('dashboardOrderNo') ?? '' },
    };
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPageSearchFieldValue(value: unknown): value is PageSearchFieldValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return true;
  }
  if (typeof value === 'number') return Number.isFinite(value);
  if (!isRecord(value)) return false;
  return (
    Object.keys(value).every((key) => key === 'from' || key === 'to') &&
    (value.from === undefined || typeof value.from === 'string') &&
    (value.to === undefined || typeof value.to === 'string')
  );
}

export function isSalesOrderStatusSearchSession(
  value: unknown,
): value is SalesOrderStatusSearchSession {
  return (
    isRecord(value) &&
    typeof value.keyword === 'string' &&
    isRecord(value.detailValues) &&
    Object.values(value.detailValues).every(isPageSearchFieldValue)
  );
}

export function cloneSalesOrderStatusSearchValues(
  values: SalesOrderStatusSearchValues,
): SalesOrderStatusSearchValues {
  return Object.fromEntries(
    Object.entries(values).map(([field, value]) => [
      field,
      value !== null && typeof value === 'object' ? { ...value } : value,
    ]),
  );
}

function readText(values: SalesOrderStatusSearchValues, field: string) {
  const value = values[field];
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  return String(value).trim() || undefined;
}

function readDateRange(values: SalesOrderStatusSearchValues, field: string) {
  const value = values[field];
  if (!value || typeof value !== 'object') return {};
  return {
    from: value.from?.trim() || undefined,
    to: value.to?.trim() || undefined,
  };
}

export function toSalesOrderStatusFilters(
  keyword: string,
  values: SalesOrderStatusSearchValues,
): SalesOrderStatusFilters {
  const orderDt = readDateRange(values, 'orderDt');
  const deliveryDt = readDateRange(values, 'deliveryDt');
  const filters: SalesOrderStatusFilters = {
    keyword: keyword.trim() || undefined,
    orderNo: readText(values, 'orderNo'),
    orderDtFrom: orderDt.from,
    orderDtTo: orderDt.to,
    customerKeyword: readText(values, 'customerName'),
    quotNo: readText(values, 'quotNo'),
    status: readText(values, 'status'),
    deliveryDtFrom: deliveryDt.from,
    deliveryDtTo: deliveryDt.to,
    materialKeyword: readText(values, 'materialName'),
    lineStatus: readText(values, 'lineStatus'),
  };
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined),
  ) as SalesOrderStatusFilters;
}

export async function searchSalesOrderStatus(
  filters: SalesOrderStatusFilters,
): Promise<SalesOrderStatusRow[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.append(key, value);
  });
  const query = params.toString();
  const response = await apiGet<SalesOrderStatusListResponse>(
    query ? `${SALES_ORDER_STATUS_PATH}?${query}` : SALES_ORDER_STATUS_PATH,
  );
  return response?.resultList ?? [];
}
