import { apiGet, apiPost, apiPut } from '../../../../shared/services/apiClient';
import type {
  DepartmentListResult,
  DepartmentPayload,
  DepartmentRow,
  DepartmentUseAt,
  DepartmentUserRow,
  MemberStatusFilter,
} from '../types/department.types';

const BASE_URL = '/api/v1/hr/departments';

type ApiRow = Record<string, unknown>;

function isApiRow(value: unknown): value is ApiRow {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toRequiredNumber(value: unknown, label: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} 응답을 확인할 수 없습니다.`);
  }
  return parsed;
}

function toNullableNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toText(value: unknown): string {
  return value == null ? '' : String(value);
}

function toUseAt(value: unknown): DepartmentUseAt {
  if (value !== 'Y' && value !== 'N') throw new Error('부서 사용 여부 응답을 확인할 수 없습니다.');
  return value;
}

export function normalizeDepartmentRow(source: ApiRow): DepartmentRow {
  return {
    departmentId: toRequiredNumber(source.departmentId, '부서 ID'),
    parentDepartmentId: toNullableNumber(source.parentDepartmentId),
    departmentNm: toText(source.departmentNm),
    managerUserId: toNullableNumber(source.managerUserId),
    managerUserNm: toText(source.managerUserNm),
    departmentDc: toText(source.departmentDc),
    sortOrder: Number(source.sortOrder ?? 0) || 0,
    useAt: toUseAt(source.useAt),
    childCount: Number(source.childCount ?? 0) || 0,
    userCount: Number(source.userCount ?? 0) || 0,
  };
}

function listFromResponse(value: unknown, label: string): ApiRow[] {
  if (!Array.isArray(value) || !value.every(isApiRow)) {
    throw new Error(`${label} 응답을 확인할 수 없습니다.`);
  }
  return value;
}

function itemFromResponse(value: unknown): DepartmentRow {
  if (!isApiRow(value)) throw new Error('부서 저장 응답을 확인할 수 없습니다.');
  return normalizeDepartmentRow(value);
}

export async function fetchDepartments(includeInactive: boolean): Promise<DepartmentListResult> {
  const result = await apiGet<{ resultList?: unknown; companyName?: unknown }>(
    `${BASE_URL}?includeInactive=${includeInactive ? 'true' : 'false'}`,
  );
  return {
    companyName: toText(result.companyName),
    departments: listFromResponse(result.resultList, '부서 목록').map(normalizeDepartmentRow),
  };
}

export async function fetchDepartmentUsers(
  departmentId: number,
  status: MemberStatusFilter = 'ACTIVE',
): Promise<DepartmentUserRow[]> {
  const result = await apiGet<{ resultList?: unknown }>(`${BASE_URL}/${departmentId}/users?status=${status}`);
  return toUserRows(result.resultList);
}

/** 부서가 지정되지 않은 사용 중인 사원(회사 노드를 선택했을 때). */
export async function fetchUnassignedUsers(status: MemberStatusFilter = 'ACTIVE'): Promise<DepartmentUserRow[]> {
  const result = await apiGet<{ resultList?: unknown }>(`${BASE_URL}/unassigned/users?status=${status}`);
  return toUserRows(result.resultList);
}

function toUserRows(value: unknown): DepartmentUserRow[] {
  return listFromResponse(value, '소속 사원 목록').map((user) => ({
    userId: toRequiredNumber(user.userId, '사용자 ID'),
    userNm: toText(user.userNm),
    levelNm: toText(user.levelNm),
    loginCode: toText(user.loginCode),
    mobileNo: toText(user.mobileNo),
    emailAddr: toText(user.emailAddr),
    managerYn: user.managerYn === 'Y' ? 'Y' : 'N',
    employeeNo: toText(user.employeeNo),
    positionNm: toText(user.positionNm),
    employmentStatus: user.employmentStatus === 'LEAVE' || user.employmentStatus === 'RETIRED' ? user.employmentStatus : 'ACTIVE',
  }));
}

export async function createDepartment(payload: DepartmentPayload): Promise<DepartmentRow> {
  const result = await apiPost<{ item?: unknown }>(BASE_URL, payload);
  return itemFromResponse(result.item);
}

export async function updateDepartment(
  departmentId: number,
  payload: DepartmentPayload,
): Promise<DepartmentRow> {
  const result = await apiPut<{ item?: unknown }>(`${BASE_URL}/${departmentId}`, payload);
  return itemFromResponse(result.item);
}

export async function changeDepartmentUse(
  departmentId: number,
  useAt: DepartmentUseAt,
): Promise<DepartmentRow> {
  const result = await apiPut<{ item?: unknown }>(`${BASE_URL}/${departmentId}/use`, { useAt });
  return itemFromResponse(result.item);
}
