import { describe, expect, it } from 'vitest';
import {
  buildGridFormSections,
  isGridFormFieldReadOnly,
} from '../src/shared/components/f1-grid/form/GridFormModel';
import type { F1GridColumn } from '../src/shared/components/f1-grid';

type FormRow = {
  id: string;
  name: string;
  status: boolean;
  department: string;
  memo: string;
  secret: string;
};

describe('F1-Grid form model', () => {
  it('builds form sections from sorted visible data columns', () => {
    const columns: F1GridColumn<FormRow>[] = [
      { field: 'id', headerName: '번호', type: 'rownumber' },
      {
        field: 'name',
        headerName: '이름',
        headerGroup: '기본 정보',
        form: { order: 20, span: 2 },
      },
      {
        field: 'status',
        headerName: '사용 여부',
        headerGroup: '상태',
        form: { order: 10 },
      },
      {
        field: 'department',
        headerName: '부서',
        headerGroup: '기본 정보',
        form: { group: '조직', order: 10, label: '소속 부서' },
      },
      { field: 'memo', headerName: '메모' },
      {
        field: 'secret',
        headerName: '숨김 값',
        hidden: true,
        form: { hidden: false, group: '상태', order: 15 },
      },
      {
        field: 'department',
        headerName: '제외할 필드',
        form: { hidden: true },
      },
    ];

    const sections = buildGridFormSections(columns);

    expect(sections.map((section) => section.group)).toEqual([
      '기본 정보',
      '상태',
      '조직',
    ]);
    expect(sections.map((section) => section.fields.map((field) => field.field))).toEqual([
      ['memo', 'name'],
      ['status', 'secret'],
      ['department'],
    ]);
    expect(sections[1].fields[0]).toEqual({
      column: columns[2],
      field: 'status',
      label: '사용 여부',
      group: '상태',
      order: 10,
      span: 1,
    });
    expect(sections[2].fields[0]).toEqual({
      column: columns[3],
      field: 'department',
      label: '소속 부서',
      group: '조직',
      order: 10,
      span: 1,
    });
  });

  it('resolves form model field read-only state from form override or cell editability', () => {
    const row: FormRow = {
      id: '1',
      name: '홍길동',
      status: true,
      department: '개발',
      memo: '',
      secret: '',
    };
    const formReadOnly: F1GridColumn<FormRow> = {
      field: 'name',
      headerName: '이름',
      editable: true,
      form: { readOnly: true },
    };
    const formReadOnlyByMode: F1GridColumn<FormRow> = {
      field: 'department',
      headerName: '부서',
      form: { readOnly: (_row, mode) => mode === 'edit' },
    };
    const checkbox: F1GridColumn<FormRow> = {
      field: 'status',
      headerName: '사용 여부',
      type: 'checkbox',
    };
    const ordinary: F1GridColumn<FormRow> = {
      field: 'memo',
      headerName: '메모',
    };

    expect(isGridFormFieldReadOnly(formReadOnly, row, 'create')).toBe(true);
    expect(isGridFormFieldReadOnly(formReadOnlyByMode, row, 'create')).toBe(false);
    expect(isGridFormFieldReadOnly(formReadOnlyByMode, row, 'edit')).toBe(true);
    expect(isGridFormFieldReadOnly(checkbox, row, 'edit')).toBe(false);
    expect(isGridFormFieldReadOnly(ordinary, row, 'edit')).toBe(true);
  });
});