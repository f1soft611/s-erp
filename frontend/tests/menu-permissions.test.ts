import { describe, expect, it } from 'vitest';
import {
  buildMenuPermissionMap,
  buildModuleDescriptors,
  getMenuPermission,
  moduleDescriptors,
} from '../src/pages/dashboard/services/menuService';

const allowed = {
  read: true,
  create: true,
  update: true,
  delete: true,
  excel: true,
};

const adminMenus = {
  user: { userId: 'admin', roles: ['ADMIN'] },
  menus: [
    {
      menuId: 100,
      parentMenuId: null,
      name: '그룹웨어',
      icon: 'Groups',
      path: '/groupware',
      children: [
        {
          menuId: 101,
          parentMenuId: 100,
          name: '종합현황',
          path: '/groupware/overview',
          permissions: allowed,
        },
        {
          menuId: 102,
          parentMenuId: 100,
          name: '문서관리',
          path: '/groupware/documents',
          permissions: allowed,
        },
      ],
    },
    {
      menuId: 200,
      parentMenuId: null,
      name: '환경설정',
      icon: 'Settings',
      path: '/settings',
      children: [
        {
          menuId: 210,
          parentMenuId: 200,
          name: '시스템 관리',
          path: '/settings/system',
          children: [
            {
              menuId: 211,
              parentMenuId: 210,
              name: '권한관리',
              path: '/settings/system/roles',
              permissions: allowed,
            },
            {
              menuId: 212,
              parentMenuId: 210,
              name: '메뉴관리',
              path: '/settings/system/menus',
              permissions: allowed,
            },
          ],
        },
      ],
    },
  ],
};

describe('User menu descriptors', () => {
  it('starts empty until the user menus are loaded from the API', () => {
    expect(moduleDescriptors).toEqual([]);
  });

  it('builds one module per root menu from the menu response', () => {
    const modules = buildModuleDescriptors(adminMenus);

    expect(modules.map((module) => module.id)).toEqual([
      'groupware',
      'settings',
    ]);
  });

  it('maps module root menus to their child menu tree', () => {
    const [groupware, settings] = buildModuleDescriptors(adminMenus);

    expect(groupware.tree.map((node) => node.name)).toEqual([
      '종합현황',
      '문서관리',
    ]);
    expect(settings.tree.map((node) => node.name)).toEqual(['시스템 관리']);
    expect(settings.tree[0].children?.map((node) => node.name)).toEqual([
      '권한관리',
      '메뉴관리',
    ]);
    expect(groupware.menus.map((menu) => menu.pageKey)).toEqual([
      'overview',
      'documents',
    ]);
    expect(settings.menus.map((menu) => menu.pageKey)).toEqual([
      'roles',
      'menus',
    ]);
  });

  it('exposes the permissions of each leaf menu by module and menu id', () => {
    const permissions = buildMenuPermissionMap(
      buildModuleDescriptors(adminMenus),
    );

    [
      'groupware:overview',
      'groupware:documents',
      'settings:roles',
      'settings:menus',
    ].forEach((key) => {
      expect(permissions.get(key)).toEqual(allowed);
    });
  });

  it('returns undefined for an unknown menu', () => {
    expect(getMenuPermission('groupware', 'unknown')).toBeUndefined();
  });

  it('hides menu leaves whose effective permissions are all false', () => {
    const modules = buildModuleDescriptors({
      user: { userId: 'admin', roles: ['ADMIN'] },
      menus: [
        {
          menuId: 200,
          parentMenuId: null,
          name: '환경설정',
          icon: 'Settings',
          path: '/settings',
          children: [
            {
              menuId: 210,
              parentMenuId: 200,
              name: '시스템 관리',
              path: '/settings/system',
              children: [
                {
                  menuId: 211,
                  parentMenuId: 210,
                  name: '권한관리',
                  path: '/settings/system/roles',
                  permissions: {
                    read: false,
                    create: false,
                    update: false,
                    delete: false,
                    excel: false,
                  },
                },
                {
                  menuId: 212,
                  parentMenuId: 210,
                  name: '메뉴관리',
                  path: '/settings/system/menus',
                  permissions: {
                    read: true,
                    create: false,
                    update: false,
                    delete: false,
                    excel: false,
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    expect(modules[0].menus.map((menu) => menu.name)).toEqual(['메뉴관리']);
    expect(modules[0].tree[0].children?.map((node) => node.name)).toEqual([
      '메뉴관리',
    ]);
  });
});
