import type { ReactNode } from 'react';

export type MenuItem = {
  id: string;
  name: string;
  pageKey: string;
};

export type MenuTreeNode = {
  id: string;
  name: string;
  pageKey?: string;
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
};
