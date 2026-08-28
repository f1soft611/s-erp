export type F1GridRowId = string | number;

export type F1GridRowState = 'normal' | 'inserted' | 'updated' | 'deleted';

export type F1GridEditorType =
  | 'text'
  | 'number'
  | 'checkbox'
  | 'date'
  | 'select';

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
  startEdit(rowId: F1GridRowId, field: keyof T): void;
  stopEdit(): void;
};
