import type { DepartmentPickerDepartment, DepartmentPickerRow } from './departmentPicker.types';

/** 회사(트리 최상단) 노드의 행 ID. 실제 부서 ID는 항상 양수라서 겹치지 않는다. */
export const PICKER_COMPANY_ROW_ID = -1;

/** "생산팀 > 생산1팀" 형태의 경로(회사는 포함하지 않는다). */
export function buildDepartmentPath(departments: DepartmentPickerDepartment[], departmentId: number): string {
  const byId = new Map(departments.map((row) => [row.departmentId, row]));
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

/**
 * 회사 노드를 맨 위에 얹고 최상위 부서를 회사 아래로 연결한 트리 행을 만든다.
 * 검색어가 있으면 부서명에 검색어가 들어간 부서와 그 상위 부서(경로)만 남긴다. 회사 노드는 항상 남는다.
 */
export function buildPickerRows(
  companyName: string,
  departments: DepartmentPickerDepartment[],
  keyword = '',
): DepartmentPickerRow[] {
  const needle = keyword.trim().toLowerCase();
  let visible = departments;
  if (needle) {
    const byId = new Map(departments.map((row) => [row.departmentId, row]));
    const keep = new Set<number>();
    departments.forEach((row) => {
      if (!row.departmentNm.toLowerCase().includes(needle)) return;
      let current: DepartmentPickerDepartment | undefined = row;
      while (current && !keep.has(current.departmentId)) {
        keep.add(current.departmentId);
        current = current.parentDepartmentId === null ? undefined : byId.get(current.parentDepartmentId);
      }
    });
    visible = departments.filter((row) => keep.has(row.departmentId));
  }
  return [
    { departmentId: PICKER_COMPANY_ROW_ID, parentDepartmentId: null, departmentNm: companyName || '회사', isCompany: true },
    ...visible.map((row) => (row.parentDepartmentId === null
      ? { ...row, parentDepartmentId: PICKER_COMPANY_ROW_ID }
      : row)),
  ];
}
