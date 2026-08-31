import { apiGet } from '../../../../../shared/services/apiClient';
import { menuRows as mockMenuRows } from '../data/menuManagement.data';
import type { MenuManagementRow } from '../types/menuManagement.types';

interface SystemMenuVO {
  menuId: number;
  moduleId: number;
  moduleNm: string;
  parentMenuId: number | null;
  parentMenuNm: string | null;
  menuCode: string;
  menuNm: string;
  menuUrl: string | null;
  sortOrder: number;
  useAt: string;
}

const toRow = (menu: SystemMenuVO): MenuManagementRow => ({
  id: String(menu.menuId),
  code: menu.menuCode,
  name: menu.menuNm,
  parent: menu.parentMenuNm ?? menu.moduleNm,
  order: menu.sortOrder,
  enabled: menu.useAt === 'Y',
  status: 'confirmed',
  description: menu.menuUrl ?? '',
  permissionGroup: menu.moduleNm,
});

/**
 * 실제 API에서 메뉴 목록을 조회한다. 실패 시 로컬 목업으로 대체한다.
 */
export async function fetchMenuRows(): Promise<MenuManagementRow[]> {
  try {
    const result = await apiGet<{ resultList: SystemMenuVO[] }>(
      '/api/v1/system/menus',
    );
    return result.resultList.map(toRow);
  } catch {
    return mockMenuRows;
  }
}

/** @deprecated 로컬 목업 동기 조회. 실제 데이터는 fetchMenuRows를 사용한다. */
export function getMenuRows(): MenuManagementRow[] {
  return mockMenuRows;
}
