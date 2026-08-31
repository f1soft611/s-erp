import adminUserMenus from '../data/adminUserMenus.json';
import { apiGet } from '../../../shared/services/apiClient';
import type {
  MenuItem,
  MenuNode,
  MenuPermission,
  MenuTreeNode,
  UserMenuResponse,
} from '../types/dashboard';

export const userMenuResponse = adminUserMenus as UserMenuResponse;

export type ModuleDescriptor = {
  id: string;
  name: string;
  iconName: string;
  tree: MenuTreeNode[];
  menus: MenuItem[];
};

const pathSegments = (path?: string): string[] =>
  (path ?? '').split('/').filter(Boolean);

const toModuleId = (node: MenuNode): string =>
  pathSegments(node.path)[0] ?? `module-${node.menuId}`;

const toNodeId = (node: MenuNode): string =>
  pathSegments(node.path).at(-1) ?? `menu-${node.menuId}`;

const toTreeNode = (node: MenuNode): MenuTreeNode => {
  const id = toNodeId(node);
  const children = node.children?.map(toTreeNode);

  return {
    id,
    menuId: node.menuId,
    name: node.name,
    ...(children?.length ? { children } : { pageKey: id }),
    ...(node.permissions ? { permissions: node.permissions } : {}),
  };
};

const flattenMenuTree = (nodes: MenuTreeNode[]): MenuItem[] =>
  nodes.flatMap((node) => {
    if (node.children?.length) {
      return flattenMenuTree(node.children);
    }

    return node.pageKey
      ? [{ id: node.id, name: node.name, pageKey: node.pageKey }]
      : [];
  });

export const buildModuleDescriptors = (
  response: UserMenuResponse,
): ModuleDescriptor[] =>
  response.menus.map((root) => {
    const tree = root.children?.map(toTreeNode) ?? [];

    return {
      id: toModuleId(root),
      name: root.name,
      iconName: root.icon ?? 'Settings',
      tree,
      menus: flattenMenuTree(tree),
    };
  });

export const moduleDescriptors: ModuleDescriptor[] =
  buildModuleDescriptors(userMenuResponse);

const collectPermissions = (
  moduleId: string,
  nodes: MenuTreeNode[],
  target: Map<string, MenuPermission>,
) => {
  nodes.forEach((node) => {
    if (node.permissions) {
      target.set(`${moduleId}:${node.id}`, node.permissions);
    }

    if (node.children?.length) {
      collectPermissions(moduleId, node.children, target);
    }
  });
};

export const buildMenuPermissionMap = (
  descriptors: ModuleDescriptor[],
): Map<string, MenuPermission> => {
  const map = new Map<string, MenuPermission>();
  descriptors.forEach((module) => {
    collectPermissions(module.id, module.tree, map);
  });
  return map;
};

export const menuPermissionMap: Map<string, MenuPermission> =
  buildMenuPermissionMap(moduleDescriptors);

export const getMenuPermission = (
  moduleId: string,
  menuId: string,
): MenuPermission | undefined => menuPermissionMap.get(`${moduleId}:${menuId}`);

/**
 * 로그인 사용자 기준 모듈-메뉴 트리를 백엔드에서 조회한다.
 * 실패 시 null을 반환하며, 호출부는 로컬 기본 데이터로 대체 처리한다.
 */
export const fetchMyMenus = async (): Promise<UserMenuResponse | null> => {
  try {
    return await apiGet<UserMenuResponse>('/api/v1/menus/my');
  } catch {
    return null;
  }
};
