import { GridSaveReconciliationError, resolveSavedGridRows, type F1GridSavedRow } from '../../../../shared/components/f1-grid';
import { apiGet, apiPost } from '../../../../shared/services/apiClient';
import {
  fetchCommonCodeGroups,
  fetchCommonCodeItems,
} from '../../../co/master/common-code/services/commonCodeManagement.service';
import type { CommonCodeItemRow } from '../../../co/master/common-code/types/commonCodeManagement.types';
import type {
  EmployeeBatchPayload,
  EmployeeCodeOption,
  EmployeeCodeOptions,
  EmployeeFilters,
  EmployeeRow,
  EmploymentStatus,
} from '../types/employee.types';

const BASE_URL = '/api/v1/hr/employees';

type ApiRow = Record<string, unknown>;

function isApiRow(value: unknown): value is ApiRow {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return value == null ? '' : String(value);
}

function nullableNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function status(value: unknown): EmploymentStatus {
  return value === 'LEAVE' || value === 'RETIRED' ? value : 'ACTIVE';
}

/** 서버 사원을 그리드 행으로 바꾼다. 사원 ID는 그리드 행 ID라서 문자열로 다룬다. */
export function normalizeEmployeeRow(source: ApiRow): EmployeeRow {
  const userId = Number(source.userId);
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new Error('사원 ID 응답을 확인할 수 없습니다.');
  }
  return {
    userId: String(userId),
    employeeNo: text(source.employeeNo),
    userNm: text(source.userNm),
    englishNm: text(source.englishNm),
    departmentId: nullableNumber(source.departmentId),
    departmentNm: text(source.departmentNm),
    positionCode: text(source.positionCode),
    positionNm: text(source.positionNm),
    levelId: source.levelId == null ? '' : String(source.levelId),
    levelNm: text(source.levelNm),
    genderCode: text(source.genderCode),
    genderNm: text(source.genderNm),
    employmentTypeCode: text(source.employmentTypeCode),
    employmentTypeNm: text(source.employmentTypeNm),
    nativeTypeCode: text(source.nativeTypeCode),
    nativeTypeNm: text(source.nativeTypeNm),
    nationalityCode: text(source.nationalityCode),
    nationalityNm: text(source.nationalityNm),
    birthCalendarCode: text(source.birthCalendarCode),
    birthDt: text(source.birthDt),
    joinDt: text(source.joinDt),
    retireDt: text(source.retireDt),
    suspendDt: text(source.suspendDt),
    backDt: text(source.backDt),
    workEndDt: text(source.workEndDt),
    admissionDt: text(source.admissionDt),
    stayFromDt: text(source.stayFromDt),
    stayToDt: text(source.stayToDt),
    contractFromDt: text(source.contractFromDt),
    contractToDt: text(source.contractToDt),
    mobileNo: text(source.mobileNo),
    homePhoneNo: text(source.homePhoneNo),
    emailAddr: text(source.emailAddr),
    postalCode: text(source.postalCode),
    address: text(source.address),
    addressDetail: text(source.addressDetail),
    realUserAt: source.realUserAt === 'Y' ? 'Y' : 'N',
    loginId: nullableNumber(source.loginId),
    loginCode: text(source.loginCode),
    loginUseAt: text(source.loginUseAt),
    initialPassword: '',
    photoImage: text(source.photoImage),
    employmentStatus: status(source.employmentStatus),
    departmentManagerYn: source.departmentManagerYn === 'Y' ? 'Y' : 'N',
  };
}

export async function fetchEmployees(filters: EmployeeFilters): Promise<EmployeeRow[]> {
  const query = new URLSearchParams({ status: filters.status });
  if (filters.keyword.trim()) query.set('keyword', filters.keyword.trim());
  const result = await apiGet<{ resultList?: unknown }>(`${BASE_URL}?${query.toString()}`);
  if (!Array.isArray(result.resultList) || !result.resultList.every(isApiRow)) {
    throw new Error('사원 목록 응답을 확인할 수 없습니다.');
  }
  return result.resultList.map(normalizeEmployeeRow);
}

/**
 * 사원을 일괄 저장한다(`POST /api/v1/hr/employees/save-batch`). 한 트랜잭션이라 하나라도 실패하면 전체가 취소되고
 * 서버 메시지 앞에 사원명이 붙는다. 응답을 그리드가 요청 행과 맞춰 볼 수 있는 저장 행으로 돌려준다.
 */
export async function saveEmployeeRows(
  payload: EmployeeBatchPayload,
  requested: EmployeeRow[],
): Promise<F1GridSavedRow<EmployeeRow>[]> {
  const result = await apiPost<{ item?: { employees?: unknown; rowIdMappings?: unknown } }>(
    `${BASE_URL}/save-batch`, payload,
  );
  try {
    const employees = result.item?.employees;
    if (!Array.isArray(employees) || !employees.every(isApiRow)) {
      throw new Error('사원 일괄 저장 응답을 확인할 수 없습니다.');
    }
    return resolveSavedGridRows(
      requested,
      employees.map(normalizeEmployeeRow),
      result.item?.rowIdMappings,
      'userId',
    );
  } catch (cause) {
    throw new GridSaveReconciliationError(cause);
  }
}

function toOptions(items: CommonCodeItemRow[], valueOf: (item: CommonCodeItemRow) => string): EmployeeCodeOption[] {
  return items
    .filter((item) => item.useAt === 'Y')
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((item) => ({ value: valueOf(item), label: item.itemNm }));
}

const GROUPS = {
  position: 'POSITION',
  gender: 'GENDER',
  employmentType: 'EMPLOYMENT_TYPE',
  nativeType: 'NATIVE_TYPE',
  birthCalendar: 'BIRTH_CALENDAR',
  country: 'COUNTRY',
  level: 'LEVEL',
} as const;

/** 사원 행 폼의 선택지(직위·성별·근무형태·내외국인·음력양력·국가·직급)를 공통코드에서 불러온다. */
export async function fetchEmployeeCodeOptions(): Promise<EmployeeCodeOptions> {
  const groups = await fetchCommonCodeGroups();
  const entries = await Promise.all(
    (Object.keys(GROUPS) as Array<keyof typeof GROUPS>).map(async (key) => {
      const group = groups.find((candidate) => candidate.groupCode === GROUPS[key]);
      const items = group ? await fetchCommonCodeItems(group.id) : [];
      return [key, toOptions(items, (item) => (key === 'level' ? item.id : item.itemCode))] as const;
    }),
  );
  return Object.fromEntries(entries) as unknown as EmployeeCodeOptions;
}
