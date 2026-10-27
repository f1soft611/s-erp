import { apiGet, apiPost, apiPut } from '../../../../../shared/services/apiClient';
import type {
  Classification,
  ClassificationKind,
  ClassificationSavePayload,
} from '../types/classification.types';

const endpoint = (kind: ClassificationKind) =>
  `/api/v1/co/master/classifications/${kind === 'item' ? 'items' : 'partners'}`;

export function normalizeClassificationId(value: unknown): number | null {
  if (value == null) return null;
  if ((typeof value !== 'number' && typeof value !== 'string') ||
    (typeof value === 'string' && !/^[0-9]+$/.test(value))) {
    throw new Error('분류 ID는 양의 안전한 정수여야 합니다.');
  }
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error('분류 ID는 양의 안전한 정수여야 합니다.');
  return id;
}

function normalize(row: Partial<Record<keyof Classification, unknown>>): Classification {
  const id = Number(row.id);
  const level = Number(row.level);
  const parentId = row.parentId == null ? null : Number(row.parentId);
  const sortSeq = Number(row.sortSeq);
  if (
    !Number.isSafeInteger(id) || id <= 0 ||
    !Number.isInteger(level) || level < 1 || level > 3 ||
    (parentId !== null && (!Number.isSafeInteger(parentId) || parentId <= 0)) ||
    row.sortSeq == null || !Number.isInteger(sortSeq) || sortSeq < 0 ||
    typeof row.name !== 'string' || !row.name.trim() ||
    (row.useAt !== 'Y' && row.useAt !== 'N')
  ) {
    throw new Error('분류 응답을 확인할 수 없습니다.');
  }
  return { id, name: row.name, level, parentId, sortSeq, useAt: row.useAt };
}

export async function fetchClassifications(kind: ClassificationKind): Promise<Classification[]> {
  const result = await apiGet<{ resultList?: Classification[] }>(endpoint(kind));
  if (!Array.isArray(result.resultList)) {
    throw new Error('분류 목록 응답을 확인할 수 없습니다.');
  }
  return result.resultList.map(normalize);
}

function savedItem(result: { item?: Classification }): Classification {
  if (!result.item) throw new Error('분류 저장 응답을 확인할 수 없습니다.');
  return normalize(result.item);
}

export async function createClassification(
  kind: ClassificationKind, payload: ClassificationSavePayload,
): Promise<Classification> {
  const { name, parentId, sortSeq, useAt } = payload;
  return savedItem(await apiPost<{ item?: Classification }>(
    endpoint(kind), { name, ...(parentId !== undefined ? { parentId } : {}), sortSeq, useAt },
  ));
}

export async function updateClassification(
  kind: ClassificationKind, id: number, payload: ClassificationSavePayload,
): Promise<Classification> {
  const { name, sortSeq, useAt } = payload;
  return savedItem(await apiPut<{ item?: Classification }>(
    `${endpoint(kind)}/${id}`, { name, sortSeq, useAt },
  ));
}
