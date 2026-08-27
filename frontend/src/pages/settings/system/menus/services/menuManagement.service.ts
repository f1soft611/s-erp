import { menuRows } from '../data/menuManagement.data';
import type { MenuManagementRow } from '../types/menuManagement.types';

export function getMenuRows(): MenuManagementRow[] {
  return menuRows;
}
