import { buildModuleItems } from '../../src/pages/dashboard/services/dashboardData';
import { buildModuleDescriptors } from '../../src/pages/dashboard/services/menuService';

export const settingsModule = buildModuleItems(buildModuleDescriptors({
  user: { userId: 'test-user', roles: [] },
  menus: [{
    menuId: 1,
    parentMenuId: null,
    name: '환경설정',
    path: '/settings',
    icon: 'Settings',
    children: [{
      menuId: 2,
      parentMenuId: 1,
      name: 'F1 Grid 테스트',
      path: '/settings/system/f1-grid-test',
      permissions: { read: true, create: false, update: false, delete: false },
    }],
  }],
}))[0];
