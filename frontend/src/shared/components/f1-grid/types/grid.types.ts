import type { ReactNode } from 'react';

export type F1GridRowId = string | number;

export type F1GridRowState = 'normal' | 'inserted' | 'updated' | 'deleted';

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
  | 'code'
  | 'rownumber';

export type F1GridOption = {
  value: string | number | boolean;
  label: string;
};

export type F1GridNumberFormat = 'number' | 'decimal' | 'currency';

export type F1GridEditContext<T extends object> = {
  row: T;
  rowId: F1GridRowId;
  column: F1GridColumn<T>;
  field: keyof T;
  value: unknown;
  defaultValue: string;
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
  headerGroup?: string;
  getValue?: (row: T) => unknown;
  onValueChange?: (row: T, value: unknown) => Partial<T>;
  width?: number;
  flex?: number;
  maxWidth?: number;
  editable?: boolean | ((row: T) => boolean);
  type?: F1GridEditorType;
  format?: F1GridNumberFormat;
  decimalPlaces?: number;
  options?: F1GridOption[];
  required?: boolean;
  min?: number;
  max?: number;
  validate?: (value: T[keyof T], row: T) => string | boolean;
  onOpenCodePicker?: (
    row: T,
    applyPatch: (changes: Partial<T>) => void,
  ) => Partial<T> | undefined;
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

/** F1Tree가 내부적으로 주입하는 트리 전용 컨텍스트 메뉴 확장 포인트. 일반 F1Grid 사용 화면에서는 지정하지 않는다. */
export type F1GridContextMenuTreeConfig = {
  onAddRoot: () => void;
  onAddChild: (targetRowId?: F1GridRowId) => void;
};

export type F1GridProps<T extends object> = {
  rows: T[];
  columns: F1GridColumn<T>[];
  rowKey: keyof T;
  ariaLabel?: string;
  columnLine?: boolean;
  storageKey?: string;
  height?: number | string;
  maxHeight?: number | string;
  rowHeight?: number;
  minRowHeight?: number;
  maxRowHeight?: number;
  resizableRows?: boolean;
  resizableColumns?: boolean;
  minColumnWidth?: number;
  showCheckbox?: boolean;
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
  rowProjection?: (rows: T[]) => F1GridRowProjection<T>;
  cellAdornment?: (row: T, column: F1GridColumn<T>) => ReactNode;
  disableSorting?: boolean;
  disableFiltering?: boolean;
  canExportExcel?: boolean;
  excelFileName?: string;
  allowAddRowInContextMenu?: boolean;
  allowDuplicateRowInContextMenu?: boolean;
  allowDeleteRowInContextMenu?: boolean;
  loading?: boolean;
  treeContextMenu?: F1GridContextMenuTreeConfig;
};

export type F1GridRef<T extends object> = {
  getSelectedRows(): T[];
  getSelectedRowIds(): F1GridRowId[];
  clearSelection(): void;
  addRow(row?: Partial<T>): void;
  deleteSelectedRows(): void;
  restoreDeletedRows(): void;
  duplicateSelectedRows(): void;
  getRows(): T[];
  getActiveRows(): T[];
  getChanges(): F1GridChanges<T>;
  validate(): boolean;
  startEdit(rowId: F1GridRowId, field: keyof T): void;
  stopEdit(): void;
  setCellValue(rowId: F1GridRowId, field: keyof T, value: unknown): void;
};

export type F1TreeProps<T extends object> = Omit<
  F1GridProps<T>,
  'rowProjection' | 'cellAdornment'
> & {
  parentKey: keyof T;
  treeColumn: keyof T;
  treeCheckbox?: boolean;
  defaultExpandAll?: boolean;
  defaultExpanded?: 'all' | 'root' | F1GridRowId[];
  getRowOrder?: (row: T) => number;
  onDeleteBlocked?: (rowIds: F1GridRowId[]) => void;
  onTreeCheckboxChange?: (rowIds: F1GridRowId[]) => void;
};

export type F1TreeRef<T extends object> = F1GridRef<T> & {
  addChildRow(parentId: F1GridRowId, row?: Partial<T>): void;
  expandRow(rowId: F1GridRowId): void;
  collapseRow(rowId: F1GridRowId): void;
  expandAll(): void;
  collapseAll(): void;
  isExpanded(rowId: F1GridRowId): boolean;
};
