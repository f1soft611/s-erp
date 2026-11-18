import { apiGet } from '../../../../../shared/services/apiClient';
import type { ItemPriceCustomerFilters, ItemPriceCustomerRow } from '../types/itemPriceCustomer.types';

type ApiRecord = Record<string, unknown>;

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown, label: string): string {
  if (value == null) return '';
  if (typeof value !== 'string') throw new Error(`${label} 응답을 확인할 수 없습니다.`);
  return value;
}

export function normalizeItemPriceCustomerRow(source: ApiRecord): ItemPriceCustomerRow {
  const customerId = Number(source.customerId);
  if (!Number.isSafeInteger(customerId) || customerId <= 0) throw new Error('거래처 ID 응답을 확인할 수 없습니다.');
  const priceCount = Number(source.priceCount ?? 0);
  if (!Number.isSafeInteger(priceCount) || priceCount < 0) throw new Error('등록 건수 응답을 확인할 수 없습니다.');
  return {
    customerId,
    customerCode: text(source.customerCode, '거래처코드'),
    customerName: text(source.customerName, '거래처명'),
    businessNo: text(source.businessNo, '사업자번호'),
    priceCount,
  };
}

export async function fetchItemPriceCustomers(
  filters: ItemPriceCustomerFilters = {},
): Promise<ItemPriceCustomerRow[]> {
  const query = new URLSearchParams();
  if (filters.keyword?.trim()) query.set('keyword', filters.keyword.trim());
  if (filters.registerFilter && filters.registerFilter !== 'ALL') query.set('registerFilter', filters.registerFilter);
  if (filters.effectiveOn?.trim()) query.set('effectiveOn', filters.effectiveOn.trim());
  const result = await apiGet<{ resultList?: unknown }>(
    `/api/v1/co/master/item-partner-prices/customer-overview${query.size ? `?${query}` : ''}`,
  );
  if (!Array.isArray(result.resultList) || !result.resultList.every(isRecord)) {
    throw new Error('거래처 목록 응답을 확인할 수 없습니다.');
  }
  return result.resultList.map(normalizeItemPriceCustomerRow);
}
