import type {
  EmployeeFormValues,
  EmployeePayload,
  EmployeeRow,
  EmploymentStatus,
} from '../types/employee.types';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOGIN_CODE = /^[A-Za-z0-9._-]{4,30}$/;
const EMPLOYEE_NO = /^[A-Za-z0-9]{1,20}$/;
export const MIN_PASSWORD_LENGTH = 8;

export function createEmptyEmployeeForm(): EmployeeFormValues {
  return {
    userId: null, employeeNo: '', userNm: '', englishNm: '', departmentId: null, departmentLabel: '',
    positionCode: '', levelId: '', genderCode: '', employmentTypeCode: '', nativeTypeCode: '',
    nationalityCode: '', birthCalendarCode: '', birthDt: '', joinDt: '', retireDt: '', suspendDt: '', backDt: '',
    workEndDt: '', admissionDt: '', stayFromDt: '', stayToDt: '', contractFromDt: '', contractToDt: '',
    residentNo: '', residentNoMasked: '', mobileNo: '', homePhoneNo: '', emailAddr: '', postalCode: '',
    address: '', addressDetail: '', realUser: false, loginId: null, loginCode: '', initialPassword: '',
    photoImage: undefined, currentPhoto: '',
  };
}

export function toEmployeeFormValues(row: EmployeeRow): EmployeeFormValues {
  return {
    userId: row.userId, employeeNo: row.employeeNo, userNm: row.userNm, englishNm: row.englishNm,
    departmentId: row.departmentId, departmentLabel: row.departmentNm, positionCode: row.positionCode,
    levelId: row.levelId == null ? '' : String(row.levelId), genderCode: row.genderCode,
    employmentTypeCode: row.employmentTypeCode, nativeTypeCode: row.nativeTypeCode,
    nationalityCode: row.nationalityCode, birthCalendarCode: row.birthCalendarCode, birthDt: row.birthDt,
    joinDt: row.joinDt, retireDt: row.retireDt, suspendDt: row.suspendDt, backDt: row.backDt,
    workEndDt: row.workEndDt, admissionDt: row.admissionDt, stayFromDt: row.stayFromDt, stayToDt: row.stayToDt,
    contractFromDt: row.contractFromDt, contractToDt: row.contractToDt, residentNo: '',
    residentNoMasked: row.residentNoMasked, mobileNo: row.mobileNo, homePhoneNo: row.homePhoneNo,
    emailAddr: row.emailAddr, postalCode: row.postalCode, address: row.address, addressDetail: row.addressDetail,
    // 로그인 계정이 이미 연결된 사원은 항상 실사용자다(서버도 해제를 막는다).
    realUser: row.realUserAt === 'Y' || row.loginId != null, loginId: row.loginId, loginCode: row.loginCode,
    initialPassword: '', photoImage: undefined, currentPhoto: row.photoImage,
  };
}

export function describeEmploymentStatus(status: EmploymentStatus): string {
  if (status === 'RETIRED') return '퇴직';
  if (status === 'LEAVE') return '휴직';
  return '재직';
}

export type BuildPayloadResult = { payload: EmployeePayload; error?: undefined } | { payload?: undefined; error: string };

/**
 * 팝업 값을 서버 요청으로 바꾸며 서버와 같은 규칙을 먼저 검사한다(필수값, 날짜 순서, 이메일, 주민번호 13자리, 실사용자 계정 입력).
 * 서버 검증이 최종이며 여기서는 불필요한 왕복을 줄이기 위한 것이다.
 */
export function buildEmployeePayload(values: EmployeeFormValues): BuildPayloadResult {
  const name = values.userNm.trim();
  if (!name) return { error: '이름을 입력해 주세요.' };
  if (values.departmentId == null) return { error: '부서를 선택해 주세요.' };
  if (!values.positionCode) return { error: '직위를 선택해 주세요.' };
  if (!values.employmentTypeCode) return { error: '근무형태를 선택해 주세요.' };
  if (!values.joinDt) return { error: '입사일을 입력해 주세요.' };
  const employeeNo = values.employeeNo.trim();
  if (employeeNo && !EMPLOYEE_NO.test(employeeNo)) return { error: '사번은 영문·숫자 1~20자로 입력해 주세요.' };
  if (values.retireDt && values.retireDt < values.joinDt) return { error: '퇴사일은 입사일보다 빠를 수 없습니다.' };
  if (values.suspendDt && values.backDt && values.backDt < values.suspendDt) {
    return { error: '복직일은 휴직일보다 빠를 수 없습니다.' };
  }
  const email = values.emailAddr.trim();
  if (email && !EMAIL.test(email)) return { error: '이메일 형식이 올바르지 않습니다.' };
  const residentNo = values.residentNo.trim();
  if (residentNo && !/^[0-9]{13}$/.test(residentNo.replace(/-/g, ''))) {
    return { error: '주민등록번호는 숫자 13자리로 입력해 주세요.' };
  }
  const foreign = values.nativeTypeCode === 'FOREIGN';
  const needsAccount = values.realUser && values.loginId == null;
  if (needsAccount) {
    const loginCode = values.loginCode.trim();
    if (loginCode) {
      if (!LOGIN_CODE.test(loginCode)) {
        return { error: '로그인 아이디는 영문·숫자·`.`·`_`·`-` 4~30자로 입력해 주세요.' };
      }
    } else if (employeeNo && !LOGIN_CODE.test(employeeNo)) {
      // 비우면 사번이 아이디가 되는데, 직접 입력한 사번이 아이디 규칙에 맞지 않는 경우
      return { error: `사번(${employeeNo})은 로그인 아이디로 쓸 수 없습니다. 로그인 아이디를 직접 입력해 주세요.` };
    }
    if (values.initialPassword.length < MIN_PASSWORD_LENGTH) {
      return { error: `초기 비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.` };
    }
  }
  const payload: EmployeePayload = {
    employeeNo,
    userNm: name,
    englishNm: values.englishNm.trim(),
    departmentId: values.departmentId,
    positionCode: values.positionCode,
    levelId: values.levelId ? Number(values.levelId) : null,
    genderCode: values.genderCode,
    employmentTypeCode: values.employmentTypeCode,
    nativeTypeCode: values.nativeTypeCode,
    // 외국인 전용 항목은 내/외국인이 '외국인'일 때만 보내 숨겨진 값이 저장되지 않게 한다.
    nationalityCode: foreign ? values.nationalityCode : '',
    birthCalendarCode: values.birthCalendarCode,
    birthDt: values.birthDt,
    joinDt: values.joinDt,
    retireDt: values.retireDt,
    suspendDt: values.suspendDt,
    backDt: values.backDt,
    workEndDt: foreign ? values.workEndDt : '',
    admissionDt: foreign ? values.admissionDt : '',
    stayFromDt: foreign ? values.stayFromDt : '',
    stayToDt: foreign ? values.stayToDt : '',
    contractFromDt: foreign ? values.contractFromDt : '',
    contractToDt: foreign ? values.contractToDt : '',
    residentNo,
    mobileNo: values.mobileNo.trim(),
    homePhoneNo: values.homePhoneNo.trim(),
    emailAddr: email,
    postalCode: values.postalCode.trim(),
    address: values.address.trim(),
    addressDetail: values.addressDetail.trim(),
    realUserAt: values.realUser ? 'Y' : 'N',
    loginCode: needsAccount ? values.loginCode.trim() : '',
    initialPassword: needsAccount ? values.initialPassword : '',
  };
  if (values.photoImage !== undefined) payload.photoImage = values.photoImage;
  return { payload };
}
