import { apiGet, apiPost, apiPut } from '../../../../../shared/services/apiClient';
import type {
  CustomerBatchPayload,
  CustomerFilters,
  CustomerPayload,
  CustomerRow,
} from '../types/customerManagement.types';

type ApiRow = Record<string, unknown>;

function isApiRow(value: unknown): value is ApiRow {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toNumber(value: unknown, fieldName: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`거래처 ${fieldName} 응답을 확인할 수 없습니다.`);
  }
  return parsed;
}

function toText(value: unknown): string {
  return value == null ? '' : String(value);
}

export function normalizeCustomerRow(source: ApiRow): CustomerRow {
  if (source.useAt !== 'Y' && source.useAt !== 'N') {
    throw new Error('거래처 사용 여부 응답을 확인할 수 없습니다.');
  }
  return {
    customerId: toNumber(source.customerId, 'ID'),
    tenantId: source.tenantId == null
      ? undefined
      : toNumber(source.tenantId, '테넌트 ID'),
    customerCode: toText(source.customerCode),
    customerName: toText(source.customerName),
    custNameAbbr: toText(source.custNameAbbr),
    presidentName: toText(source.presidentName),
    businessNo: toText(source.businessNo),
    juridNo: toText(source.juridNo),
    businessStatus1: toText(source.businessStatus1),
    businessItem1: toText(source.businessItem1),
    postCode: toText(source.postCode),
    address: toText(source.address),
    telephoneNo: toText(source.telephoneNo),
    facsimileNo: toText(source.facsimileNo),
    custMemo: toText(source.custMemo),
    useAt: source.useAt,
    createdBy: source.createdBy == null
      ? undefined
      : toNumber(source.createdBy, '등록자 ID'),
    createdAt: source.createdAt == null ? undefined : String(source.createdAt),
    updatedBy: source.updatedBy == null
      ? undefined
      : toNumber(source.updatedBy, '수정자 ID'),
    updatedAt: source.updatedAt == null ? undefined : String(source.updatedAt),
  };
}

export async function fetchCustomers(
  filters: CustomerFilters = {},
): Promise<CustomerRow[]> {
  const query = new URLSearchParams();
  if (filters.keyword?.trim()) query.set('keyword', filters.keyword.trim());
  if (filters.presidentName?.trim())
    query.set('presidentName', filters.presidentName.trim());
  if (filters.businessNo?.trim())
    query.set('businessNo', filters.businessNo.trim());
  if (filters.juridNo?.trim()) query.set('juridNo', filters.juridNo.trim());
  if (filters.businessStatus1?.trim())
    query.set('businessStatus1', filters.businessStatus1.trim());
  if (filters.businessItem1?.trim())
    query.set('businessItem1', filters.businessItem1.trim());
  if (filters.useAt) query.set('useAt', filters.useAt);
  const queryString = query.toString();
  const result = await apiGet<{ resultList?: unknown }>(
    `/api/v1/co/master/customers${queryString ? `?${queryString}` : ''}`,
  );
  if (
    !Array.isArray(result.resultList) ||
    !result.resultList.every(isApiRow)
  ) {
    throw new Error('거래처 목록 응답을 확인할 수 없습니다.');
  }
  return result.resultList.map(normalizeCustomerRow);
}

export async function createCustomer(
  payload: CustomerPayload,
): Promise<CustomerRow> {
  const result = await apiPost<{ item?: unknown }>(
    '/api/v1/co/master/customers',
    payload,
  );
  if (!isApiRow(result.item)) {
    throw new Error('거래처 저장 응답을 확인할 수 없습니다.');
  }

  return normalizeCustomerRow(result.item);
}

export async function saveCustomerBatch(
  payload: CustomerBatchPayload,
): Promise<CustomerRow[]> {
  const result = await apiPost<{ item?: { customers?: unknown } }>(
    '/api/v1/co/master/customers/save-batch',
    payload,
  );
  const customers = result.item?.customers;
  if (!Array.isArray(customers) || !customers.every(isApiRow)) {
    throw new Error('거래처 일괄 저장 응답을 확인할 수 없습니다.');
  }
  return customers.map(normalizeCustomerRow);
}

export async function updateCustomer(
  customerId: number,
  payload: CustomerPayload,
): Promise<CustomerRow> {
  const result = await apiPut<{ item?: unknown }>(
    `/api/v1/co/master/customers/${customerId}`,
    payload,
  );
  if (!isApiRow(result.item)) {
    throw new Error('거래처 저장 응답을 확인할 수 없습니다.');
  }
  return normalizeCustomerRow(result.item);
}
