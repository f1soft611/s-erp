import type {
  F1GridColumn,
  F1GridFormMode,
} from '../types/grid.types';
import { isCellEditable } from '../utils/grid.utils';

export type GridFormField<T extends object> = {
  column: F1GridColumn<T>;
  field: keyof T;
  label: string;
  group: string;
  order: number;
  span: 1 | 2 | 3;
};

export type GridFormSection<T extends object> = {
  group: string;
  fields: GridFormField<T>[];
};

export function isGridFormFieldReadOnly<T extends object>(
  column: F1GridColumn<T>,
  row: T,
  mode: F1GridFormMode,
): boolean {
  const readOnly = column.form?.readOnly;
  if (readOnly !== undefined) {
    return typeof readOnly === 'function' ? readOnly(row, mode) : readOnly;
  }

  return !isCellEditable(column, row);
}

export function buildGridFormSections<T extends object>(
  columns: F1GridColumn<T>[],
): GridFormSection<T>[] {
  const fields = columns
    .map((column, sourceIndex) => ({
      column,
      sourceIndex,
      field: column.field,
      label: column.form?.label ?? column.headerName,
      group: column.form?.group ?? column.headerGroup ?? '기본 정보',
      order: column.form?.order ?? sourceIndex,
      span: column.form?.span ?? 1,
    }))
    .filter(
      ({ column }) =>
        column.type !== 'rownumber' &&
        column.form?.hidden !== true &&
        (!column.hidden || column.form?.hidden === false),
    )
    .sort(
      (left, right) =>
        left.order - right.order || left.sourceIndex - right.sourceIndex,
    );

  const sections = new Map<string, GridFormField<T>[]>();
  fields.forEach(({ sourceIndex: _sourceIndex, ...field }) => {
    const sectionFields = sections.get(field.group) ?? [];
    sectionFields.push(field);
    sections.set(field.group, sectionFields);
  });

  return Array.from(sections, ([group, sectionFields]) => ({
    group,
    fields: sectionFields,
  }));
}