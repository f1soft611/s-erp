export type DepartmentUseAt = 'Y' | 'N';

export type DepartmentRow = {
  departmentId: number;
  parentDepartmentId: number | null;
  departmentNm: string;
  managerUserId: number | null;
  managerUserNm: string;
  departmentDc: string;
  sortOrder: number;
  useAt: DepartmentUseAt;
  /** 사용 중인 하위 부서 수 */
  childCount: number;
  /** 사용 중인 소속 사원 수 */
  userCount: number;
};

/** 트리에 그리는 행. 최상단 회사 노드(`isCompany`)는 DB 행이 아니라 화면에서만 만든다. */
export type DepartmentTreeRow = DepartmentRow & { isCompany?: boolean };

export type DepartmentListResult = {
  /** 회사정보의 회사명. 부서 트리 최상단 노드 이름으로 쓴다. */
  companyName: string;
  departments: DepartmentRow[];
};

export type DepartmentUserRow = {
  userId: number;
  userNm: string;
  levelNm: string;
  loginCode: string;
  mobileNo: string;
  emailAddr: string;
  managerYn: 'Y' | 'N';
  employeeNo: string;
  positionNm: string;
  employmentStatus: 'ACTIVE' | 'LEAVE' | 'RETIRED';
};

/** 소속 사원 재직 구분: 재직(휴직 포함)·퇴직·전체 */
export type MemberStatusFilter = 'ACTIVE' | 'RETIRED' | 'ALL';

/** 부서장 선택지. 해당 부서의 소속 사원만 올 수 있다. */
export type DepartmentManagerOption = {
  userId: number;
  userNm: string;
  levelNm: string;
};

export type DepartmentPayload = {
  parentDepartmentId: number | null;
  departmentNm: string;
  managerUserId: number | null;
  departmentDc: string;
  sortOrder: number;
};
