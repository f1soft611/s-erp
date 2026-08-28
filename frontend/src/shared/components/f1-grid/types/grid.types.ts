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
  | 'code';

export type F1GridOption = {
  value: string | number | boolean;
  label: string;
};

export type F1GridColumn<T extends object> = {
  field: keyof T;
  headerName: string;
  width?: number;
  editable?: boolean | ((row: T) => boolean);
  type?: F1GridEditorType;
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

export type F1GridProps<T extends object> = {
  rows: T[];
  columns: F1GridColumn<T>[];
  rowKey: keyof T;
  ariaLabel?: string;
  columnLine?: boolean;
  rowHeight?: number;
  minRowHeight?: number;
  maxRowHeight?: number;
  resizableRows?: boolean;
  resizableColumns?: boolean;
  minColumnWidth?: number;
  createRow?: () => T;
  createDuplicate?: (row: T) => T;
  onChangesChange?: (changes: F1GridChanges<T>) => void;
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
  getChanges(): F1GridChanges<T>;
  validate(): boolean;
  startEdit(rowId: F1GridRowId, field: keyof T): void;
  stopEdit(): void;
};
