import type { ReactNode } from 'react';

export type MenuItem = {
  id: string;
  name: string;
  pageKey: string;
};

export type MenuPermission = {
  read: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
};

export type MenuNode = {
  menuId: number;
  parentMenuId: number | null;
  name: string;
  icon?: string;
  path?: string;
  permissions?: MenuPermission;
  children?: MenuNode[];
};

export type UserMenuResponse = {
  user: {
    userId: string;
    roles: string[];
  };
  menus: MenuNode[];
};

export type MenuTreeNode = {
  id: string;
  name: string;
  menuId?: number;
  pageKey?: string;
  permissions?: MenuPermission;
  children?: MenuTreeNode[];
};

export type ModuleItem = {
  id: string;
  name: string;
  icon: ReactNode;
  tree: MenuTreeNode[];
  menus: MenuItem[];
};

export type ContentCard = {
  label: string;
  value: string;
};

export type ContentItem = {
  title: string;
  meta: string;
  status?: string;
};

export type PageContent = {
  title: string;
  description: string;
  cards: ContentCard[];
  items: ContentItem[];
  kind?: 'summary' | 'roles' | 'menus';
};
