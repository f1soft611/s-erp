import { apiGet, apiPost } from '../../../../shared/services/apiClient';
import type { F1GridChanges } from '../../../../shared/components/f1-grid';
import type { ProcessRow } from '../types/processManagement.types';

const invalid = () => new Error('공정 목록 응답을 확인해 주세요.');

function toRows(value: unknown, kind: 'tree' | 'master'): ProcessRow[] {
  if (!Array.isArray(value)) throw invalid();
  return value.map((item: unknown) => {
    if (!item || typeof item !== 'object') throw invalid();
    const row = item as ProcessRow;
    if (typeof row.id !== 'string' || typeof row.name !== 'string') throw invalid();
    if (kind === 'master') {
      if (!/^p:[1-9]\d*$/.test(row.id)) throw invalid();
    } else if (/^g:[1-9]\d*$/.test(row.id)) {
      if (row.parentId) throw invalid();
    } else if (!/^m:[1-9]\d*$/.test(row.id) || !/^g:[1-9]\d*$/.test(row.parentId ?? '')
        || !(Number(row.processId) > 0)) {
      throw invalid();
    }
    return { ...row, processId: row.processId ?? null, description: row.description ?? '', image: row.image ?? '' };
  });
}

/** 작업장과 연결된 공정 트리를 조회한다. */
export async function fetchProcesses(): Promise<ProcessRow[]> {
  const result = await apiGet<{ resultList?: unknown }>('/api/v1/pr/processes');
  return toRows(result.resultList, 'tree');
}

export async function saveProcesses(changes: F1GridChanges<ProcessRow>): Promise<ProcessRow[]> {
  const result = await apiPost<{ resultList?: unknown }>('/api/v1/pr/processes/save-batch', changes);
  return toRows(result.resultList, 'tree');
}

/** 공정 마스터 목록을 조회한다. */
export async function fetchProcessMasters(): Promise<ProcessRow[]> {
  const result = await apiGet<{ resultList?: unknown }>('/api/v1/pr/processes/masters');
  return toRows(result.resultList, 'master');
}

export async function saveProcessMasters(changes: F1GridChanges<ProcessRow>): Promise<ProcessRow[]> {
  const result = await apiPost<{ resultList?: unknown }>('/api/v1/pr/processes/masters/save-batch', changes);
  return toRows(result.resultList, 'master');
}
