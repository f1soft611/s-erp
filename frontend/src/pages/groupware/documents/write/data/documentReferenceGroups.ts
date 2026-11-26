export const NO_DEPARTMENT_LABEL = '부서없음';

export type DepartmentGroup<T> = {
  department: string;
  items: T[];
};

export function groupByDepartment<T>(
  items: T[],
  getDepartment: (item: T) => string | null | undefined,
): DepartmentGroup<T>[] {
  const groups = new Map<string, T[]>();
  items.forEach((item) => {
    const department = getDepartment(item)?.trim() || NO_DEPARTMENT_LABEL;
    const group = groups.get(department);
    if (group) group.push(item);
    else groups.set(department, [item]);
  });
  return [...groups.entries()]
    .map(([department, grouped]) => ({ department, items: grouped }))
    .sort((a, b) => {
      if (a.department === NO_DEPARTMENT_LABEL) return 1;
      if (b.department === NO_DEPARTMENT_LABEL) return -1;
      return a.department.localeCompare(b.department, 'ko');
    });
}

export function splitVisible<T>(
  items: T[],
  limit: number,
): { visible: T[]; hiddenCount: number } {
  return {
    visible: items.slice(0, limit),
    hiddenCount: Math.max(0, items.length - limit),
  };
}
