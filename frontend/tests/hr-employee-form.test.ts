import { describe, expect, it, vi } from 'vitest';
import {
  createEmployeeColumns,
  createEmployeeRow,
  isIssuingAccount,
  isNewEmployeeRow,
} from '../src/pages/hr/employee/data/employeeGridData';
import { toEmployeePayload } from '../src/pages/hr/employee/data/employeePayload';
import { toEmployeeFilters } from '../src/pages/hr/employee/data/employeeSearchFields';
import { normalizeEmployeeRow } from '../src/pages/hr/employee/services/employee.service';
import type { EmployeeCodeOptions, EmployeeRow } from '../src/pages/hr/employee/types/employee.types';
import { buildGridFormSections } from '../src/shared/components/f1-grid/form/GridFormModel';
import { validateGridRow } from '../src/shared/components/f1-grid/validation/GridValidation';

const OPTIONS: EmployeeCodeOptions = {
  position: [{ value: 'MANAGER', label: '과장' }],
  gender: [{ value: 'MALE', label: '남' }],
  employmentType: [{ value: 'REGULAR', label: '정규' }],
  nativeType: [{ value: 'DOMESTIC', label: '내국인' }, { value: 'FOREIGN', label: '외국인' }],
  birthCalendar: [{ value: 'SOLAR', label: '양력' }],
  country: [{ value: 'USA', label: '미국' }],
  level: [{ value: '7', label: '대리' }],
};

const columnsFor = (canEdit = true, handlers = {}) => createEmployeeColumns(canEdit, OPTIONS, handlers);
const columnOf = (field: keyof EmployeeRow, canEdit = true) => {
  const column = columnsFor(canEdit).find((candidate) => candidate.field === field);
  if (!column) throw new Error(`${String(field)} 컬럼이 없습니다.`);
  return column;
};

function validRow(overrides: Partial<EmployeeRow> = {}): EmployeeRow {
  return {
    ...createEmployeeRow(), userNm: '홍길동', departmentId: 5, departmentNm: '생산1팀', positionCode: 'MANAGER',
    joinDt: '2026-11-05', ...overrides,
  };
}

const errorsOf = (row: EmployeeRow) => validateGridRow(row, columnsFor());
const sectionsOf = (row: EmployeeRow) => buildGridFormSections(columnsFor(), row)
  .map((section) => [section.group, section.fields.map((field) => String(field.field))] as const);

describe('사원 공통 행 폼 컬럼 규칙', () => {
  it('필수는 이름·부서·직위·입사일뿐이고 근무형태는 필수가 아니다', () => {
    const required = columnsFor().filter((column) => column.required).map((column) => String(column.field));
    expect(required).toEqual(['userNm', 'departmentId', 'positionCode', 'joinDt']);
    expect(columnOf('employmentTypeCode').required).toBeFalsy();
    expect(columnOf('employmentTypeCode').requiredMark).toBeFalsy();
  });

  it('필수값이 비어 있으면 해당 칸별로 오류를 돌려준다(공통 폼이 그 칸을 빨간 테두리로 표시한다)', () => {
    expect(Object.keys(errorsOf(createEmployeeRow()))).toEqual(['userNm', 'departmentId', 'positionCode', 'joinDt']);
    expect(errorsOf(createEmployeeRow()).departmentId).toContain('부서');
    expect(errorsOf(validRow())).toEqual({});
  });

  it('사번·이메일·날짜 순서 형식을 검사한다', () => {
    expect(errorsOf(validRow({ employeeNo: 'A-1' })).employeeNo).toContain('사번');
    expect(errorsOf(validRow({ employeeNo: '261105' }))).toEqual({});
    expect(errorsOf(validRow({ emailAddr: 'nope' })).emailAddr).toContain('이메일');
    expect(errorsOf(validRow({ retireDt: '2026-11-04' })).retireDt).toContain('퇴사일');
    expect(errorsOf(validRow({ suspendDt: '2026-11-10', backDt: '2026-11-09' })).backDt).toContain('복직일');
  });

  it('로그인 아이디·초기 비밀번호는 계정을 새로 발급할 때만 검사한다', () => {
    expect(errorsOf(validRow({ realUserAt: 'Y', loginCode: 'a' })).loginCode).toContain('로그인 아이디');
    expect(errorsOf(validRow({ realUserAt: 'Y', loginCode: 'hong.gd', initialPassword: 'short' })).initialPassword).toContain('8자');
    expect(errorsOf(validRow({ realUserAt: 'Y', loginCode: '', initialPassword: 'long-enough-1' }))).toEqual({});
    // 계정이 이미 있거나 실사용자가 아니면 두 칸은 검사하지 않는다.
    expect(errorsOf(validRow({ realUserAt: 'Y', loginId: 55, loginCode: 'x', initialPassword: '' }))).toEqual({});
    expect(errorsOf(validRow({ realUserAt: 'N', loginCode: 'x' }))).toEqual({});
  });

  it('사번은 새 행에서만, 실사용자는 계정이 없을 때만, 외국인 칸은 외국인일 때만 입력할 수 있다', () => {
    const saved = validRow({ userId: '5' });
    expect(isNewEmployeeRow(createEmployeeRow())).toBe(true);
    expect(isNewEmployeeRow(saved)).toBe(false);
    const editable = (field: keyof EmployeeRow, row: EmployeeRow) => {
      const flag = columnOf(field).editable;
      return typeof flag === 'function' ? flag(row) : Boolean(flag);
    };
    expect(editable('employeeNo', createEmployeeRow())).toBe(true);
    expect(editable('employeeNo', saved)).toBe(false);
    expect(editable('realUserAt', saved)).toBe(true);
    expect(editable('realUserAt', validRow({ userId: '5', loginId: 55, realUserAt: 'Y' }))).toBe(false);
    expect(editable('loginCode', validRow({ realUserAt: 'Y' }))).toBe(true);
    expect(editable('loginCode', validRow({ realUserAt: 'N' }))).toBe(false);
    expect(editable('initialPassword', validRow({ realUserAt: 'Y', loginId: 55 }))).toBe(false);
    expect(editable('nationalityCode', validRow({ nativeTypeCode: 'DOMESTIC' }))).toBe(false);
    expect(editable('nationalityCode', validRow({ nativeTypeCode: 'FOREIGN' }))).toBe(true);
    expect(isIssuingAccount(validRow({ realUserAt: 'Y' }))).toBe(true);
    expect(isIssuingAccount(validRow({ realUserAt: 'Y', loginId: 1 }))).toBe(false);
  });

  it('권한이 없으면 모든 칸이 읽기 전용이다', () => {
    const readOnly = columnsFor(false).filter((column) => column.type !== 'rownumber');
    for (const column of readOnly) {
      const flag = column.editable;
      expect(typeof flag === 'function' ? flag(validRow({ realUserAt: 'Y', nativeTypeCode: 'FOREIGN' })) : flag, String(column.field)).toBeFalsy();
    }
  });

  it('행 폼은 기본 → 개인·연락 → 내/외국인 순이고 조건에 따라 외국인·시스템 사용 칸이 나타난다', () => {
    const fresh = sectionsOf(createEmployeeRow());
    expect(fresh.map(([group]) => group)).toEqual(['기본 정보', '개인·연락 정보', '내/외국인', '시스템 사용']);
    expect(fresh[0][1]).toEqual([
      'employeeNo', 'userNm', 'englishNm', 'departmentId', 'positionCode', 'levelId', 'genderCode',
      'employmentTypeCode', 'joinDt', 'retireDt', 'suspendDt', 'backDt',
    ]);
    expect(fresh[1][1]).toEqual([
      'birthDt', 'birthCalendarCode', 'mobileNo', 'homePhoneNo', 'emailAddr', 'postalCode', 'address', 'addressDetail',
    ]);
    // 사진은 첨부 성격이라 "시스템 사용" 섹션 맨 아래에 둔다.
    expect(fresh[3][1]).toEqual(['realUserAt', 'photoImage']);

    const withAccount = sectionsOf(validRow({ realUserAt: 'Y', nativeTypeCode: 'FOREIGN' }));
    expect(withAccount.map(([group]) => group)).toContain('외국인 정보');
    expect(withAccount.find(([group]) => group === '시스템 사용')?.[1]).toEqual(['realUserAt', 'loginCode', 'initialPassword', 'photoImage']);

    // 이미 저장된 사원(계정 있음)도 사번·실사용자·로그인 아이디는 읽기 전용으로 폼에 보이고, 초기 비밀번호만 나오지 않는다.
    const saved = sectionsOf(validRow({ userId: '5', realUserAt: 'Y', loginId: 55, loginCode: 'hong.gd' }));
    expect(saved[0][1]).toContain('employeeNo');
    expect(saved.find(([group]) => group === '시스템 사용')?.[1]).toEqual(['realUserAt', 'loginCode', 'photoImage']);
  });

  it('초기 비밀번호는 목록에는 숨기고 행 폼에서는 비밀번호 입력으로 보여 주며, 재직상태는 폼에 넣지 않는다', () => {
    const password = columnOf('initialPassword');
    expect(password.hidden).toBe(true);
    expect(password.form).toMatchObject({ hidden: false, inputType: 'password' });
    expect(columnOf('employmentStatus').form?.hidden).toBe(true);
    expect(columnOf('photoImage').type).toBe('image');
    expect(columnOf('photoImage').imageOptions).toMatchObject({ shape: 'circle', formSize: 120, compress: { maxSide: 320, maxLength: 700 * 1024 } });
    expect(columnOf('photoImage').form).toMatchObject({ group: '시스템 사용', order: 4, groupOrder: 99 });
    expect(columnOf('userNm').form).toMatchObject({ targetField: 'userNm', targetLabel: '사원' });
  });

  it('부서·우편번호·주소는 선택 버튼 칸이라 직접 입력할 수 없고 페이지가 준 핸들러를 호출한다', () => {
    const onOpenDepartmentPicker = vi.fn();
    const onOpenPostcodePicker = vi.fn();
    const columns = columnsFor(true, { onOpenDepartmentPicker, onOpenPostcodePicker });
    const apply = vi.fn();
    const row = validRow();
    for (const field of ['departmentId', 'postalCode', 'address'] as const) {
      const column = columns.find((candidate) => candidate.field === field)!;
      expect(column.type).toBe('code');
      expect(column.onOpenCodePicker?.(row, apply)).toBeUndefined();
      expect(() => column.onValueChange?.(row, 'x')).toThrow();
    }
    expect(onOpenDepartmentPicker).toHaveBeenCalledTimes(1);
    expect(onOpenPostcodePicker).toHaveBeenCalledTimes(2);
    expect(columns.find((column) => column.field === 'departmentId')?.getValue?.(row)).toBe('생산1팀');
  });
});

describe('사원 일괄 저장 요청 변환', () => {
  it('값을 다듬고 직급을 숫자로 바꾸며 주민등록번호는 보내지 않는다', () => {
    const payload = toEmployeePayload(validRow({
      userId: '5', userNm: '  홍길동 ', employeeNo: ' 261101 ', levelId: '7', mobileNo: ' 010-1111-2222 ', emailAddr: ' a@b.co ',
    }));
    expect(payload).toMatchObject({
      userId: '5', userNm: '홍길동', employeeNo: '261101', levelId: 7, departmentId: 5, positionCode: 'MANAGER',
      mobileNo: '010-1111-2222', emailAddr: 'a@b.co', realUserAt: 'N', loginCode: '', initialPassword: '',
    });
    expect(payload).not.toHaveProperty('residentNo');
    expect(toEmployeePayload(validRow()).levelId).toBeNull();
  });

  it('외국인이 아니면 외국인 전용 칸은 비워서 보낸다', () => {
    const base = {
      nationalityCode: 'USA', workEndDt: '2027-01-01', admissionDt: '2026-01-01', stayFromDt: '2026-01-01',
      stayToDt: '2027-01-01', contractFromDt: '2026-01-01', contractToDt: '2027-01-01',
    };
    const domestic = toEmployeePayload(validRow({ ...base, nativeTypeCode: 'DOMESTIC' }));
    expect(domestic).toMatchObject({ nationalityCode: '', workEndDt: '', admissionDt: '', stayFromDt: '', contractToDt: '' });
    expect(toEmployeePayload(validRow({ ...base, nativeTypeCode: 'FOREIGN' }))).toMatchObject({ nationalityCode: 'USA', workEndDt: '2027-01-01' });
  });

  it('계정은 새로 발급할 때만 보낸다', () => {
    expect(toEmployeePayload(validRow({ realUserAt: 'Y', loginCode: ' hong.gd ', initialPassword: 'long-enough-1' })))
      .toMatchObject({ realUserAt: 'Y', loginCode: 'hong.gd', initialPassword: 'long-enough-1' });
    expect(toEmployeePayload(validRow({ realUserAt: 'Y', loginId: 55, loginCode: 'hong.gd', initialPassword: 'x' })))
      .toMatchObject({ loginCode: '', initialPassword: '' });
    expect(toEmployeePayload(validRow({ realUserAt: 'N', loginCode: 'x', initialPassword: 'y' })))
      .toMatchObject({ loginCode: '', initialPassword: '' });
  });

  it('사진은 원본과 달라졌을 때만 보내고 삭제는 빈 문자열로 보낸다', () => {
    const original = validRow({ userId: '5', photoImage: 'data:image/png;base64,A' });
    expect(toEmployeePayload(validRow({ userId: '5', photoImage: 'data:image/png;base64,A' }), original)).not.toHaveProperty('photoImage');
    expect(toEmployeePayload(validRow({ userId: '5', photoImage: 'data:image/png;base64,B' }), original).photoImage).toBe('data:image/png;base64,B');
    expect(toEmployeePayload(validRow({ userId: '5', photoImage: '' }), original).photoImage).toBe('');
    // 새 행은 사진이 있을 때만 보낸다.
    expect(toEmployeePayload(validRow())).not.toHaveProperty('photoImage');
    expect(toEmployeePayload(validRow({ photoImage: 'data:image/png;base64,C' })).photoImage).toBe('data:image/png;base64,C');
  });
});

describe('사원 응답·검색 도우미', () => {
  it('응답을 그리드 행으로 바꿀 때 사원 ID와 직급 ID는 문자열로, 없는 값은 빈 문자열로 둔다', () => {
    const row = normalizeEmployeeRow({ userId: 5, userNm: '홍길동', levelId: 7, departmentId: 3, loginId: 55, realUserAt: 'Y', employmentStatus: 'LEAVE' });
    expect(row).toMatchObject({
      userId: '5', levelId: '7', departmentId: 3, loginId: 55, realUserAt: 'Y', employmentStatus: 'LEAVE',
      employeeNo: '', emailAddr: '', photoImage: '', initialPassword: '',
    });
    expect(normalizeEmployeeRow({ userId: 6 })).toMatchObject({ levelId: '', departmentId: null, loginId: null, realUserAt: 'N', employmentStatus: 'ACTIVE' });
    expect(() => normalizeEmployeeRow({ userNm: '번호없음' })).toThrow('사원 ID');
    expect(() => normalizeEmployeeRow({ userId: 0 })).toThrow('사원 ID');
  });

  it('검색조건을 재직 구분 필터로 바꾸며 알 수 없는 값은 재직으로 본다', () => {
    expect(toEmployeeFilters(' 홍 ', { status: 'RETIRED' })).toEqual({ keyword: '홍', status: 'RETIRED' });
    expect(toEmployeeFilters('', { status: 'ALL' }).status).toBe('ALL');
    expect(toEmployeeFilters('', { status: 'broken' }).status).toBe('ACTIVE');
    expect(toEmployeeFilters('', {}).status).toBe('ACTIVE');
  });
});
