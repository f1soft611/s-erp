import type { EmployeeChangePayload, EmployeeRow } from '../types/employee.types';
import { isIssuingAccount } from './employeeGridData';

/**
 * 그리드 행을 일괄 저장 요청의 사원 한 건으로 바꾼다.
 * - 외국인 전용 칸은 '외국인'일 때만 보내 숨겨진 값이 저장되지 않게 한다.
 * - 계정 칸은 계정을 새로 발급할 때만 보낸다.
 * - 사진은 원본과 달라진 경우만 보낸다(바뀌지 않으면 보내지 않아 서버가 그대로 둔다, 삭제는 빈 문자열).
 */
export function toEmployeePayload(row: EmployeeRow, original?: EmployeeRow): EmployeeChangePayload {
  const foreign = row.nativeTypeCode === 'FOREIGN';
  const issuing = isIssuingAccount(row);
  const payload: EmployeeChangePayload = {
    userId: String(row.userId),
    employeeNo: row.employeeNo.trim(),
    userNm: row.userNm.trim(),
    englishNm: row.englishNm.trim(),
    departmentId: row.departmentId,
    positionCode: row.positionCode,
    levelId: row.levelId ? Number(row.levelId) : null,
    genderCode: row.genderCode,
    employmentTypeCode: row.employmentTypeCode,
    nativeTypeCode: row.nativeTypeCode,
    nationalityCode: foreign ? row.nationalityCode : '',
    birthCalendarCode: row.birthCalendarCode,
    birthDt: row.birthDt,
    joinDt: row.joinDt,
    retireDt: row.retireDt,
    suspendDt: row.suspendDt,
    backDt: row.backDt,
    workEndDt: foreign ? row.workEndDt : '',
    admissionDt: foreign ? row.admissionDt : '',
    stayFromDt: foreign ? row.stayFromDt : '',
    stayToDt: foreign ? row.stayToDt : '',
    contractFromDt: foreign ? row.contractFromDt : '',
    contractToDt: foreign ? row.contractToDt : '',
    mobileNo: row.mobileNo.trim(),
    homePhoneNo: row.homePhoneNo.trim(),
    emailAddr: row.emailAddr.trim(),
    postalCode: row.postalCode.trim(),
    address: row.address.trim(),
    addressDetail: row.addressDetail.trim(),
    realUserAt: row.realUserAt,
    loginCode: issuing ? row.loginCode.trim() : '',
    initialPassword: issuing ? row.initialPassword : '',
  };
  if (row.photoImage !== (original?.photoImage ?? '')) {
    payload.photoImage = row.photoImage;
  }
  return payload;
}
