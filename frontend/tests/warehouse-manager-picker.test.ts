import { describe, expect, it, vi } from 'vitest';
import { createWarehouseColumns, createWarehouseRow } from '../src/pages/co/master/warehouse/data/warehouseGridData';
import { toManagerPatch } from '../src/pages/co/master/warehouse/data/warehouseManager';

const managerColumn = (onOpen?: Parameters<typeof createWarehouseColumns>[2]) => {
  const column = createWarehouseColumns(true, [], onOpen).find((candidate) => candidate.field === 'managerUserId');
  if (!column) throw new Error('담당자 칸이 없습니다.');
  return column;
};

describe('창고 담당자 칸(사원 선택 도움창 연결)', () => {
  it('드롭다운이 아니라 선택 버튼(code) 칸이고 담당자명을 보여 준다', () => {
    const column = managerColumn();
    expect(column.type).toBe('code');
    expect(column.userOptions).toBeUndefined();
    expect(column.getValue?.({ ...createWarehouseRow(), managerUserId: 5, managerUserName: '홍길동' })).toBe('홍길동');
    expect(column.getValue?.(createWarehouseRow())).toBe('');
  });

  it('선택 버튼은 페이지가 준 핸들러를 현재 행과 적용 함수로 호출하고 반환 패치는 없다', () => {
    const onOpen = vi.fn();
    const apply = vi.fn();
    const row = createWarehouseRow();

    const returned = managerColumn(onOpen).onOpenCodePicker?.(row, apply);

    expect(onOpen).toHaveBeenCalledWith(row, apply);
    expect(returned).toBeUndefined();
  });

  it('직접 값을 바꾸는 것은 막는다', () => {
    expect(() => managerColumn().onValueChange?.(createWarehouseRow(), '7')).toThrow('사원 선택으로 담당자를 선택해 주세요.');
  });

  it('권한이 없으면 편집할 수 없고 담당부서는 계속 읽기 전용이다', () => {
    const columns = createWarehouseColumns(false, []);
    expect(columns.find((column) => column.field === 'managerUserId')?.editable).toBe(false);
    expect(columns.find((column) => column.field === 'departmentId')?.editable).toBe(false);
  });
});

describe('담당자 선택 결과를 창고 행 값으로 바꾸기', () => {
  it('담당자와 담당부서를 함께 설정한다', () => {
    expect(toManagerPatch({
      departmentId: 5, departmentNm: '생산1팀', userId: 11, positionCode: 'MANAGER', positionNm: '과장', employeeNo: '261101', userNm: '홍길동',
    })).toEqual({ managerUserId: 11, managerUserName: '홍길동', departmentId: 5, departmentName: '생산1팀' });
  });

  it('부서가 없는 사원이면 담당부서를 비운다', () => {
    expect(toManagerPatch({
      departmentId: null, departmentNm: '', userId: 13, positionCode: '', positionNm: '', employeeNo: '261103', userNm: '무소속',
    })).toEqual({ managerUserId: 13, managerUserName: '무소속', departmentId: null, departmentName: '' });
  });

  it('선택 해제는 담당자와 담당부서를 모두 비운다', () => {
    expect(toManagerPatch(null)).toEqual({ managerUserId: null, managerUserName: '', departmentId: null, departmentName: '' });
  });
});
