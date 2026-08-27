import adminUserMenus from '../data/adminUserMenus.json';
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

export const moduleDescriptors: ModuleDescriptor[] = userMenuResponse.menus.map(
  (root) => {
    const tree = root.children?.map(toTreeNode) ?? [];

    return {
      id: toModuleId(root),
      name: root.name,
      iconName: root.icon ?? 'Settings',
      tree,
      menus: flattenMenuTree(tree),
    };
  },
);

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

export const menuPermissionMap: Map<string, MenuPermission> = (() => {
  const map = new Map<string, MenuPermission>();
  moduleDescriptors.forEach((module) => {
    collectPermissions(module.id, module.tree, map);
  });
  return map;
})();

export const getMenuPermission = (
  moduleId: string,
  menuId: string,
): MenuPermission | undefined => menuPermissionMap.get(`${moduleId}:${menuId}`);
