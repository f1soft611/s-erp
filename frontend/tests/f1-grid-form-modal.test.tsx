import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GridFormField } from '../src/shared/components/f1-grid/form/GridFormField';
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

type TypedFormRow = {
  id: string;
  name: string;
  quantity: number | '';
  enabled: boolean;
  categoryId: number;
  ownerId: number;
  ownerName: string;
  code: string;
  codeName: string;
  date: string;
  datetime: string;
  time: string;
};

const typedRow: TypedFormRow = {
  id: 'row-1',
  name: '원본 이름',
  quantity: 3,
  enabled: false,
  categoryId: 1,
  ownerId: 10,
  ownerName: '기존 담당자',
  code: 'A01',
  codeName: '기존 코드',
  date: '2026-09-10',
  datetime: '2026-09-10T09:30',
  time: '09:30',
};

describe('typed form field', () => {
  it('renders text with margin none and uses getValue for the displayed value', () => {
    const onPatch = vi.fn();

    render(
      <GridFormField
        column={{
          field: 'name',
          headerName: '이름',
          getValue: (row) => `${row.name} 표시`,
        }}
        row={typedRow}
        mode="edit"
        value={typedRow.name}
        readOnly={false}
        onPatch={onPatch}
      />,
    );

    const input = screen.getByRole('textbox', { name: '이름' });
    expect(input).toHaveValue('원본 이름 표시');
    expect(input.closest('.MuiTextField-root')).not.toHaveClass(
      'MuiFormControl-marginNormal',
    );

    fireEvent.change(input, { target: { value: '변경 이름' } });
    expect(onPatch).toHaveBeenLastCalledWith({ name: '변경 이름' });
  });

  it('patches non-empty numbers as numbers and empty numbers as an empty string', () => {
    const onPatch = vi.fn();

    const { rerender } = render(
      <GridFormField
        column={{ field: 'quantity', headerName: '수량', type: 'number' }}
        row={typedRow}
        mode="edit"
        value={typedRow.quantity}
        readOnly={false}
        onPatch={onPatch}
      />,
    );

    fireEvent.change(screen.getByRole('spinbutton', { name: '수량' }), {
      target: { value: '12.5' },
    });
    expect(onPatch).toHaveBeenLastCalledWith({ quantity: 12.5 });

    rerender(
      <GridFormField
        column={{ field: 'quantity', headerName: '수량', type: 'number' }}
        row={typedRow}
        mode="edit"
        value={12.5}
        readOnly={false}
        onPatch={onPatch}
      />,
    );
    fireEvent.change(screen.getByRole('spinbutton', { name: '수량' }), {
      target: { value: '' },
    });
    expect(onPatch).toHaveBeenLastCalledWith({ quantity: '' });
  });

  it('patches checkbox values as booleans', () => {
    const onPatch = vi.fn();

    render(
      <GridFormField
        column={{ field: 'enabled', headerName: '사용 여부', type: 'checkbox' }}
        row={typedRow}
        mode="edit"
        value={typedRow.enabled}
        readOnly={false}
        onPatch={onPatch}
      />,
    );

    fireEvent.click(screen.getByRole('checkbox', { name: '사용 여부' }));
    expect(onPatch).toHaveBeenLastCalledWith({ enabled: true });
  });

  it('preserves the original number value of select options', () => {
    const onPatch = vi.fn();

    render(
      <GridFormField
        column={{
          field: 'categoryId',
          headerName: '분류',
          type: 'select',
          options: [
            { value: 1, label: '일반' },
            { value: 2, label: '중요' },
          ],
        }}
        row={typedRow}
        mode="edit"
        value={typedRow.categoryId}
        readOnly={false}
        onPatch={onPatch}
      />,
    );

    fireEvent.mouseDown(screen.getByRole('combobox', { name: '분류' }));
    fireEvent.click(screen.getByRole('option', { name: '중요' }));
    expect(onPatch).toHaveBeenLastCalledWith({ categoryId: 2 });
  });

  it('preserves the original value of autocomplete options', () => {
    const onPatch = vi.fn();

    render(
      <GridFormField
        column={{
          field: 'ownerId',
          headerName: '담당자',
          type: 'autocomplete',
          options: [
            { value: 10, label: '김담당' },
            { value: 20, label: '이담당' },
          ],
        }}
        row={typedRow}
        mode="edit"
        value={typedRow.ownerId}
        readOnly={false}
        onPatch={onPatch}
      />,
    );

    const input = screen.getByRole('combobox', { name: '담당자' });
    fireEvent.mouseDown(input);
    fireEvent.click(screen.getByRole('option', { name: '이담당' }));
    expect(onPatch).toHaveBeenLastCalledWith({ ownerId: 20 });
  });

  it('uses the column onValueChange patch when provided', () => {
    const onPatch = vi.fn();

    render(
      <GridFormField
        column={{
          field: 'ownerId',
          headerName: '담당자',
          type: 'select',
          options: [{ value: 20, label: '이담당' }],
          onValueChange: (_row, value) => ({
            ownerId: value as number,
            ownerName: '이담당',
          }),
        }}
        row={typedRow}
        mode="edit"
        value={typedRow.ownerId}
        readOnly={false}
        onPatch={onPatch}
      />,
    );

    fireEvent.mouseDown(screen.getByRole('combobox', { name: '담당자' }));
    fireEvent.click(screen.getByRole('option', { name: '이담당' }));
    expect(onPatch).toHaveBeenLastCalledWith({
      ownerId: 20,
      ownerName: '이담당',
    });
  });

  it('merges code picker callback and return patches', () => {
    const onPatch = vi.fn();
    const onOpenCodePicker = vi.fn((_row, applyPatch) => {
      applyPatch({ code: 'B02' });
      return { codeName: '변경 코드' };
    });

    render(
      <GridFormField
        column={{
          field: 'code',
          headerName: '품목 코드',
          type: 'code',
          onOpenCodePicker,
        }}
        row={typedRow}
        mode="edit"
        value={typedRow.code}
        readOnly={false}
        onPatch={onPatch}
      />,
    );

    expect(screen.getByRole('textbox', { name: '품목 코드' })).toHaveAttribute(
      'readonly',
    );
    fireEvent.click(screen.getByRole('button', { name: '품목 코드 선택' }));

    expect(onOpenCodePicker).toHaveBeenCalledWith(typedRow, expect.any(Function));
    expect(onPatch).toHaveBeenCalledTimes(1);
    expect(onPatch).toHaveBeenCalledWith({
      code: 'B02',
      codeName: '변경 코드',
    });
  });

  it.each([
    ['date', 'date', '2026-09-11'],
    ['datetime', 'datetime-local', '2026-09-11T10:45'],
    ['time', 'time', '10:45'],
  ] as const)('patches %s values as compatible strings', (type, inputType, nextValue) => {
    const onPatch = vi.fn();
    const field = type as 'date' | 'datetime' | 'time';

    render(
      <GridFormField
        column={{ field, headerName: type, type }}
        row={typedRow}
        mode="edit"
        value={typedRow[field]}
        readOnly={false}
        onPatch={onPatch}
      />,
    );

    fireEvent.change(screen.getByLabelText(type), {
      target: { value: nextValue, type: inputType },
    });
    expect(onPatch).toHaveBeenLastCalledWith({ [field]: nextValue });
  });

  it('connects required, read-only, error and helper text accessibility', () => {
    render(
      <GridFormField
        column={{ field: 'name', headerName: '이름', required: true }}
        row={typedRow}
        mode="edit"
        value={typedRow.name}
        readOnly
        error="이름은 필수입니다."
        onPatch={vi.fn()}
      />,
    );

    const input = screen.getByRole('textbox', { name: /이름/ });
    const helper = screen.getByText('이름은 필수입니다.');
    expect(input).toBeRequired();
    expect(input).toHaveAttribute('readonly');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', helper.id);
  });
});