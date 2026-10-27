import { apiGet } from '../../../../../shared/services/apiClient';
import type {
  SalesOrderStatusFilters,
  SalesOrderStatusListResponse,
  SalesOrderStatusRow,
  SalesOrderStatusSearchValues,
} from '../types/salesOrderStatus.types';

const SALES_ORDER_STATUS_PATH = '/api/v1/sales/order-status';

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
