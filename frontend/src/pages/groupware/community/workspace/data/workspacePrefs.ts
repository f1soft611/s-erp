import type { WorkspaceColumn, WorkspaceViewPrefs } from '../types/workspace.types';

export function defaultPrefs(columns: WorkspaceColumn[]): WorkspaceViewPrefs {
  return {
    hiddenColumnIds: [],
    collapsedColumnIds: [],
    columnOrder: columns.map((column) => column.id),
    columnColors: {},
    onlyMine: false,
    keyword: '',
  };
}

// 방 컬럼이 바뀐 뒤에도 개인 설정이 유효하도록 보정한다.
// 삭제된 컬럼 ID는 버리고, 새 컬럼은 보이는 상태로 순서 맨 뒤에 붙인다.
export function reconcilePrefs(
  prefs: WorkspaceViewPrefs,
  columns: WorkspaceColumn[],
): WorkspaceViewPrefs {
  const ids = new Set(columns.map((column) => column.id));
  const keep = (list: string[]) => list.filter((id) => ids.has(id));
  const ordered = keep(prefs.columnOrder);
  const missing = columns.map((column) => column.id).filter((id) => !ordered.includes(id));
  return {
    ...prefs,
    hiddenColumnIds: keep(prefs.hiddenColumnIds),
    collapsedColumnIds: keep(prefs.collapsedColumnIds),
    columnOrder: [...ordered, ...missing],
    columnColors: Object.fromEntries(Object.entries(prefs.columnColors ?? {}).filter(([id]) => ids.has(id))),
  };
}

/** 사용자별로 바꾼 색을 방 설정의 색 위에 덮어씌운 컬럼 목록을 만든다. */
export function applyColumnColors(columns: WorkspaceColumn[], prefs: WorkspaceViewPrefs): WorkspaceColumn[] {
  return columns.map((column) => {
    const color = prefs.columnColors?.[column.id] ?? column.color;
    return color ? { ...column, color } : { ...column, color: undefined };
  });
}
