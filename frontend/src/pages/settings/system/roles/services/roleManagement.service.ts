import {
  apiGet,
  apiPost,
  apiPut,
} from '../../../../../shared/services/apiClient';
import { roleRows as mockRoleRows } from '../data/roleManagement.data';
import type { RoleManagementRow } from '../types/roleManagement.types';

interface SystemRoleVO {
  roleId: number;
  tenantId: number;
  roleCode: string;
  roleNm: string;
  roleDc: string;
  useAt: string;
  isSystemRole: string;
}

export interface RoleSavePayload {
  roleCode: string;
  roleNm: string;
  roleDc?: string;
  useAt?: string;
}

const toRow = (role: SystemRoleVO): RoleManagementRow => ({
  id: String(role.roleId),
  name: role.roleNm,
  description: role.roleDc ?? '',
  group: role.roleCode,
  menuCount: 0,
  active: role.useAt === 'Y',
  permissions: {
    read: true,
    create: role.useAt === 'Y',
    update: role.useAt === 'Y',
    delete: role.useAt === 'Y',
  },
});

/**
 * 실제 API에서 역할 목록을 조회한다. 실패 시 로컬 목업으로 대체한다.
 */
export async function fetchRoleRows(): Promise<RoleManagementRow[]> {
  try {
    const result = await apiGet<{ resultList: SystemRoleVO[] }>(
      '/api/v1/system/roles',
    );
    return result.resultList.map(toRow);
  } catch {
    return mockRoleRows;
  }
}

export async function createRole(payload: RoleSavePayload): Promise<void> {
  await apiPost('/api/v1/system/roles', { useAt: 'Y', ...payload });
}

export async function updateRole(
  roleId: string,
  payload: RoleSavePayload,
): Promise<void> {
  await apiPut(`/api/v1/system/roles/${roleId}`, { useAt: 'Y', ...payload });
}

/** @deprecated 로컬 목업 동기 조회. 실제 데이터는 fetchRoleRows를 사용한다. */
export function getRoleRows(): RoleManagementRow[] {
  return mockRoleRows;
}
