import { apiGet, apiPost, apiPut } from '../../../../shared/services/apiClient';
import {
  fetchCommonCodeGroups,
  fetchCommonCodeItems,
} from '../../../co/master/common-code/services/commonCodeManagement.service';
import type { CommonCodeItemRow } from '../../../co/master/common-code/types/commonCodeManagement.types';
import type {
  EmployeeCodeOption,
  EmployeeCodeOptions,
  EmployeeFilters,
  EmployeePayload,
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

export function normalizeEmployeeRow(source: ApiRow): EmployeeRow {
  const userId = Number(source.userId);
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new Error('사원 ID 응답을 확인할 수 없습니다.');
  }
  return {
    userId,
    employeeNo: text(source.employeeNo),
    userNm: text(source.userNm),
    englishNm: text(source.englishNm),
    departmentId: nullableNumber(source.departmentId),
    departmentNm: text(source.departmentNm),
    positionCode: text(source.positionCode),
    positionNm: text(source.positionNm),
    levelId: nullableNumber(source.levelId),
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
    residentNoMasked: text(source.residentNoMasked),
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
    photoImage: text(source.photoImage),
    employmentStatus: status(source.employmentStatus),
    departmentManagerYn: source.departmentManagerYn === 'Y' ? 'Y' : 'N',
  };
}

function itemFromResponse(value: unknown): EmployeeRow {
  if (!isApiRow(value)) throw new Error('사원 응답을 확인할 수 없습니다.');
  return normalizeEmployeeRow(value);
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

export async function createEmployee(payload: EmployeePayload): Promise<EmployeeRow> {
  const result = await apiPost<{ item?: unknown }>(BASE_URL, payload);
  return itemFromResponse(result.item);
}

export async function updateEmployee(userId: number, payload: EmployeePayload): Promise<EmployeeRow> {
  const result = await apiPut<{ item?: unknown }>(`${BASE_URL}/${userId}`, payload);
  return itemFromResponse(result.item);
}

/** 사번이 이미 쓰이는지 확인한다(수정 중인 사원 본인은 제외). */
export async function checkEmployeeNoAvailable(employeeNo: string, userId: number | null): Promise<boolean> {
  const query = new URLSearchParams({ employeeNo: employeeNo.trim() });
  if (userId != null) query.set('userId', String(userId));
  const result = await apiGet<{ available?: unknown }>(`${BASE_URL}/check-employee-no?${query.toString()}`);
  return result.available === true;
}

/** 로그인 아이디가 이미 쓰이는지 확인한다. 형식이 맞지 않으면 오류 메시지를 던진다. */
export async function checkLoginCodeAvailable(loginCode: string): Promise<boolean> {
  const query = new URLSearchParams({ loginCode: loginCode.trim() });
  const result = await apiGet<{ available?: unknown }>(`${BASE_URL}/check-login-code?${query.toString()}`);
  return result.available === true;
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

/** 사원 팝업의 선택지(직위·성별·근무형태·내외국인·음력양력·국가·직급)를 공통코드에서 불러온다. */
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
