import type { CSSProperties, ReactNode } from 'react';

export type F1GridRowId = string | number;

export type F1GridSavedRow<T extends object> = {
  previousRowId: F1GridRowId;
  row: T;
};

export type F1GridRowState = 'normal' | 'inserted' | 'updated' | 'deleted';

export type F1GridTrailingZeros = 'FIXED' | 'AUTO';
export type F1GridRoundingMode = 'HALF_UP' | 'UP' | 'DOWN';

export interface F1GridDecimalOptions {
  /** 소수점 자릿수 */
  places?: number;
  trailingZeros?: F1GridTrailingZeros;
  rounding?: F1GridRoundingMode;
}

export type F1GridEditorType =
  | 'text'
  | 'number'
  | 'decimal'
  | 'currency'
  | 'checkbox'
  | 'date'
  | 'datetime'
  | 'time'
  | 'select'
  | 'autocomplete'
  | 'user'
  | 'code'
  | 'image'
  | 'rownumber';

export type F1GridOption = {
  value: string | number | boolean;
  label: string;
};

export type F1GridUserOption = {
  value: string | number;
  label: string;
  avatarUrl?: string | null;
  positionName?: string | null;
  departmentName?: string | null;
};

export type F1GridDraftValue = string | number | null | Array<string | number>;

export type F1GridNumberFormat = 'number' | 'decimal' | 'currency';

export type F1GridInputFormat =
  | {
      type: 'digits';
      groupSizes?: number[];
      separator?: string;
      maxDigits?: number;
      validDigitCounts?: number[];
    }
  | { type: 'korean-phone'; maxDigits?: number };

export type F1GridFormMode = 'create' | 'edit';

export type F1GridDateDefault =
  | { type: 'fixed'; year: number; month: number; day: number }
  | {
      type: 'systemDate';
      offset?: { years?: number; months?: number; days?: number };
    };

export type F1GridDateRangeDefault = {
  from?: F1GridDateDefault;
  to?: F1GridDateDefault;
};

export type F1GridColumnFormOptions<T extends object> = {
  hidden?: boolean;
  readOnly?: boolean | ((row: T, mode: F1GridFormMode) => boolean);
  label?: string | ((row: T) => string);
  disabled?: boolean | ((row: T, mode: F1GridFormMode) => boolean);
  group?: string;
  order?: number;
  span?: 1 | 2 | 3;
  multiple?: boolean;
  targetField?: keyof T;
  targetLabel?: string;
};

export type F1GridColumnSearchOptions = {
  hidden?: boolean;
  label?: string;
  group?: string;
  order?: number;
  span?: 1 | 2 | 3 | 4 | 5;
  required?: boolean;
  /**
   * select 검색 필드에서 빈 값 선택지("전체")를 숨긴다. 기본값이 항상 채워지는 필드(예: 상태 정상/취소/전체)에 쓴다.
   * false가 아니면 기존처럼 빈 값 "전체" 선택지를 보여 준다.
   */
  allowEmpty?: boolean;
  /** 검색 입력 방식. 'month'이면 달력(연·월)으로 월(YYYYMM)을 고른다. 값은 열 type과 무관하게 문자열이다. */
  inputType?: 'month';
  defaultValue?: F1GridDateRangeDefault;
};

export type F1GridRowFormContext<T extends object> = {
  mode: F1GridFormMode;
  row: T;
};

export type F1GridRowFormApplyContext<T extends object> = {
  mode: F1GridFormMode;
  originalRow?: T;
  draftRow: T;
};

export type F1GridRowFormPlugin<T extends object> = {
  id?: string;
  enabled?: boolean;
  getTitle?: (context: F1GridRowFormContext<T>) => string;
  getDescription?: (context: F1GridRowFormContext<T>) => string;
  onBeforeApply?: (context: F1GridRowFormApplyContext<T>) => boolean | void;
};

export type F1GridEditContext<T extends object> = {
  row: T;
  rowId: F1GridRowId;
  column: F1GridColumn<T>;
  field: keyof T;
  value: unknown;
  defaultValue: string;
};

export type F1GridCellRenderContext<T extends object> = {
  row: T;
  rowId: F1GridRowId;
  column: F1GridColumn<T>;
  field: keyof T;
  value: unknown;
  rowIndex: number;
  /** `highlightSearch` 컬럼에만 전달되는 통합검색어. */
  highlightKeyword?: string;
};

export type F1GridCellProps = {
  className?: string;
  style?: CSSProperties;
  title?: string;
  'aria-label'?: string;
};

export type F1GridEditLifecycle<T extends object> = (
  context: F1GridEditContext<T>,
) => boolean | void;

export type F1GridEditorPlugin<T extends object> = {
  id?: string;
  name?: string;
  enabled?: boolean;
  canEdit?: (context: F1GridEditContext<T>) => boolean;
  createEditor?: (context: F1GridEditContext<T>) => ReactNode;
  startEdit?: (context: F1GridEditContext<T>) => boolean | void;
  endEdit?: (context: F1GridEditContext<T>) => boolean | void;
};

export type F1GridColumn<T extends object> = {
  field: keyof T;
  headerName: string;
  summaryType?: 'sum' | 'average' | 'min' | 'max';
  headerGroup?: string;
  form?: F1GridColumnFormOptions<T>;
  search?: F1GridColumnSearchOptions;
  /** true이면 Grid의 `highlightKeyword`와 일치하는 글자를 빨간색으로 표시한다. 기본 텍스트 셀은 자동 적용되고, `renderCell` 컬럼은 context.highlightKeyword를 `F1GridHighlightText`에 넘겨 직접 적용한다. */
  highlightSearch?: boolean;
  getValue?: (row: T) => unknown;
  onValueChange?: (row: T, value: unknown) => Partial<T>;
  width?: number;
  flex?: number;
  maxWidth?: number;
  editable?: boolean | ((row: T) => boolean);
  type?: F1GridEditorType;
  format?: string;
  decimalPlaces?: number;
  /** 소수점 설정을 한 번에 지정한다(예: `decimal: { places: 2, trailingZeros: 'AUTO', rounding: 'DOWN' }`). 지정한 항목만 정책보다 우선하며, 개별 옵션(decimalPlaces 등)보다 우선한다. */
  decimal?: F1GridDecimalOptions;
  /** 소수점 0 표시: FIXED(항상 자리수만큼, 기본) / AUTO(값이 있을 때만). 미지정 시 정책 관리 값. */
  trailingZeros?: F1GridTrailingZeros;
  /** 반올림 방식: HALF_UP(반올림) / UP(올림) / DOWN(내림). 미지정 시 정책 관리 값. */
  rounding?: F1GridRoundingMode;
  options?: F1GridOption[];
  userOptions?: F1GridUserOption[];
  selectOptionIcon?: (option: F1GridOption) => ReactNode;
  required?: boolean;
  /**
   * 헤더와 행 폼 라벨에 필수 표시(*)만 보여 주고 검증은 하지 않는다.
   * 행마다 조건부로 필수인 칸(예: 단가를 입력할 때만 적용일이 필수)처럼 `required`를 쓰면 빈 행이 모두 검증 오류가 되는 경우에 쓴다.
   */
  requiredMark?: boolean;
  validation?: { unique?: boolean | 'digits' };
  inputFormat?: F1GridInputFormat;
  sanitizeInput?: (value: string) => string;
  min?: number;
  max?: number;
  validate?: (value: T[keyof T], row: T) => string | boolean;
  onOpenCodePicker?: (
    row: T,
    applyPatch: (changes: Partial<T>) => void,
  ) => Partial<T> | undefined;
  renderCell?: (context: F1GridCellRenderContext<T>) => ReactNode;
  getCellStyle?: (
    context: F1GridCellRenderContext<T>,
  ) => CSSProperties | undefined;
  getCellProps?: (
    context: F1GridCellRenderContext<T>,
  ) => F1GridCellProps | undefined;
  align?: 'left' | 'center' | 'right';
  headerAlign?: 'left' | 'center' | 'right';
  wrapText?: boolean;
  mergeRows?: boolean;
  headerCheckbox?: boolean;
  hidden?: boolean;
  pinned?: F1GridPinSide;
  selectOnFocus?: boolean;
  syncWithTreeCheckbox?: boolean;
};

export type F1GridChanges<T> = {
  insertedRows: T[];
  updatedRows: T[];
  deletedRows: T[];
};

export type F1GridSortDirection = 'asc' | 'desc';

export type F1GridSort<T extends object> = {
  field: keyof T;
  direction: F1GridSortDirection;
};

export type F1GridFilterOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterThanOrEqual'
  | 'lessThanOrEqual'
  | 'between'
  | 'isEmpty'
  | 'isNotEmpty';

export type F1GridFilter<T extends object> = {
  field: keyof T;
  operator: F1GridFilterOperator;
  value?: unknown;
  value2?: unknown;
};

export type F1GridPinSide = 'left' | 'right';

export type F1GridRowProjection<T extends object> = {
  rows: T[];
};

export type F1GridDataSourceQuery<T extends object> = {
  offset: number;
  limit: number;
  sorts: F1GridSort<T>[];
  filters: F1GridFilter<T>[];
  signal: AbortSignal;
};

export type F1GridDataSourceResult<T extends object> = {
  rows: T[];
  totalRowCount: number;
};

export type F1GridDataSource<T extends object> = {
  pageSize?: number;
  load(query: F1GridDataSourceQuery<T>): Promise<F1GridDataSourceResult<T>>;
};

/** F1Tree가 내부적으로 주입하는 트리 전용 컨텍스트 메뉴 확장 포인트. 일반 F1Grid 사용 화면에서는 지정하지 않는다. */
export type F1GridContextMenuTreeConfig = {
  onAddRoot: () => void;
  onAddChild: (targetRowId?: F1GridRowId) => void;
  addRootLabel?: string;
  addChildLabel?: string;
  addRootDisabled?: boolean;
  isAddChildDisabled?: (targetRowId?: F1GridRowId) => boolean;
  /** 추가·편집 외에 우클릭한 행 대상으로 실행할 사용자 정의 항목(예: 편집, 사용안함). 지정하지 않으면 그리지 않는다. */
  items?: F1GridContextMenuTreeItem[];
};

export type F1GridContextMenuTreeItem = {
  key: string;
  label: string;
  disabled?: (targetRowId?: F1GridRowId) => boolean;
  onClick: (targetRowId?: F1GridRowId) => void;
};

export type F1GridValidationError = {
  rowId: F1GridRowId;
  field: string;
  message: string;
};

export type F1GridProps<T extends object> = {
  rows?: T[];
  features?: Array<{ ftype: 'summary'; dock: 'top' | 'bottom' }>;
  dataSource?: F1GridDataSource<T>;
  onDataSourceError?: (error: Error) => void;
  columns: F1GridColumn<T>[];
  rowKey: keyof T;
  /** 768px 미만에서는 미지정 시 편집 가능 Grid의 행 폼이 기본 활성화된다. enabled: false로 끌 수 있다. */
  rowFormPlugin?: F1GridRowFormPlugin<T>;
  ariaLabel?: string;
  columnLine?: boolean;
  stripeRows?: boolean;
  /** 조회에 적용된 통합검색어. `highlightSearch` 컬럼에서 일치 글자를 빨간색으로 표시한다. */
  highlightKeyword?: string;
  storageKey?: string;
  height?: number | string;
  minHeight?: number | string;
  maxHeight?: number | string;
  rowHeight?: number;
  minRowHeight?: number;
  maxRowHeight?: number;
  resizableRows?: boolean;
  resizableColumns?: boolean;
  minColumnWidth?: number;
  virtualizeRows?: boolean;
  virtualizeColumns?: boolean;
  rowOverscan?: number;
  columnOverscan?: number;
  fixedRowHeightThreshold?: number;
  queryWorkerThreshold?: number;
  disableQueryWorker?: boolean;
  showCheckbox?: boolean;
  selectionMode?: 'cell' | 'row';
  multiSelect?: boolean;
  isRowSelectable?: (row: T) => boolean;
  createRow?: () => T;
  createDuplicate?: (row: T) => T;
  editorPlugins?: F1GridEditorPlugin<T>[];
  editors?: F1GridEditorPlugin<T>[];
  onBeforeEdit?: F1GridEditLifecycle<T>;
  beforeEdit?: F1GridEditLifecycle<T>;
  onAfterEdit?: F1GridEditLifecycle<T>;
  afterEdit?: F1GridEditLifecycle<T>;
  onChangesChange?: (changes: F1GridChanges<T>) => void;
  onSelectionChange?: (rowIds: F1GridRowId[]) => void;
  onValidationErrors?: (errors: F1GridValidationError[]) => void;
  initialSelectedRowIds?: F1GridRowId[];
  rowProjection?: (rows: T[]) => F1GridRowProjection<T>;
  cellAdornment?: (row: T, column: F1GridColumn<T>) => ReactNode;
  disableSorting?: boolean;
  disableFiltering?: boolean;
  disableContextMenu?: boolean;
  selectRowOnContextMenu?: boolean;
  canExportExcel?: boolean;
  excelFileName?: string;
  allowAddRootInContextMenu?: boolean;
  allowAddRowInContextMenu?: boolean;
  allowDuplicateRowInContextMenu?: boolean;
  allowDeleteRowInContextMenu?: boolean;
  deleteMenuDisabled?: boolean;
  loading?: boolean;
  treeContextMenu?: F1GridContextMenuTreeConfig;
};

export type F1GridRef<T extends object> = {
  getSelectedRows(): T[];
  getSelectedRowIds(): F1GridRowId[];
  clearSelection(): void;
  setSelectedRowIds(rowIds: F1GridRowId[]): void;
  addRow(row?: Partial<T>): void;
  deleteSelectedRows(): void;
  restoreDeletedRows(): void;
  duplicateSelectedRows(): void;
  getRows(): T[];
  getActiveRows(): T[];
  getChanges(): F1GridChanges<T>;
  acceptSavedRows(savedRows: F1GridSavedRow<T>[]): T[];
  validate(): boolean;
  startEdit(rowId: F1GridRowId, field: keyof T): void;
  stopEdit(): void;
  setCellValue(rowId: F1GridRowId, field: keyof T, value: unknown): void;
};

export type F1TreeNodeIconContext<T extends object> = {
  row: T;
  rowId: F1GridRowId;
  depth: number;
  expanded: boolean;
  hasChildren: boolean;
};

export type F1TreeProps<T extends object> = Omit<
  F1GridProps<T>,
  'rowProjection' | 'cellAdornment'
> & {
  rows: T[];
  parentKey: keyof T;
  treeColumn: keyof T;
  treeCheckbox?: boolean;
  /** 트리 컬럼의 펼침 화살표 뒤, 텍스트 앞에 그릴 노드 아이콘(예: 폴더). 지정하지 않으면 아이콘을 그리지 않는다. */
  treeNodeIcon?: (node: F1TreeNodeIconContext<T>) => ReactNode;
  defaultExpandAll?: boolean;
  defaultExpanded?: 'all' | 'root' | F1GridRowId[];
  getRowOrder?: (row: T) => number;
  onDeleteBlocked?: (rowIds: F1GridRowId[]) => void;
  onTreeCheckboxChange?: (rowIds: F1GridRowId[]) => void;
  isDeleteDisabled?: (row: T) => boolean;
};

export type F1TreeRef<T extends object> = F1GridRef<T> & {
  addChildRow(parentId: F1GridRowId, row?: Partial<T>): void;
  expandRow(rowId: F1GridRowId): void;
  collapseRow(rowId: F1GridRowId): void;
  expandAll(): void;
  collapseAll(): void;
  isExpanded(rowId: F1GridRowId): boolean;
};
