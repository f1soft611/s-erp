import type { DepartmentRow, DepartmentTreeRow } from '../types/department.types';

/** 회사(트리 최상단) 노드의 행 ID. 실제 부서 ID는 항상 양수라서 겹치지 않는다. */
export const COMPANY_ROW_ID = -1;

/**
 * 부서 목록 맨 위에 회사 노드를 얹고, 최상위 부서(상위 없음)를 회사 아래로 연결한 트리 행을 만든다.
 * 회사 노드는 화면에서만 만들므로 편집·사용안함·이동 대상이 될 수 없고, 이름은 회사정보의 회사명을 따른다.
 */
export function buildTreeRows(companyName: string, departments: DepartmentRow[]): DepartmentTreeRow[] {
  const company: DepartmentTreeRow = {
    departmentId: COMPANY_ROW_ID,
    parentDepartmentId: null,
    departmentNm: companyName || '회사',
    managerUserId: null,
    managerUserNm: '',
    departmentDc: '',
    sortOrder: -1,
    useAt: 'Y',
    childCount: departments.filter((row) => row.parentDepartmentId === null).length,
    userCount: 0,
    isCompany: true,
  };
  return [
    company,
    ...departments.map((row) => (row.parentDepartmentId === null
      ? { ...row, parentDepartmentId: COMPANY_ROW_ID }
      : row)),
  ];
}

/** 부서 자신을 제외한 모든 하위 부서 ID(순환 방지용 상위 부서 후보 제외에 쓴다). */
export function collectDescendantIds(rows: DepartmentRow[], departmentId: number): Set<number> {
  const childrenByParent = new Map<number, number[]>();
  rows.forEach((row) => {
    if (row.parentDepartmentId === null) return;
    const siblings = childrenByParent.get(row.parentDepartmentId) ?? [];
    siblings.push(row.departmentId);
    childrenByParent.set(row.parentDepartmentId, siblings);
  });
  const result = new Set<number>();
  const stack = [departmentId];
  while (stack.length > 0) {
    const current = stack.pop() as number;
    (childrenByParent.get(current) ?? []).forEach((childId) => {
      if (result.has(childId)) return;
      result.add(childId);
      stack.push(childId);
    });
  }
  return result;
}

/** "본사 > 영업팀" 형태의 경로. 동명 부서를 구분하는 데 쓴다. */
export function buildDepartmentPath(rows: DepartmentRow[], departmentId: number): string {
  const byId = new Map(rows.map((row) => [row.departmentId, row]));
  const names: string[] = [];
  const visited = new Set<number>();
  let current = byId.get(departmentId);
  while (current && !visited.has(current.departmentId)) {
    visited.add(current.departmentId);
    names.unshift(current.departmentNm);
    current = current.parentDepartmentId === null ? undefined : byId.get(current.parentDepartmentId);
  }
  return names.join(' > ');
}

/** 상위 부서로 고를 수 있는 사용 중인 부서 후보(자기 자신과 하위 부서는 제외). */
export function listParentCandidates(
  rows: DepartmentRow[],
  editingDepartmentId: number | null,
): Array<{ departmentId: number; label: string }> {
  const excluded = editingDepartmentId === null
    ? new Set<number>()
    : collectDescendantIds(rows, editingDepartmentId).add(editingDepartmentId);
  return rows
    .filter((row) => row.useAt === 'Y' && !excluded.has(row.departmentId))
    .map((row) => ({ departmentId: row.departmentId, label: buildDepartmentPath(rows, row.departmentId) }))
    .sort((left, right) => left.label.localeCompare(right.label, 'ko'));
}
