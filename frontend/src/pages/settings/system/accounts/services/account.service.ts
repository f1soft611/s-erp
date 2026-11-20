import { apiGet, apiPost, apiPut } from '../../../../../shared/services/apiClient';
import type {
  AccountFilters,
  AccountRole,
  AccountRow,
  PasswordResetResult,
  RoleOption,
} from '../types/account.types';

const BASE_URL = '/api/v1/system/accounts';

type ApiRow = Record<string, unknown>;

function isApiRow(value: unknown): value is ApiRow {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return value == null ? '' : String(value);
}

function requiredId(value: unknown, label: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} 응답을 확인할 수 없습니다.`);
  }
  return parsed;
}

function normalizeRole(source: unknown): AccountRole {
  if (!isApiRow(source)) throw new Error('역할 응답을 확인할 수 없습니다.');
  return { roleId: requiredId(source.roleId, '역할 ID'), roleCode: text(source.roleCode), roleNm: text(source.roleNm) };
}

export function normalizeAccountRow(source: ApiRow): AccountRow {
  const userId = Number(source.userId);
  return {
    loginId: requiredId(source.loginId, '계정 ID'),
    loginCode: text(source.loginCode),
    userId: Number.isSafeInteger(userId) && userId > 0 ? userId : null,
    userNm: text(source.userNm),
    employeeNo: text(source.employeeNo),
    departmentNm: text(source.departmentNm),
    positionNm: text(source.positionNm),
    useAt: source.useAt === 'N' ? 'N' : 'Y',
    locked: source.locked === true,
    retired: source.retired === true,
    passwordChangeRequired: source.passwordChangeRequired === true,
    passwordChangedAt: text(source.passwordChangedAt),
    hasPhoto: source.hasPhoto === true,
    roles: Array.isArray(source.roles) ? source.roles.map(normalizeRole) : [],
  };
}

function itemFromResponse(value: unknown): AccountRow {
  if (!isApiRow(value)) throw new Error('계정 응답을 확인할 수 없습니다.');
  return normalizeAccountRow(value);
}

export async function fetchAccounts(filters: AccountFilters): Promise<AccountRow[]> {
  const query = new URLSearchParams({ status: filters.status });
  if (filters.keyword.trim()) query.set('keyword', filters.keyword.trim());
  const result = await apiGet<{ resultList?: unknown }>(`${BASE_URL}?${query.toString()}`);
  if (!Array.isArray(result.resultList) || !result.resultList.every(isApiRow)) {
    throw new Error('계정 목록 응답을 확인할 수 없습니다.');
  }
  return result.resultList.map(normalizeAccountRow);
}

/** 계정 허용(Y)/미허용(N). */
export async function updateAccountStatus(loginId: number, useAt: 'Y' | 'N'): Promise<AccountRow> {
  const result = await apiPut<{ item?: unknown }>(`${BASE_URL}/${loginId}/status`, { useAt });
  return itemFromResponse(result.item);
}

/** 비밀번호 초기화. 응답의 임시 비밀번호는 이 한 번만 받을 수 있다. */
export async function resetAccountPassword(loginId: number): Promise<PasswordResetResult> {
  const result = await apiPost<{ item?: unknown }>(`${BASE_URL}/${loginId}/password-reset`, {});
  const item = result.item;
  if (!isApiRow(item) || !text(item.temporaryPassword)) {
    throw new Error('임시 비밀번호 응답을 확인할 수 없습니다.');
  }
  return {
    loginId: requiredId(item.loginId, '계정 ID'),
    loginCode: text(item.loginCode),
    temporaryPassword: text(item.temporaryPassword),
  };
}

export async function unlockAccount(loginId: number): Promise<AccountRow> {
  const result = await apiPost<{ item?: unknown }>(`${BASE_URL}/${loginId}/unlock`, {});
  return itemFromResponse(result.item);
}

export async function updateAccountRoles(loginId: number, roleIds: number[]): Promise<AccountRow> {
  const result = await apiPut<{ item?: unknown }>(`${BASE_URL}/${loginId}/roles`, { roleIds });
  return itemFromResponse(result.item);
}

/** 역할 변경 팝업의 선택지: 사용 중인 역할 목록. */
export async function fetchRoleOptions(): Promise<RoleOption[]> {
  const result = await apiGet<{ resultList?: unknown }>('/api/v1/system/roles');
  if (!Array.isArray(result.resultList) || !result.resultList.every(isApiRow)) {
    throw new Error('역할 목록 응답을 확인할 수 없습니다.');
  }
  return result.resultList
    .filter((role) => role.useAt === 'Y')
    .map((role) => ({ roleId: requiredId(role.roleId, '역할 ID'), roleCode: text(role.roleCode), roleNm: text(role.roleNm) }));
}
