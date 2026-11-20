export type EmploymentStatus = 'ACTIVE' | 'LEAVE' | 'RETIRED';
export type EmployeeStatusFilter = 'ACTIVE' | 'RETIRED' | 'ALL';

/**
 * 사원 그리드·행 폼이 다루는 행. 입력 칸은 모두 문자열(선택 값 포함)이고 날짜는 yyyy-MM-dd다.
 * 새로 추가한 행의 `userId`는 화면이 만든 임시 ID(`new-employee-…`)이고 저장하면 서버가 준 사원 ID로 바뀐다.
 * 주민등록번호는 관리하지 않아 포함하지 않는다.
 */
export type EmployeeRow = {
  userId: string;
  employeeNo: string;
  userNm: string;
  englishNm: string;
  departmentId: number | null;
  departmentNm: string;
  positionCode: string;
  positionNm: string;
  /** 직급(`LEVEL`) 항목 ID. 없으면 빈 문자열. */
  levelId: string;
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
  mobileNo: string;
  homePhoneNo: string;
  emailAddr: string;
  postalCode: string;
  address: string;
  addressDetail: string;
  realUserAt: 'Y' | 'N';
  /** 이미 연결된 로그인 계정의 ID(있으면 아이디·비밀번호 입력을 받지 않는다). */
  loginId: number | null;
  loginCode: string;
  loginUseAt: string;
  /** 계정을 새로 발급할 때만 입력하는 초기 비밀번호. 서버에서 받은 행에는 항상 빈 문자열이다. */
  initialPassword: string;
  /** 사원 사진(데이터 URL). 없으면 빈 문자열. */
  photoImage: string;
  employmentStatus: EmploymentStatus;
  departmentManagerYn: 'Y' | 'N';
};

export type EmployeeFilters = {
  keyword: string;
  status: EmployeeStatusFilter;
};

/** 일괄 저장 요청의 사원 한 건. `userId`는 요청 행 ID(등록 행은 임시 ID, 수정 행은 사원 ID). */
export type EmployeeChangePayload = {
  userId: string;
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
  mobileNo: string;
  homePhoneNo: string;
  emailAddr: string;
  postalCode: string;
  address: string;
  addressDetail: string;
  realUserAt: 'Y' | 'N';
  loginCode: string;
  initialPassword: string;
  /** 없으면 사진 변경 없음, 빈 문자열이면 삭제, 값이 있으면 교체. */
  photoImage?: string;
};

export type EmployeeBatchPayload = {
  employees: {
    insertedRows: EmployeeChangePayload[];
    updatedRows: EmployeeChangePayload[];
    deletedRows: EmployeeChangePayload[];
  };
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
