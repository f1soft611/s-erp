export type AccountStatus = 'ACTIVE' | 'DISABLED' | 'LOCKED' | 'RETIRED';
export type AccountStatusFilter = 'ALL' | AccountStatus;

export type AccountRole = {
  roleId: number;
  roleCode: string;
  roleNm: string;
};

/** 계정 목록 행. 비밀번호·주민등록번호 등 민감 정보는 오지 않는다(사진은 유무만). */
export type AccountRow = {
  loginId: number;
  loginCode: string;
  userId: number | null;
  userNm: string;
  employeeNo: string;
  departmentNm: string;
  positionNm: string;
  useAt: 'Y' | 'N';
  locked: boolean;
  retired: boolean;
  passwordChangeRequired: boolean;
  passwordChangedAt: string;
  hasPhoto: boolean;
  roles: AccountRole[];
};

export type AccountFilters = {
  keyword: string;
  status: AccountStatusFilter;
};

/** 역할 변경 팝업의 선택지(사용 중인 역할). */
export type RoleOption = {
  roleId: number;
  roleCode: string;
  roleNm: string;
};

/** 비밀번호 초기화 결과. 임시 비밀번호는 이 응답에서만 볼 수 있다. */
export type PasswordResetResult = {
  loginId: number;
  loginCode: string;
  temporaryPassword: string;
};
