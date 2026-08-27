import { roleRows } from '../data/roleManagement.data';
import type { RoleManagementRow } from '../types/roleManagement.types';

export function getRoleRows(): RoleManagementRow[] {
  return roleRows;
}
