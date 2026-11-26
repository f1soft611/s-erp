import { describe, expect, it } from 'vitest';
import {
  NO_DEPARTMENT_LABEL,
  groupByDepartment,
  splitVisible,
} from '../src/pages/groupware/documents/write/data/documentReferenceGroups';

describe('documentReferenceGroups', () => {
  const items = [
    { id: 1, dept: '영업팀' },
    { id: 2, dept: null },
    { id: 3, dept: '개발팀' },
    { id: 4, dept: '영업팀' },
    { id: 5, dept: '  ' },
  ];

  it('부서별로 묶고 부서명 순, 부서없음은 마지막, 항목 순서는 유지한다', () => {
    const groups = groupByDepartment(items, (item) => item.dept);
    expect(groups.map((group) => group.department)).toEqual([
      '개발팀',
      '영업팀',
      NO_DEPARTMENT_LABEL,
    ]);
    expect(groups[1].items.map((item) => item.id)).toEqual([1, 4]);
    expect(groups[2].items.map((item) => item.id)).toEqual([2, 5]);
  });

  it('100명도 앞 N명만 보이고 나머지 수를 돌려준다', () => {
    const many = Array.from({ length: 100 }, (_, index) => index);
    const { visible, hiddenCount } = splitVisible(many, 3);
    expect(visible).toEqual([0, 1, 2]);
    expect(hiddenCount).toBe(97);
    expect(splitVisible([1, 2], 3)).toEqual({ visible: [1, 2], hiddenCount: 0 });
  });
});
