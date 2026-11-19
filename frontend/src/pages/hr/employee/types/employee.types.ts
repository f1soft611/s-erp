export type EmploymentStatus = 'ACTIVE' | 'LEAVE' | 'RETIRED';
export type EmployeeStatusFilter = 'ACTIVE' | 'RETIRED' | 'ALL';

/** 사원 조회 응답. 날짜는 yyyy-MM-dd 문자열이고 주민등록번호 원문은 오지 않는다(마스킹 값만). */
export type EmployeeRow = {
  userId: number;
  employeeNo: string;
  userNm: string;
  englishNm: string;
  departmentId: number | null;
  departmentNm: string;
  positionCode: string;
  positionNm: string;
  levelId: number | null;
  levelNm: string;
  genderCode: string;
  genderNm: string;
  employmentTypeCode: string;
  employmentTypeNm: string;
  nativeTypeCode: string;
  nativeTypeNm: string;
  nationalityCode: string;
  nationalityNm: string;
  birthCalendarCode: string;
  birthDt: string;
  joinDt: string;
  retireDt: string;
  suspendDt: string;
  backDt: string;
  workEndDt: string;
  admissionDt: string;
  stayFromDt: string;
  stayToDt: string;
  contractFromDt: string;
  contractToDt: string;
  residentNoMasked: string;
  mobileNo: string;
  homePhoneNo: string;
  emailAddr: string;
  postalCode: string;
  address: string;
  addressDetail: string;
  realUserAt: 'Y' | 'N';
  loginId: number | null;
  loginCode: string;
  loginUseAt: string;
  photoImage: string;
  employmentStatus: EmploymentStatus;
  departmentManagerYn: 'Y' | 'N';
};

export type EmployeeFilters = {
  keyword: string;
  status: EmployeeStatusFilter;
};

/** 등록·수정 팝업이 편집하는 값(입력 컨트롤용으로 모두 문자열). */
export type EmployeeFormValues = {
  userId: number | null;
  employeeNo: string;
  userNm: string;
  englishNm: string;
  departmentId: number | null;
  departmentLabel: string;
  positionCode: string;
  levelId: string;
  genderCode: string;
  employmentTypeCode: string;
  nativeTypeCode: string;
  nationalityCode: string;
  birthCalendarCode: string;
  birthDt: string;
  joinDt: string;
  retireDt: string;
  suspendDt: string;
  backDt: string;
  workEndDt: string;
  admissionDt: string;
  stayFromDt: string;
  stayToDt: string;
  contractFromDt: string;
  contractToDt: string;
  residentNo: string;
  residentNoMasked: string;
  mobileNo: string;
  homePhoneNo: string;
  emailAddr: string;
  postalCode: string;
  address: string;
  addressDetail: string;
  realUser: boolean;
  /** 이미 연결된 로그인 계정의 ID(있으면 아이디·비밀번호 입력을 받지 않는다) */
  loginId: number | null;
  loginCode: string;
  initialPassword: string;
  /** 사진 데이터 URL. undefined면 변경 없음, 빈 문자열이면 삭제를 뜻한다. */
  photoImage: string | undefined;
  /** 팝업에 보여 줄 현재 사진 */
  currentPhoto: string;
};

/** 서버 등록·수정 요청 본문. */
export type EmployeePayload = {
  employeeNo: string;
  userNm: string;
  englishNm: string;
  departmentId: number | null;
  positionCode: string;
  levelId: number | null;
  genderCode: string;
  employmentTypeCode: string;
  nativeTypeCode: string;
  nationalityCode: string;
  birthCalendarCode: string;
  birthDt: string;
  joinDt: string;
  retireDt: string;
  suspendDt: string;
  backDt: string;
  workEndDt: string;
  admissionDt: string;
  stayFromDt: string;
  stayToDt: string;
  contractFromDt: string;
  contractToDt: string;
  residentNo: string;
  mobileNo: string;
  homePhoneNo: string;
  emailAddr: string;
  postalCode: string;
  address: string;
  addressDetail: string;
  realUserAt: 'Y' | 'N';
  loginCode: string;
  initialPassword: string;
  photoImage?: string;
};

export type EmployeeCodeOption = { value: string; label: string };

export type EmployeeCodeOptions = {
  position: EmployeeCodeOption[];
  gender: EmployeeCodeOption[];
  employmentType: EmployeeCodeOption[];
  nativeType: EmployeeCodeOption[];
  birthCalendar: EmployeeCodeOption[];
  country: EmployeeCodeOption[];
  /** 직급(`LEVEL`)은 항목 ID를 값으로 쓴다. */
  level: EmployeeCodeOption[];
};
