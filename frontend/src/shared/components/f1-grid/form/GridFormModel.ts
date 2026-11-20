import type { F1GridColumn, F1GridFormMode } from '../types/grid.types';
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

type GridFormFieldEntry<T extends object> = GridFormField<T> & {
  sourceIndex: number;
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

export function isGridFormFieldDisabled<T extends object>(
  column: F1GridColumn<T>,
  row: T,
  mode: F1GridFormMode,
): boolean {
  const disabled = column.form?.disabled;
  return typeof disabled === 'function' ? disabled(row, mode) : disabled ?? false;
}

export function buildGridFormSections<T extends object>(
  columns: F1GridColumn<T>[],
  row?: T,
): GridFormSection<T>[] {
  const fields = columns
    .map((column, sourceIndex) => ({
      column,
      sourceIndex,
      field: column.field,
      label:
        typeof column.form?.label === 'function'
          ? row
            ? column.form.label(row)
            : column.headerName
          : column.form?.label ?? column.headerName,
      group: column.form?.group ?? column.headerGroup ?? '기본 정보',
      order: column.form?.order ?? sourceIndex,
      span: column.form?.span ?? 1,
    }))
    .filter(({ column }) => {
      if (column.type === 'rownumber') return false;
      if (column.form?.hidden === true) return false;
      if (column.hidden && column.form?.hidden !== false) return false;
      const visible = column.form?.visible;
      if (row !== undefined && visible !== undefined) return typeof visible === 'function' ? visible(row) : visible;
      if (row !== undefined && !isCellEditable(column, row)) return false;
      return true;
    });

  const groups = new Map<string, GridFormFieldEntry<T>[]>();
  fields.forEach((field) => {
    const sectionFields = groups.get(field.group) ?? [];
    sectionFields.push({ ...field, sourceIndex: field.sourceIndex });
    groups.set(field.group, sectionFields);
  });

  // 섹션 순서: 기본은 처음 나온 칸의 컬럼 위치 순서. 섹션 안 칸에 `form.groupOrder`가 있으면 그 최솟값을 순번으로 쓴다.
  return Array.from(groups, ([group, sectionFields], index) => {
    const groupOrders = sectionFields
      .map((field) => field.column.form?.groupOrder)
      .filter((value): value is number => value !== undefined);
    return {
      rank: groupOrders.length > 0 ? Math.min(...groupOrders) : index,
      index,
      section: {
        group,
        fields: sectionFields
          .sort(
            (left, right) =>
              left.order - right.order || left.sourceIndex - right.sourceIndex,
          )
          .map(({ sourceIndex: _sourceIndex, ...field }) => field),
      },
    };
  })
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .map(({ section }) => section);
}
