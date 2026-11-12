import { apiGet, apiPost } from '../../../../shared/services/apiClient';
import type { F1GridChanges } from '../../../../shared/components/f1-grid';
import type { ProcessRow } from '../types/processManagement.types';

function toRows(value: unknown): ProcessRow[] {
  if (!Array.isArray(value)) throw new Error('공정 목록 응답을 확인해 주세요.');
  return value.map((item: unknown) => {
    if (!item || typeof item !== 'object') throw new Error('공정 목록 응답을 확인해 주세요.');
    const row = item as ProcessRow;
    if (!/^[gp]:[1-9]\d*$/.test(row.id) || typeof row.name !== 'string'
        || (row.id.startsWith('p:') && !/^g:[1-9]\d*$/.test(row.parentId ?? ''))) {
      throw new Error('공정 목록 응답을 확인해 주세요.');
    }
    return { ...row, description: row.description ?? '', image: row.image ?? '' };
  });
}

export async function fetchProcesses(): Promise<ProcessRow[]> {
  const result = await apiGet<{ resultList?: unknown }>('/api/v1/pr/processes');
  return toRows(result.resultList);
}

export async function saveProcesses(changes: F1GridChanges<ProcessRow>): Promise<ProcessRow[]> {
  const result = await apiPost<{ resultList?: unknown }>('/api/v1/pr/processes/save-batch', changes);
  return toRows(result.resultList);
}
