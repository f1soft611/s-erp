/** 부서 선택 도움창이 돌려주는 부서. 회사 노드는 선택할 수 없으므로 항상 실제 부서다. */
export type DepartmentPickerOption = {
  departmentId: number;
  departmentNm: string;
  /** "생산팀 > 생산1팀"처럼 상위 부서를 포함한 경로(동명 부서 구분용, 회사는 포함하지 않음) */
  departmentPath: string;
};

export type DepartmentPickerDialogProps = {
  open: boolean;
  onClose: () => void;
  /** 부서를 고르면 호출되고 도움창은 닫힌다. */
  onChange: (value: DepartmentPickerOption) => void;
  /** 현재 선택된 부서 ID. 안내 문구에 경로를 보여 주는 데만 쓴다. */
  selectedId?: number | null;
  title?: string;
};

/** 부서 선택 도움창이 트리를 그리는 데 쓰는 부서(사용 중인 부서만). */
export type DepartmentPickerDepartment = {
  departmentId: number;
  parentDepartmentId: number | null;
  departmentNm: string;
};

export type DepartmentPickerData = {
  companyName: string;
  departments: DepartmentPickerDepartment[];
};

/** 트리 행. 회사 노드(`isCompany`)는 화면에서만 만들며 선택할 수 없다. */
export type DepartmentPickerRow = DepartmentPickerDepartment & { isCompany?: boolean };
