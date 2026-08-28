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
  mergeRows?: boolean;
  headerCheckbox?: boolean;
};

export type F1GridChanges<T> = {
  insertedRows: T[];
  updatedRows: T[];
  deletedRows: T[];
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
