import { apiDelete, apiGetWithExactDecimals, apiPostWithExactDecimals, apiPutWithExactDecimals } from '../../../../../shared/services/apiClient';
import { MAX_STATEMENT_DETAIL_COUNT } from '../../../shared/statementDetailLimit';
import type { StatementItem, StatementPayload, StatementSource, StatementSourceFilters, StatementStatusRow } from '../types/salesStatement.types';

const PATH = '/api/v1/sales/statements';
const DECIMAL_FIELDS = ['deliveryQty', 'unitPrice', 'supplyAmt', 'vatAmt', 'totalAmt', 'lineTotalAmt'] as const;

function item(response: { item?: StatementItem | null }): StatementItem {
  if (!response.item) throw new Error('거래명세서 응답을 확인해 주세요.');
  return response.item;
}

export async function searchStatementSources(filters: StatementSourceFilters): Promise<StatementSource[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value.trim()) params.set(key, value.trim());
  });
  const response = await apiGetWithExactDecimals<{ items?: StatementSource[] }>(
    `${PATH}/source-deliveries?${params}`,
    ['totalAmt'],
  );
  if (!Array.isArray(response.items)) throw new Error('출하 목록 응답을 확인해 주세요.');
  return response.items;
}

export async function getStatement(id: number): Promise<StatementItem> {
  return item(await apiGetWithExactDecimals<{ item?: StatementItem }>(`${PATH}/${id}`, DECIMAL_FIELDS));
}

export async function createStatement(payload: StatementPayload): Promise<StatementItem> {
  const salesDeliveryDetailIds = [...new Set(payload.salesDeliveryDetailIds)];
  if (salesDeliveryDetailIds.length > MAX_STATEMENT_DETAIL_COUNT) {
    throw new Error('거래명세서는 출하 상세를 최대 100건까지 발행할 수 있습니다.');
  }
  if (salesDeliveryDetailIds.length === 0
    || salesDeliveryDetailIds.some((id) => !Number.isSafeInteger(id) || id < 1)) {
    throw new Error('거래명세서 상세를 선택해 주세요.');
  }
  return item(await apiPostWithExactDecimals<{ item?: StatementItem }>(PATH, {
    ...payload,
    salesDeliveryDetailIds,
  }, DECIMAL_FIELDS));
}

export async function updateStatement(id: number, payload: Pick<StatementPayload, 'statementDt' | 'remark'>): Promise<StatementItem> {
  return item(await apiPutWithExactDecimals<{ item?: StatementItem }>(`${PATH}/${id}`, payload, DECIMAL_FIELDS));
}

export async function deleteStatement(id: number): Promise<void> {
  await apiDelete(`${PATH}/${id}`);
}

export async function getStatementStatus(from: string, to: string, keyword: string): Promise<StatementStatusRow[]> {
  const params = new URLSearchParams({ statementDtFrom: from, statementDtTo: to, keyword });
  const response = await apiGetWithExactDecimals<{ items?: StatementStatusRow[] }>(`${PATH}/status?${params}`, DECIMAL_FIELDS);
  if (!Array.isArray(response.items)) throw new Error('거래명세서 현황 응답을 확인해 주세요.');
  return response.items;
}
