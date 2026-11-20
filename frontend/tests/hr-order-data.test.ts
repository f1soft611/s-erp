import { describe, expect, it } from 'vitest';
import {
  buildProcessPayload,
  createHistoryColumns,
  createTargetColumns,
  createTargetRow,
  currentLabelOf,
  daysAgoString,
  sourceLabelOf,
  todayString,
  validateOrderInput,
} from '../src/pages/hr/order/data/orderGridData';
import { normalizeOrderHistory, normalizeOrderType } from '../src/pages/hr/order/services/order.service';
import type { OrderEmployee, OrderTargetRow, OrderTypeDef } from '../src/pages/hr/order/types/order.types';

const TRANSFER: OrderTypeDef = { code: 'TRANSFER', name: '부서이동', fieldCode: 'DEPARTMENT', fieldName: '부서', inputKind: 'department', codeGroup: '' };
const PROMOTION: OrderTypeDef = { code: 'PROMOTION', name: '승진', fieldCode: 'POSITION', fieldName: '직위', inputKind: 'code', codeGroup: 'POSITION' };
const LEAVE: OrderTypeDef = { code: 'LEAVE', name: '휴직', fieldCode: 'SUSPEND_DT', fieldName: '휴직일', inputKind: 'date', codeGroup: '' };

const EMPLOYEE: OrderEmployee = {
  userId: 11, employeeNo: '261101', userNm: '홍길동', departmentNm: '생산1팀', positionNm: '사원', levelNm: '대리',
  employmentTypeNm: '정규', suspendDt: '', backDt: '', retireDt: '', employmentStatus: 'ACTIVE',
};

const row = (overrides: Partial<OrderTargetRow> = {}): OrderTargetRow => ({
  ...createTargetRow(TRANSFER, EMPLOYEE, { value: '8', label: '경영지원팀' }), ...overrides,
});

describe('인사명령 화면 데이터', () => {
  it('명령 전 값은 유형이 바꾸는 항목의 현재 값이고 날짜 명령은 재직 상태를 보여 준다', () => {
    expect(currentLabelOf(TRANSFER, EMPLOYEE)).toBe('생산1팀');
    expect(currentLabelOf(PROMOTION, EMPLOYEE)).toBe('사원');
    expect(currentLabelOf({ ...PROMOTION, fieldCode: 'LEVEL' }, EMPLOYEE)).toBe('대리');
    expect(currentLabelOf({ ...PROMOTION, fieldCode: 'EMPLOYMENT_TYPE' }, EMPLOYEE)).toBe('정규');
    expect(currentLabelOf(LEAVE, EMPLOYEE)).toBe('재직');
    expect(currentLabelOf(LEAVE, { ...EMPLOYEE, employmentStatus: 'LEAVE', suspendDt: '2026-10-01' })).toBe('휴직 (2026-10-01~)');
  });

  it('명령 후 값 열은 입력 방식에 따라 부서 선택·공통코드 선택·날짜가 되고 사원 정보는 읽기 전용이다', () => {
    const postOf = (type: OrderTypeDef | undefined) =>
      createTargetColumns(type, { POSITION: [{ value: 'MANAGER', label: '과장' }] }, true).find((column) => column.field === 'postValue')!;

    expect(postOf(TRANSFER)).toMatchObject({ type: 'code', required: true, editable: true });
    expect(() => postOf(TRANSFER).onValueChange?.(row(), 'x')).toThrow('부서 선택');
    expect(postOf(PROMOTION)).toMatchObject({ type: 'select', options: [{ value: 'MANAGER', label: '과장' }] });
    expect(postOf(LEAVE)).toMatchObject({ type: 'date' });
    expect(postOf(TRANSFER).headerName).toBe('부서(명령 후)');

    const columns = createTargetColumns(TRANSFER, {}, true);
    expect(columns.filter((column) => column.field !== 'postValue').every((column) => column.editable === false)).toBe(true);
    expect(columns.find((column) => column.field === 'currentLabel')?.headerName).toBe('부서(명령 전)');
    expect(createTargetColumns(TRANSFER, {}, false).find((column) => column.field === 'postValue')?.editable).toBe(false);
  });

  it('부서 선택 버튼은 페이지가 준 핸들러를 호출한다', () => {
    const calls: unknown[] = [];
    const column = createTargetColumns(TRANSFER, {}, true, { onOpenDepartmentPicker: (apply) => calls.push(apply) })
      .find((candidate) => candidate.field === 'postValue')!;
    const applyPatch = () => undefined;
    expect(column.onOpenCodePicker?.(row(), applyPatch)).toBeUndefined();
    expect(calls).toEqual([applyPatch]);
  });

  it('입력 검증: 유형·명령일·대상·명령 후 값 순서로 확인한다', () => {
    const today = todayString();
    expect(validateOrderInput(undefined, today, [row()])).toBe('명령 유형을 선택해 주세요.');
    expect(validateOrderInput(TRANSFER, '', [row()])).toBe('명령일을 입력해 주세요.');
    expect(validateOrderInput(TRANSFER, '2999-01-01', [row()])).toBe('명령일은 오늘 이후로 입력할 수 없습니다.');
    expect(validateOrderInput(TRANSFER, today, [])).toBe('대상 사원을 선택해 주세요.');
    expect(validateOrderInput(TRANSFER, today, [row({ postValue: '' }), row({ userId: 12, userNm: '김철수', postValue: ' ' })]))
      .toBe('홍길동, 김철수: 명령 후 부서 값을 입력해 주세요.');
    expect(validateOrderInput(TRANSFER, today, [row()])).toBeNull();
  });

  it('처리 요청은 사원별 명령 후 값을 다듬어 보내고 비고는 앞뒤 공백을 지운다', () => {
    expect(buildProcessPayload(TRANSFER, '2026-11-20', '  조직 개편 ', [row(), row({ userId: 12, postValue: ' 9 ' })])).toEqual({
      orderType: 'TRANSFER',
      orderDt: '2026-11-20',
      remark: '조직 개편',
      items: [{ userId: 11, postValue: '8' }, { userId: 12, postValue: '9' }],
    });
  });

  it('날짜 도구와 출처 이름, 서버 응답 변환', () => {
    expect(todayString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(daysAgoString(30) < todayString()).toBe(true);
    expect(sourceLabelOf('DIRECT')).toBe('직접 수정');
    expect(sourceLabelOf('X')).toBe('X');
    expect(normalizeOrderType({ code: 'TRANSFER', name: '부서이동', fieldCode: 'DEPARTMENT', fieldName: '부서', inputKind: 'department', codeGroup: null }))
      .toEqual({ ...TRANSFER });
    expect(() => normalizeOrderType({ code: 'X', inputKind: 'weird' })).toThrow('유형 응답');
    expect(normalizeOrderHistory({ orderDtId: '5', orderId: 3, userId: 11, userNm: '홍', preName: null, postName: '경영지원팀' }))
      .toMatchObject({ orderDtId: 5, orderId: 3, preName: '', postName: '경영지원팀' });
    expect(() => normalizeOrderHistory({ orderId: 3 })).toThrow('처리 내역 ID');
    expect(createHistoryColumns().map((column) => column.headerName)).toEqual([
      'No', '처리일시', '명령일', '사원', '사번', '명령 유형', '변경항목', '명령 전', '명령 후', '출처', '처리자', '비고',
    ]);
  });
});
