import { apiGet, apiPost } from '../../../../../shared/services/apiClient';
import {
  emptyMaterialPayload, expiryStatuses, materialTextFields,
  type ExpiryStatus, type MaterialBatchPayload, type MaterialFilters,
  type MaterialOption, type MaterialPayload, type MaterialRow,
} from '../types/materialManagement.types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireExpiryStatus(value: unknown): ExpiryStatus {
  const status = expiryStatuses.find((candidate) => candidate === value);
  if (!status) throw new Error('소비기한기준은 NONE/DAY/MONTH/YEAR 중 하나여야 합니다.');
  return status;
}

function numeric(value: unknown, label: string, integer = false): number | null {
  if (value == null || value === '') return null;
  if ((typeof value !== 'number' && typeof value !== 'string') ||
      (typeof value === 'string' && !value.trim())) {
    throw new Error(`${label} 숫자를 확인해 주세요.`);
  }
  const result = Number(value);
  if (!Number.isFinite(result) || (integer && !Number.isSafeInteger(result))) {
    throw new Error(`${label} ${integer ? '정수' : '숫자'}를 확인해 주세요.`);
  }
  return result;
}

export function toMaterialPayload(row: MaterialPayload, isNew: boolean): MaterialPayload {
  const payload = emptyMaterialPayload();
  for (const definition of materialTextFields) {
    const text = row[definition.field].trim();
    if ([...text].length > definition.max) {
      throw new Error(`${definition.label}은 ${definition.max}자 이하로 입력해 주세요.`);
    }
    payload[definition.field] = text;
  }
  if (!payload.materialName) throw new Error('품목명은 필수입니다.');
  if (!payload.materialTypeCode) throw new Error('품목계정코드는 필수입니다.');
  if (!isNew && !payload.materialCode) throw new Error('수정 시 품목코드를 입력해 주세요.');
  payload.materialWeight = numeric(row.materialWeight, '중량', true);
  payload.safeInvoice = numeric(row.safeInvoice, '안전재고');
  payload.expiryedCount = numeric(row.expiryedCount, '소비기한계산숫자', true);
  if (payload.expiryedCount != null && (payload.expiryedCount <= 0 || payload.expiryedCount > 2147483647)) {
    throw new Error('소비기한계산숫자는 1~2147483647의 정수여야 합니다.');
  }
  payload.expiryedStatus = requireExpiryStatus(row.expiryedStatus);
  return payload;
}

function positiveId(value: unknown): number {
  const id = numeric(value, '품목 ID', true);
  if (id == null || id <= 0) throw new Error('품목 ID 응답을 확인할 수 없습니다.');
  return id;
}

export function normalizeMaterialRow(source: Record<string, unknown>): MaterialRow {
  const row: MaterialRow = { ...emptyMaterialPayload(), materialId: positiveId(source.materialId) };
  for (const { field } of materialTextFields) {
    const value = source[field];
    if (value != null && typeof value !== 'string') throw new Error(`품목 ${field} 응답을 확인할 수 없습니다.`);
    row[field] = value ?? '';
  }
  row.materialWeight = numeric(source.materialWeight, '중량', true);
  row.safeInvoice = numeric(source.safeInvoice, '안전재고');
  row.expiryedCount = numeric(source.expiryedCount, '소비기한계산숫자', true);
  row.expiryedStatus = requireExpiryStatus(source.expiryedStatus);
  if (source.tenantId != null) row.tenantId = positiveId(source.tenantId);
  for (const field of ['createdBy', 'createdAt', 'updatedBy', 'updatedAt'] as const) {
    if (source[field] != null) row[field] = String(source[field]);
  }
  return row;
}

function rowsFromResponse(value: unknown): MaterialRow[] {
  if (!Array.isArray(value) || !value.every(isRecord)) throw new Error('품목 목록 응답을 확인할 수 없습니다.');
  return value.map(normalizeMaterialRow);
}

export async function fetchMaterials(filters: MaterialFilters = {}): Promise<MaterialRow[]> {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value?.trim()) query.set(key, value.trim());
  });
  const result = await apiGet<{ resultList?: unknown }>(
    `/api/v1/co/master/materials${query.size ? `?${query}` : ''}`,
  );
  return rowsFromResponse(result.resultList);
}

export async function fetchMaterialOptions(): Promise<MaterialOption[]> {
  const result = await apiGet<{ resultList?: unknown }>('/api/v1/co/master/materials/options');
  if (!Array.isArray(result.resultList)) throw new Error('품목 공통코드 응답을 확인할 수 없습니다.');
  return result.resultList.map((item: unknown) => {
    if (!isRecord(item) || typeof item.groupCode !== 'string' ||
        typeof item.itemCode !== 'string' || typeof item.itemName !== 'string') {
      throw new Error('품목 공통코드 항목을 확인할 수 없습니다.');
    }
    return { groupCode: item.groupCode, itemCode: item.itemCode, itemName: item.itemName };
  });
}

export async function saveMaterialBatch(payload: MaterialBatchPayload): Promise<MaterialRow[]> {
  const result = await apiPost<{ item?: { materials?: unknown } }>(
    '/api/v1/co/master/materials/save-batch', payload,
  );
  return rowsFromResponse(result.item?.materials);
}
