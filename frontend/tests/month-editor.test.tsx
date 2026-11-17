import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { PageSearchArea } from '../src/shared/components/PageSearchArea';
import {
  formatMonthValue,
  MonthEditor,
  normalizeMonthInput,
} from '../src/shared/components/f1-grid/editing/MonthEditor';
import { toPageSearchFields, type PageSearchField } from '../src/shared/components/page-search/searchFields';

describe('month helpers', () => {
  it('normalizes YYYYMM and YYYY-MM and rejects invalid months', () => {
    expect(normalizeMonthInput('202611')).toBe('202611');
    expect(normalizeMonthInput('2026-11')).toBe('202611');
    expect(normalizeMonthInput(' 2026 11 ')).toBe('202611');
    expect(normalizeMonthInput('202613')).toBe('');
    expect(normalizeMonthInput('202600')).toBe('');
    expect(normalizeMonthInput('2026')).toBe('');
    expect(normalizeMonthInput('')).toBe('');
    expect(formatMonthValue('202611')).toBe('2026-11');
    expect(formatMonthValue('2026')).toBe('2026');
  });

  it('turns a column search inputType month into a month search field', () => {
    const fields = toPageSearchFields([
      { field: 'closingMonth', headerName: '마감월', type: 'text', hidden: true, search: { inputType: 'month', required: true } },
    ]);
    expect(fields).toEqual([expect.objectContaining({ field: 'closingMonth', type: 'month', required: true })]);
  });
});

describe('MonthEditor', () => {
  function Harness({ onChange }: { onChange: (value: string) => void }) {
    const [value, setValue] = useState('202611');
    return <MonthEditor label="마감월" value={value} onChange={(next) => { setValue(next); onChange(next); }} />;
  }

  it('shows YYYY-MM, accepts typing and picks a month from the calendar', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const input = screen.getByRole('textbox', { name: '마감월' });
    expect(input).toHaveValue('2026-11');

    fireEvent.change(input, { target: { value: '2027-03' } });
    expect(onChange).toHaveBeenLastCalledWith('202703');
    expect(input).toHaveValue('2027-03');

    fireEvent.click(screen.getByRole('button', { name: '마감월 달력 열기' }));
    const calendar = await screen.findByRole('presentation');
    expect(within(calendar).getByRole('combobox', { name: '연도' })).toHaveValue('2027');
    fireEvent.click(within(calendar).getByRole('button', { name: '6월' }));
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('202706'));
    await waitFor(() => expect(screen.queryByRole('presentation')).not.toBeInTheDocument());
    expect(screen.getByRole('textbox', { name: '마감월' })).toHaveValue('2027-06');
  });
});

describe('PageSearchArea month field', () => {
  const fields: PageSearchField[] = [{ field: 'closingMonth', label: '마감월', type: 'month', searchSpan: 2, required: true }];

  function Harness({ onSearch }: { onSearch: (values: Record<string, unknown>) => void }) {
    const [values, setValues] = useState<Record<string, string>>({ closingMonth: '202611' });
    return (
      <PageSearchArea
        detailFields={fields}
        detailValues={values}
        appliedDetailValues={values}
        onDetailValuesChange={(next) => setValues(next as Record<string, string>)}
        onDetailSearch={onSearch}
      />
    );
  }

  it('searches with the typed month and blocks an invalid or empty month', () => {
    const onSearch = vi.fn();
    render(<Harness onSearch={onSearch} />);
    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    const input = screen.getByRole('textbox', { name: '마감월' });
    expect(input).toHaveValue('2026-11');

    fireEvent.change(input, { target: { value: '2026-13' } });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    expect(screen.getByText('올바른 월을 입력하세요.')).toBeInTheDocument();
    expect(onSearch).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole('textbox', { name: '마감월' }), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    expect(screen.getByText('필수 입력입니다.')).toBeInTheDocument();
    expect(onSearch).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole('textbox', { name: '마감월' }), { target: { value: '202610' } });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    expect(onSearch).toHaveBeenCalledWith({ closingMonth: '202610' });
  });
});
