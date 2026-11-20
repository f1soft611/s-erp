/** 명령 후 값 입력 방식: 부서 선택 도움창 / 공통코드 선택 / 날짜. */
export type OrderInputKind = 'department' | 'code' | 'date';

/** 화면에서 고를 수 있는 인사명령 유형(서버 `GET /api/v1/hr/orders/types`). */
export type OrderTypeDef = {
  code: string;
  name: string;
  fieldCode: string;
  fieldName: string;
  inputKind: OrderInputKind;
  /** inputKind가 code일 때의 공통코드 그룹. */
  codeGroup: string;
};

export type OrderCodeOption = { value: string; label: string };

/** 공통코드 그룹별 선택지. 직급(LEVEL)은 값이 공통코드 항목 ID다. */
export type OrderCodeOptions = Record<string, OrderCodeOption[]>;

/** 명령 대상 사원의 현재 정보(명령 전 값을 보여 주는 데 쓴다). */
export type OrderEmployee = {
  userId: number;
  employeeNo: string;
  userNm: string;
  departmentNm: string;
  positionNm: string;
  levelNm: string;
  employmentTypeNm: string;
  suspendDt: string;
  backDt: string;
  retireDt: string;
  employmentStatus: string;
};

/** 대상 사원 표의 행. postValue는 명령 후 값(부서 ID·코드·날짜), postLabel은 부서처럼 이름이 따로 있는 값의 표시 이름. */
export type OrderTargetRow = {
  userId: number;
  departmentNm: string;
  positionNm: string;
  employeeNo: string;
  userNm: string;
  /** 명령 전 값(유형에 맞는 현재 값의 표시 이름). */
  currentLabel: string;
  postValue: string;
  postLabel: string;
};

export type OrderProcessPayload = {
  orderType: string;
  orderDt: string;
  remark: string;
  items: Array<{ userId: number; postValue: string }>;
};

export type OrderProcessResult = {
  orderId: number;
  count: number;
  items: Array<{ userId: number; userNm: string; fieldCode: string; preName: string; postName: string }>;
};

export type OrderHistoryRow = {
  orderDtId: number;
  orderId: number;
  createdAt: string;
  orderDt: string;
  orderType: string;
  orderTypeName: string;
  source: string;
  userId: number;
  userNm: string;
  employeeNo: string;
  fieldCode: string;
  fieldName: string;
  preName: string;
  postName: string;
  remark: string;
  createdByName: string;
};

export type OrderHistoryFilters = {
  from?: string;
  to?: string;
  keyword?: string;
  orderType?: string;
  source?: string;
};
