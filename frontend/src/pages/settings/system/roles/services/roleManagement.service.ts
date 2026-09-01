import {
  apiGet,
  apiPost,
  apiPut,
} from '../../../../../shared/services/apiClient';
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

export async function fetchRoleRows(): Promise<RoleManagementRow[]> {
  const result = await apiGet<{ resultList: SystemRoleVO[] }>(
    '/api/v1/system/roles',
  );
  return result.resultList.map(toRow);
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
