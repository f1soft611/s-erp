import { apiDelete, apiGet, apiPost, apiPut } from '../../../shared/services/apiClient';
import type { StatementItem, StatementPayload, StatementSource, StatementStatusRow } from './types';

const PATH = '/api/v1/sales/statements';

function item(response: { item?: StatementItem | null }): StatementItem {
  if (!response.item) throw new Error('거래명세서 응답을 확인해 주세요.');
  return response.item;
}

export async function searchStatementSources(keyword: string): Promise<StatementSource[]> {
  const response = await apiGet<{ items?: StatementSource[] }>(
    `${PATH}/source-deliveries?${new URLSearchParams({ keyword })}`,
  );
  if (!Array.isArray(response.items)) throw new Error('출하 목록 응답을 확인해 주세요.');
  return response.items;
}

export async function getStatement(id: number): Promise<StatementItem> {
  return item(await apiGet<{ item?: StatementItem }>(`${PATH}/${id}`));
}

export async function createStatement(payload: StatementPayload): Promise<StatementItem> {
  return item(await apiPost<{ item?: StatementItem }>(PATH, payload));
}

export async function updateStatement(id: number, payload: Pick<StatementPayload, 'statementDt' | 'remark'>): Promise<StatementItem> {
  return item(await apiPut<{ item?: StatementItem }>(`${PATH}/${id}`, payload));
}

export async function deleteStatement(id: number): Promise<void> {
  await apiDelete(`${PATH}/${id}`);
}

export async function getStatementStatus(from: string, to: string, keyword: string): Promise<StatementStatusRow[]> {
  const params = new URLSearchParams({ statementDtFrom: from, statementDtTo: to, keyword });
  const response = await apiGet<{ items?: StatementStatusRow[] }>(`${PATH}/status?${params}`);
  if (!Array.isArray(response.items)) throw new Error('거래명세서 현황 응답을 확인해 주세요.');
  return response.items;
}
