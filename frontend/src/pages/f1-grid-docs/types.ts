import type { ReactNode } from 'react';

export type PlaygroundKind =
  | 'row-height'
  | 'editing'
  | 'selection'
  | 'layout'
  | 'row-merge'
  | 'tree';

export type DocSection =
  | { type: 'prose'; heading: string; body: ReactNode }
  | { type: 'code'; heading: string; code: string }
  | { type: 'api'; heading: string; rows: Array<[string, string, string]> }
  | {
      type: 'related';
      heading: string;
      links: Array<{ id: string; label: string }>;
    };

export type F1GridDoc = {
  id: string;
  title: string;
  category: 'guide' | 'feature' | 'reference';
  description: string;
  sections: DocSection[];
  playground?: PlaygroundKind;
};
