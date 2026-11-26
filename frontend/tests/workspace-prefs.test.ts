import { describe, expect, it } from 'vitest';
import {
  applyColumnColors,
  defaultPrefs,
  reconcilePrefs,
} from '../src/pages/groupware/community/workspace/data/workspacePrefs';
import type { WorkspaceColumn } from '../src/pages/groupware/community/workspace/types/workspace.types';

const columns: WorkspaceColumn[] = [
  { id: 'c1', name: '요청' },
  { id: 'c2', name: '진행중' },
  { id: 'c3', name: '완료' },
];

describe('workspace view prefs', () => {
  it('defaults to every column visible in room order', () => {
    expect(defaultPrefs(columns)).toEqual({
      hiddenColumnIds: [],
      collapsedColumnIds: [],
      columnOrder: ['c1', 'c2', 'c3'],
      columnColors: {},
      onlyMine: false,
      keyword: '',
    });
  });

  it('drops ids of columns that no longer exist', () => {
    const prefs = {
      hiddenColumnIds: ['gone', 'c2'],
      collapsedColumnIds: ['gone'],
      columnOrder: ['c3', 'gone', 'c1', 'c2'],
      columnColors: { gone: '#ef4444', c2: '#3b82f6' },
      onlyMine: true,
      keyword: 'a',
    };
    expect(reconcilePrefs(prefs, columns)).toEqual({
      hiddenColumnIds: ['c2'],
      collapsedColumnIds: [],
      columnOrder: ['c3', 'c1', 'c2'],
      columnColors: { c2: '#3b82f6' },
      onlyMine: true,
      keyword: 'a',
    });
  });

  it('appends new columns last and visible', () => {
    const prefs = {
      hiddenColumnIds: [],
      collapsedColumnIds: [],
      columnOrder: ['c2', 'c1'],
      columnColors: {},
      onlyMine: false,
      keyword: '',
    };
    const result = reconcilePrefs(prefs, columns);
    expect(result.columnOrder).toEqual(['c2', 'c1', 'c3']);
    expect(result.hiddenColumnIds).toEqual([]);
  });

  it('returns equal content when prefs already match', () => {
    const prefs = defaultPrefs(columns);
    expect(reconcilePrefs(prefs, columns)).toEqual(prefs);
  });

  it('lets a personal color win over the room color and falls back to the room color otherwise', () => {
    const colored = [
      { id: 'c1', name: '요청', color: '#ef4444' },
      { id: 'c2', name: '진행중', color: '#22c55e' },
      { id: 'c3', name: '완료' },
    ];
    const prefs = { ...defaultPrefs(colored), columnColors: { c2: '#3b82f6', c3: '#8b5cf6' } };
    expect(applyColumnColors(colored, prefs).map((column) => column.color)).toEqual(['#ef4444', '#3b82f6', '#8b5cf6']);
    expect(applyColumnColors(colored, defaultPrefs(colored)).map((column) => column.color)).toEqual(['#ef4444', '#22c55e', undefined]);
  });
});
