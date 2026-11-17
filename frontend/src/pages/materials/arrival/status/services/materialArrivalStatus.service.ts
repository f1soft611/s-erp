import type { PageSearchFieldValue } from '../../../../../shared/components/page-search/searchFields';
import { apiGet } from '../../../../../shared/services/apiClient';
import type {
  MaterialArrivalStatusFilters,
  MaterialArrivalStatusListResponse,
  MaterialArrivalStatusRow,
  MaterialArrivalStatusSearchSession,
  MaterialArrivalStatusSearchValues,
} from '../types/materialArrivalStatus.types';

const MATERIAL_ARRIVAL_STATUS_PATH = '/api/v1/materials/material-arrival-status';

/** 상태 조회 조건: 정상(기본), 취소, 전체(취소 포함). 취소 이력이 있는 모든 현황 화면의 공통 규칙이다. */
export const MATERIAL_ARRIVAL_STATUS_DEFAULT = 'ACTIVE';
export const MATERIAL_ARRIVAL_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: '정상' },
  { value: 'CANCELED', label: '취소' },
  { value: 'ALL', label: '전체' },
];

export function materialArrivalStatusLabel(status: string | null | undefined): string {
  return MATERIAL_ARRIVAL_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? String(status ?? '');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPageSearchFieldValue(value: unknown): value is PageSearchFieldValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (!isRecord(value)) return false;
  return (
    Object.keys(value).every((key) => key === 'from' || key === 'to') &&
    (value.from === undefined || typeof value.from === 'string') &&
    (value.to === undefined || typeof value.to === 'string')
  );
}

export function isMaterialArrivalStatusSearchSession(value: unknown): value is MaterialArrivalStatusSearchSession {
  return (
    isRecord(value) &&
    typeof value.keyword === 'string' &&
    isRecord(value.detailValues) &&
    Object.values(value.detailValues).every(isPageSearchFieldValue)
  );
}

export function cloneMaterialArrivalStatusSearchValues(
  values: MaterialArrivalStatusSearchValues,
): MaterialArrivalStatusSearchValues {
  return Object.fromEntries(
    Object.entries(values).map(([field, value]) => [
      field,
      value !== null && typeof value === 'object' ? { ...value } : value,
    ]),
  );
}

function readText(values: MaterialArrivalStatusSearchValues, field: string) {
  const value = values[field];
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  return String(value).trim() || undefined;
}

function readDateRange(values: MaterialArrivalStatusSearchValues, field: string) {
  const value = values[field];
  if (!value || typeof value !== 'object') return {};
  return { from: value.from?.trim() || undefined, to: value.to?.trim() || undefined };
}

export function toMaterialArrivalStatusFilters(
  keyword: string,
  values: MaterialArrivalStatusSearchValues,
): MaterialArrivalStatusFilters {
  const arrivalDt = readDateRange(values, 'arrivalDt');
  const filters: MaterialArrivalStatusFilters = {
    keyword: keyword.trim() || undefined,
    arrivalNo: readText(values, 'arrivalNo'),
    arrivalDtFrom: arrivalDt.from,
    arrivalDtTo: arrivalDt.to,
    supplierKeyword: readText(values, 'supplierName'),
    // 상태를 비우면 서버도 정상만 조회하므로 같은 값을 명시해 둔다(예전에 저장된 검색 세션 복원 포함).
    status: readText(values, 'status') ?? MATERIAL_ARRIVAL_STATUS_DEFAULT,
    materialKeyword: readText(values, 'materialCode'),
    orderNo: readText(values, 'orderNo'),
  };
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined),
  ) as MaterialArrivalStatusFilters;
}

export async function searchMaterialArrivalStatus(
  filters: MaterialArrivalStatusFilters,
): Promise<MaterialArrivalStatusRow[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.append(key, value);
  });
  const query = params.toString();
  const response = await apiGet<MaterialArrivalStatusListResponse>(
    query ? `${MATERIAL_ARRIVAL_STATUS_PATH}?${query}` : MATERIAL_ARRIVAL_STATUS_PATH,
  );
  return response?.resultList ?? [];
}
