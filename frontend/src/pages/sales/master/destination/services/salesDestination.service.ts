import { apiDelete, apiGet, apiPost, apiPut } from '../../../../../shared/services/apiClient';
import type { MasterPickerOption } from '../../../../../shared/components/master-picker/masterPicker.types';
import type { DestinationCustomer, SalesDestination, SalesDestinationInput } from '../types/salesDestination.types';

const PATH = '/api/v1/sales/destinations';

export async function fetchDestinationCustomers(keyword = ''): Promise<DestinationCustomer[]> {
  const query = keyword.trim() ? `?keyword=${encodeURIComponent(keyword.trim())}` : '';
  const response = await apiGet<{ resultList?: unknown }>(`${PATH}/customers${query}`);
  if (!Array.isArray(response.resultList)) throw new Error('거래처 목록을 확인할 수 없습니다.');
  return response.resultList.map((value: unknown) => {
    if (typeof value !== 'object' || value === null) throw new Error('거래처 응답을 확인할 수 없습니다.');
    const row = value as DestinationCustomer;
    if (!Number.isSafeInteger(row.customerId) || row.customerId < 1
        || typeof row.customerCode !== 'string' || typeof row.hasDestination !== 'boolean') {
      throw new Error('거래처 응답을 확인할 수 없습니다.');
    }
    return row;
  });
}

export async function fetchSalesDestinations(customerId: number): Promise<SalesDestination[]> {
  const response = await apiGet<{ resultList?: unknown }>(`${PATH}?customerId=${customerId}`);
  if (!Array.isArray(response.resultList)) throw new Error('납품처 목록을 확인할 수 없습니다.');
  return response.resultList.map((value: unknown) => {
    if (typeof value !== 'object' || value === null) throw new Error('납품처 응답을 확인할 수 없습니다.');
    const row = value as SalesDestination;
    if (!Number.isSafeInteger(row.salesDestinationId) || row.salesDestinationId < 1
        || row.customerId !== customerId || typeof row.destinationCode !== 'string'
        || typeof row.destinationName !== 'string') {
      throw new Error('납품처 응답을 확인할 수 없습니다.');
    }
    return row;
  });
}

export async function searchSalesDestinations(customerId: number, keyword: string): Promise<MasterPickerOption[]> {
  const query = keyword.trim().toLocaleLowerCase();
  return (await fetchSalesDestinations(customerId))
    .filter((row) => `${row.destinationCode} ${row.destinationName}`.toLocaleLowerCase().includes(query))
    .map((row) => ({ id: row.salesDestinationId, code: row.destinationCode, name: row.destinationName }));
}

export async function saveSalesDestination(input: SalesDestinationInput, id?: number): Promise<SalesDestination> {
  const response = id == null
    ? await apiPost<{ item?: SalesDestination }>(PATH, input)
    : await apiPut<{ item?: SalesDestination }>(`${PATH}/${id}`, input);
  if (!response.item) throw new Error('납품처 저장 응답을 확인할 수 없습니다.');
  return response.item;
}

export async function deleteSalesDestination(id: number): Promise<void> {
  await apiDelete(`${PATH}/${id}`);
}

export async function saveDestinationBatch(customerId: number, insertedRows: SalesDestinationInput[],
  updatedRows: SalesDestination[]): Promise<void> {
  await apiPost(`${PATH}/save-batch`, { customerId, insertedRows, updatedRows });
}
