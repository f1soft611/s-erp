import { describe, expect, it } from 'vitest';
import {
  buildEmployeePayload,
  createEmptyEmployeeForm,
  describeEmploymentStatus,
  toEmployeeFormValues,
} from '../src/pages/hr/employee/data/employeeForm';
import {
  fitWithin,
  PHOTO_MAX_INPUT_BYTES,
  validatePhotoFile,
} from '../src/pages/hr/employee/data/employeePhoto';
import { toEmployeeFilters } from '../src/pages/hr/employee/data/employeeSearchFields';
import { normalizeEmployeeRow } from '../src/pages/hr/employee/services/employee.service';
import type { EmployeeFormValues } from '../src/pages/hr/employee/types/employee.types';

function valid(overrides: Partial<EmployeeFormValues> = {}): EmployeeFormValues {
  return {
    ...createEmptyEmployeeForm(),
    userNm: '  홍길동  ', departmentId: 3, departmentLabel: '생산팀 > 생산1팀', positionCode: 'STAFF',
    employmentTypeCode: 'REGULAR', joinDt: '2026-11-05', ...overrides,
  };
}

function errorOf(values: EmployeeFormValues): string | undefined {
  return buildEmployeePayload(values).error;
}

describe('사원 폼 검증·변환', () => {
  it('필수값(이름·부서·직위·근무형태·입사일)이 없으면 오류를 돌려준다', () => {
    expect(errorOf(valid({ userNm: '   ' }))).toContain('이름');
    expect(errorOf(valid({ departmentId: null }))).toContain('부서');
    expect(errorOf(valid({ positionCode: '' }))).toContain('직위');
    expect(errorOf(valid({ employmentTypeCode: '' }))).toContain('근무형태');
    expect(errorOf(valid({ joinDt: '' }))).toContain('입사일');
    expect(errorOf(valid())).toBeUndefined();
  });

  it('값을 다듬어 서버 요청으로 바꾸고 빈 사진은 변경 없음으로 둔다', () => {
    const { payload } = buildEmployeePayload(valid({ englishNm: ' Gildong ', mobileNo: ' 010 ', levelId: '7' }));
    expect(payload).toMatchObject({
      userNm: '홍길동', englishNm: 'Gildong', mobileNo: '010', levelId: 7, realUserAt: 'N', loginCode: '', initialPassword: '',
    });
    expect(payload).not.toHaveProperty('photoImage');
    expect(buildEmployeePayload(valid({ photoImage: '' })).payload).toHaveProperty('photoImage', '');
    expect(buildEmployeePayload(valid({ photoImage: 'data:image/jpeg;base64,AAAA' })).payload?.photoImage)
      .toBe('data:image/jpeg;base64,AAAA');
  });

  it('날짜 순서·사번·이메일·주민등록번호 형식을 검사한다', () => {
    expect(errorOf(valid({ retireDt: '2026-11-04' }))).toContain('퇴사일');
    expect(errorOf(valid({ suspendDt: '2026-11-10', backDt: '2026-11-09' }))).toContain('복직일');
    expect(errorOf(valid({ employeeNo: 'A-1' }))).toContain('사번');
    expect(errorOf(valid({ emailAddr: 'nope' }))).toContain('이메일');
    expect(errorOf(valid({ residentNo: '123' }))).toContain('주민등록번호');
    expect(errorOf(valid({ residentNo: '900101-1234567' }))).toBeUndefined();
    expect(errorOf(valid({ residentNo: '9001011234567' }))).toBeUndefined();
  });

  it('실사용자이고 계정이 없으면 8자 이상 비밀번호가 필요하고, 로그인 아이디를 비우면 사번을 쓴다', () => {
    expect(errorOf(valid({ realUser: true }))).toContain('8자');
    expect(errorOf(valid({ realUser: true, loginCode: 'ab', initialPassword: 'Init-pass1' }))).toContain('로그인 아이디');
    expect(errorOf(valid({ realUser: true, initialPassword: 'Init-pass1' }))).toBeUndefined();
    expect(errorOf(valid({ realUser: true, employeeNo: 'A1', initialPassword: 'Init-pass1' }))).toContain('직접 입력');
    expect(errorOf(valid({ realUser: true, employeeNo: 'A1', loginCode: 'hong.gd', initialPassword: 'Init-pass1' }))).toBeUndefined();
    expect(buildEmployeePayload(valid({ realUser: true, initialPassword: 'Init-pass1' })).payload)
      .toMatchObject({ realUserAt: 'Y', loginCode: '', initialPassword: 'Init-pass1' });
    expect(errorOf(valid({ realUser: true, loginCode: 'hong.gd', initialPassword: 'short' }))).toContain('8자');

    const issue = buildEmployeePayload(valid({ realUser: true, loginCode: ' hong.gd ', initialPassword: 'Init-pass1' })).payload;
    expect(issue).toMatchObject({ realUserAt: 'Y', loginCode: 'hong.gd', initialPassword: 'Init-pass1' });

    const linked = buildEmployeePayload(valid({ realUser: true, loginId: 55, loginCode: 'old', initialPassword: 'ignored' })).payload;
    expect(linked).toMatchObject({ realUserAt: 'Y', loginCode: '', initialPassword: '' });

    const notUser = buildEmployeePayload(valid({ realUser: false, loginCode: 'hong.gd', initialPassword: 'Init-pass1' })).payload;
    expect(notUser).toMatchObject({ realUserAt: 'N', loginCode: '', initialPassword: '' });
  });

  it('외국인이 아니면 외국인 전용 항목은 비워서 보낸다', () => {
    const foreignValues = {
      nationalityCode: 'USA', workEndDt: '2027-01-01', admissionDt: '2026-01-01', stayFromDt: '2026-01-01',
      stayToDt: '2027-01-01', contractFromDt: '2026-02-01', contractToDt: '2027-02-01',
    };
    const domestic = buildEmployeePayload(valid({ nativeTypeCode: 'DOMESTIC', ...foreignValues })).payload;
    expect(domestic).toMatchObject({ nationalityCode: '', workEndDt: '', admissionDt: '', stayFromDt: '', stayToDt: '', contractFromDt: '', contractToDt: '' });
    const foreign = buildEmployeePayload(valid({ nativeTypeCode: 'FOREIGN', ...foreignValues })).payload;
    expect(foreign).toMatchObject(foreignValues);
  });

  it('조회 행을 폼 값으로 바꿀 때 계정이 있으면 실사용자로 보고 주민번호 원문 입력은 비워 둔다', () => {
    const row = normalizeEmployeeRow({
      userId: 5, employeeNo: '261101', userNm: '홍길동', departmentId: 3, departmentNm: '생산1팀', levelId: 7,
      residentNoMasked: '900101-1******', realUserAt: 'N', loginId: 55, loginCode: 'hong.gd', photoImage: 'data:image/png;base64,B',
      employmentStatus: 'LEAVE',
    });
    const values = toEmployeeFormValues(row);
    expect(values).toMatchObject({
      userId: 5, employeeNo: '261101', levelId: '7', residentNo: '', residentNoMasked: '900101-1******',
      realUser: true, loginId: 55, loginCode: 'hong.gd', departmentLabel: '생산1팀', currentPhoto: 'data:image/png;base64,B',
    });
    expect(values.photoImage).toBeUndefined();
    expect(describeEmploymentStatus(row.employmentStatus)).toBe('휴직');
    expect(describeEmploymentStatus('RETIRED')).toBe('퇴직');
    expect(describeEmploymentStatus('ACTIVE')).toBe('재직');
  });

  it('응답 정규화는 사원 ID가 없으면 거절하고 비어 있는 값은 빈 문자열로 둔다', () => {
    expect(() => normalizeEmployeeRow({ userNm: '홍길동' })).toThrow('사원 ID');
    const row = normalizeEmployeeRow({ userId: 1 });
    expect(row).toMatchObject({ employeeNo: '', departmentId: null, levelId: null, realUserAt: 'N', loginId: null, employmentStatus: 'ACTIVE' });
  });
});

describe('사진·검색 도우미', () => {
  it('긴 변이 한도를 넘으면 비율을 유지해 줄이고 작으면 그대로 둔다', () => {
    expect(fitWithin(1000, 500, 320)).toEqual({ width: 320, height: 160 });
    expect(fitWithin(300, 600, 320)).toEqual({ width: 160, height: 320 });
    expect(fitWithin(200, 100, 320)).toEqual({ width: 200, height: 100 });
  });

  it('PNG·JPEG·WEBP 10MB 이하만 받는다', () => {
    expect(validatePhotoFile({ type: 'image/jpeg', size: 1000 })).toBeNull();
    expect(validatePhotoFile({ type: 'image/gif', size: 1000 })).toContain('PNG');
    expect(validatePhotoFile({ type: 'image/png', size: PHOTO_MAX_INPUT_BYTES + 1 })).toContain('10MB');
  });

  it('검색조건을 재직 구분 필터로 바꾸며 알 수 없는 값은 재직으로 본다', () => {
    expect(toEmployeeFilters(' 홍 ', { status: 'RETIRED' })).toEqual({ keyword: '홍', status: 'RETIRED' });
    expect(toEmployeeFilters('', { status: 'ALL' }).status).toBe('ALL');
    expect(toEmployeeFilters('', { status: 'weird' }).status).toBe('ACTIVE');
    expect(toEmployeeFilters('', {}).status).toBe('ACTIVE');
  });
});
