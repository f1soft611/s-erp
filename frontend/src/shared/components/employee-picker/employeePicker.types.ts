/**
 * 사원 선택 도움창이 돌려주는 값. 사원을 고르면 부서까지 함께 설정하는 화면이 많아 부서 정보도 함께 준다.
 * 부서가 지정되지 않은 사원은 `departmentId`가 null이고 `departmentNm`은 빈 문자열이다.
 * 항목이 늘어도 받는 쪽이 필요한 값만 골라 쓰면 되도록 모두 이름 있는 값으로 준다.
 */
export type EmployeePickerOption = {
  departmentId: number | null;
  departmentNm: string;
  userId: number;
  positionCode: string;
  positionNm: string;
  employeeNo: string;
  userNm: string;
};

type EmployeePickerDialogBaseProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
};

/** 한 명을 고르는 도움창(기본). */
export type EmployeePickerSingleProps = EmployeePickerDialogBaseProps & {
  selectionMode?: 'single';
  /** 사원 행을 더블클릭(또는 선택 후 Enter)하면 호출되고 도움창은 닫힌다. */
  onChange: (value: EmployeePickerOption) => void;
  /**
   * 주면 도움창 아래에 "선택 해제" 버튼이 나타난다. 누르면 호출되고 도움창은 닫힌다.
   * 담당자처럼 비워 둘 수 있는 항목에서 지정을 해제할 때 쓴다(없으면 버튼을 보여 주지 않는다).
   */
  onClear?: () => void;
};

/** 여러 명을 체크해 한 번에 적용하는 도움창. 부서·검색을 바꿔도 선택은 사원 ID로 유지된다. */
export type EmployeePickerMultipleProps = EmployeePickerDialogBaseProps & {
  selectionMode: 'multiple';
  /** "적용(N명)"을 누르면 선택 순서대로 호출되고 도움창은 닫힌다. 0명도 적용할 수 있다(선택 비우기). */
  onApply: (values: EmployeePickerOption[]) => void;
  /** 열 때의 초기 선택. */
  selected?: EmployeePickerOption[];
  /** 최대 선택 인원(1 이상). 없으면 제한이 없다. */
  maxSelect?: number;
};

export type EmployeePickerDialogProps = EmployeePickerSingleProps | EmployeePickerMultipleProps;

/** 사원 목록 행. 연락처·주민번호 등 개인정보는 오지 않는다. */
export type EmployeePickerRow = {
  userId: number;
  employeeNo: string;
  userNm: string;
  departmentId: number | null;
  departmentNm: string;
  positionCode: string;
  positionNm: string;
  photoImage: string;
};

/** 부서 ID가 null이면 회사 전체(부서 미지정 포함)다. */
export type EmployeePickerFilters = {
  departmentId: number | null;
  keyword: string;
};
