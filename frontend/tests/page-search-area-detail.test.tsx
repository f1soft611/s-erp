import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import dayjs from 'dayjs';
import { Profiler, startTransition, Suspense, useState } from 'react';

const { getSystemDateMock } = vi.hoisted(() => ({
  getSystemDateMock: vi.fn(),
}));
vi.mock('../src/shared/services/systemDateService', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../src/shared/services/systemDateService')
  >()),
  getSystemDate: getSystemDateMock,
}));
import { PageSearchArea } from '../src/shared/components/PageSearchArea';
import { toPageSearchFields, type PageSearchField, type PageSearchFieldValue } from '../src/shared/components/page-search/searchFields';

function deferredDate() {
  let resolve!: (value: string) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<string>((resolveDate, rejectDate) => {
    resolve = resolveDate;
    reject = rejectDate;
  });
  return { promise, resolve, reject };
}

describe('PageSearchArea 상세 검색', () => {
  const fields: PageSearchField[] = [
    { field: 'name', label: '이름', type: 'text', searchSpan: 2 },
    { field: 'createdAt', label: '생성일', type: 'date', searchSpan: 3 },
    {
      field: 'status',
      label: '상태',
      type: 'select',
      searchSpan: 1,
      options: [{ value: 'Y', label: '사용' }],
    },
  ];

  it('commits external drafts without a stale value and preserves edits when only field metadata changes', () => {
    const commits = vi.fn();
    const defaults = { status: 'Y' };
    const initial = { name: 'first' };
    const observe = () => commits((screen.queryByRole('textbox', { name: '이름' }) as HTMLInputElement | null)?.value ?? null);
    const view = (detailValues: Record<string, PageSearchFieldValue>, detailFields = fields) => (
      <Profiler id="search-draft" onRender={observe}>
        <PageSearchArea detailFields={detailFields} detailValues={detailValues} defaultValues={defaults} />
      </Profiler>
    );
    const { rerender } = render(view(initial));
    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    fireEvent.change(screen.getByRole('textbox', { name: '이름' }), { target: { value: 'partial' } });
    rerender(view(initial, [...fields]));
    expect(screen.getByRole('textbox', { name: '이름' })).toHaveValue('partial');

    commits.mockClear();
    rerender(view({ name: 'second' }));
    expect(commits).toHaveBeenNthCalledWith(1, 'second');
    rerender(<Profiler id="search-draft" onRender={observe}><PageSearchArea /></Profiler>);
    expect(screen.queryByRole('button', { name: '상세 검색 열기' })).not.toBeInTheDocument();
  });

  it('clears obsolete removal notices before commit and restores a previously removed chip', () => {
    const commits = vi.fn();
    const initial = { name: 'Applied' };
    const view = (appliedDetailValues: Record<string, PageSearchFieldValue>) => (
      <Profiler id="search-removal" onRender={() => commits(screen.queryByRole('status')?.textContent ?? null)}>
        <PageSearchArea detailFields={fields} detailValues={initial} appliedDetailValues={appliedDetailValues} />
      </Profiler>
    );
    const { rerender } = render(view(initial));
    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    fireEvent.click(screen.getByRole('button', { name: '이름 검색 조건 제거' }));
    expect(screen.getByRole('status')).toHaveTextContent('조건 변경 내용은 조회 버튼을 눌러 적용하세요.');

    commits.mockClear();
    rerender(view({}));
    expect(commits).toHaveBeenNthCalledWith(1, null);
    rerender(view(initial));
    expect(screen.getByText('이름: Applied')).toBeVisible();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '이름' })).toHaveValue('');
  });

  it('keeps the committed quick-date request alive while a different draft transition is suspended', async () => {
    const request = deferredDate();
    getSystemDateMock.mockReset().mockReturnValueOnce(request.promise);
    const onChange = vi.fn();
    const attempted = vi.fn();
    const pending = new Promise<void>(() => undefined);
    const dateFields: PageSearchField[] = [{ field: 'period', label: '기간', type: 'date', required: true }];
    const initial = { period: { from: '2026-10-01', to: '2026-10-31' } };
    function SuspendUpdate({ blocked }: { blocked: boolean }) {
      if (blocked) {
        attempted();
        throw pending;
      }
      return null;
    }
    const view = (detailValues: Record<string, PageSearchFieldValue>, blocked = false) => (
      <Suspense fallback={<span>Updating search</span>}>
        <PageSearchArea detailFields={dateFields} detailValues={detailValues} onDetailValuesChange={onChange}>
          <SuspendUpdate blocked={blocked} />
        </PageSearchArea>
      </Suspense>
    );
    const { rerender } = render(view(initial));
    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    fireEvent.click(within(screen.getByRole('group', { name: '기간 빠른 날짜 세팅' })).getByRole('button', { name: '오늘', exact: true }));
    await act(async () => {
      startTransition(() => rerender(view({ period: { from: '2030-01-01', to: '2030-01-31' } }, true)));
    });
    expect(attempted).toHaveBeenCalled();
    expect(screen.queryByText('Updating search')).not.toBeInTheDocument();

    await act(async () => request.resolve('2026-11-18'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ period: { from: '2026-11-18', to: '2026-11-18' } });
    rerender(view(initial));
    expect(screen.getByLabelText('기간 시작일')).toHaveValue('2026-11-18');
  });

  it('lets a multiple select pick several values stored as a comma separated string', () => {
    const options = [{ value: 'RAW', label: '원재료' }, { value: 'SUB', label: '부재료' }, { value: 'SUPPLY', label: '소모품' }];
    const onDetailSearch = vi.fn();
    const field: PageSearchField = { field: 'itemTypes', label: '품목 계정분류', type: 'select', searchSpan: 1, multiple: true, options };
    render(
      <PageSearchArea
        detailFields={[field]}
        defaultValues={{ itemTypes: 'RAW,SUB' }}
        appliedDetailValues={{ itemTypes: 'RAW,SUB' }}
        onDetailSearch={onDetailSearch}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    // 적용된 조건 칩은 선택한 이름을 쉼표로 보여 준다.
    expect(screen.getByText('품목 계정분류: 원재료, 부재료')).toBeInTheDocument();
    const combobox = screen.getByRole('combobox', { name: '품목 계정분류' });
    expect(combobox).toHaveTextContent('원재료, 부재료');
    fireEvent.mouseDown(combobox);
    // 멀티선택에는 빈 값 "전체" 항목이 없고 선택 항목은 체크 표시가 된다.
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['원재료', '부재료', '소모품']);
    expect(screen.getByRole('option', { name: '원재료' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('option', { name: '소모품' }));
    fireEvent.click(screen.getByRole('option', { name: '원재료' }));
    // 목록은 선택 중에도 열려 있고, 선택을 바꿔도 순서는 옵션 순서가 아니라 선택 순서를 따라도 값은 쉼표 문자열이다.
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
    expect(screen.getByRole('combobox', { name: '품목 계정분류' })).toHaveTextContent('부재료, 소모품');
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    expect(onDetailSearch).toHaveBeenCalledWith(expect.objectContaining({ itemTypes: 'SUB,SUPPLY' }));
  });

  it('shows the blank 전체 option on a select field unless allowEmpty is false', () => {
    const statusOptions = [{ value: 'ACTIVE', label: '정상' }, { value: 'CANCELED', label: '취소' }, { value: 'ALL', label: '전체' }];
    const { rerender } = render(
      <PageSearchArea
        detailFields={[{ field: 'status', label: '상태', type: 'select', searchSpan: 1, options: statusOptions }]}
        defaultValues={{ status: 'ACTIVE' }}
        onDetailSearch={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '상태' }));
    // 빈 값 "전체" + 옵션의 "전체"(ALL)가 둘 다 나온다.
    expect(screen.getAllByRole('option', { name: '전체' })).toHaveLength(2);
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });

    rerender(
      <PageSearchArea
        detailFields={[{ field: 'status', label: '상태', type: 'select', searchSpan: 1, options: statusOptions, allowEmpty: false }]}
        defaultValues={{ status: 'ACTIVE' }}
        onDetailSearch={vi.fn()}
      />,
    );
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '상태' }));
    const options = screen.getAllByRole('option').map((option) => option.textContent);
    expect(options).toEqual(['정상', '취소', '전체']);
  });

  it('maps the column search allowEmpty:false option onto the search field', () => {
    const [field] = toPageSearchFields([
      {
        field: 'status', headerName: '상태', type: 'select', options: [{ value: 'ACTIVE', label: '정상' }],
        search: { required: true, allowEmpty: false },
      },
    ] as never);
    expect(field).toMatchObject({ field: 'status', required: true, allowEmpty: false });
    const [plain] = toPageSearchFields([{ field: 'status', headerName: '상태', type: 'select', options: [] }] as never);
    expect(plain).not.toHaveProperty('allowEmpty');
  });

  it('sanitizes configured string search fields but leaves ordinary text unchanged', () => {
    const onSearch = vi.fn();
    const onValuesChange = vi.fn();
    const sanitizeInput = (value: string) => value.replace(/[^0-9-]/g, '');
    render(
      <PageSearchArea
        detailFields={[
          {
            field: 'businessNo',
            label: '사업자번호',
            type: 'text',
            searchSpan: 1,
            sanitizeInput,
          },
          { field: 'customerName', label: '거래처명', type: 'text', searchSpan: 1 },
        ]}
        onDetailValuesChange={onValuesChange}
        onDetailSearch={onSearch}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    const businessNo = screen.getByRole('textbox', { name: '사업자번호' });
    fireEvent.change(businessNo, { target: { value: 'AB012-3X' } });
    expect(businessNo).toHaveValue('012-3');
    expect(onValuesChange).toHaveBeenLastCalledWith({ businessNo: '012-3' });
    fireEvent.change(screen.getByRole('textbox', { name: '거래처명' }), {
      target: { value: 'Acme 12' },
    });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    expect(onSearch).toHaveBeenCalledWith({
      businessNo: '012-3',
      customerName: 'Acme 12',
    });
  });

  it('formats detailed search values using the field input format', () => {
    const onValuesChange = vi.fn();
    render(
      <PageSearchArea
        detailFields={[
          {
            field: 'businessNo',
            label: '사업자번호',
            type: 'text',
            searchSpan: 1,
            inputFormat: { type: 'digits', groupSizes: [3, 2] },
          },
        ]}
        onDetailValuesChange={onValuesChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    const businessNo = screen.getByRole('textbox', { name: '사업자번호' });
    fireEvent.change(businessNo, { target: { value: '1234567890' } });

    expect(businessNo).toHaveValue('123-45-67890');
    expect(onValuesChange).toHaveBeenLastCalledWith({
      businessNo: '123-45-67890',
    });
  });

  it('caps detailed search values by max digits but keeps partial input', () => {
    const onValuesChange = vi.fn();
    render(
      <PageSearchArea
        detailFields={[
          {
            field: 'businessNo',
            label: '사업자번호',
            type: 'text',
            searchSpan: 1,
            inputFormat: { type: 'digits', groupSizes: [3, 2], maxDigits: 10 },
          },
        ]}
        onDetailValuesChange={onValuesChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    const businessNo = screen.getByRole('textbox', { name: '사업자번호' });

    fireEvent.change(businessNo, { target: { value: '123456789012' } });
    expect(businessNo).toHaveValue('123-45-67890');
    expect(onValuesChange).toHaveBeenLastCalledWith({
      businessNo: '123-45-67890',
    });

    fireEvent.change(businessNo, { target: { value: '1234' } });
    expect(businessNo).toHaveValue('123-4');
    expect(onValuesChange).toHaveBeenLastCalledWith({
      businessNo: '123-4',
    });
  });

  it.each([
    ['20261022', '2026-10-22'],
    ['261022', '2026-10-22'],
    ['1022', `${dayjs().year()}-10-22`],
    ['22', `${dayjs().format('YYYY-MM')}-22`],
    ['10-22', `${dayjs().year()}-10-22`],
    ['2024-02-29', '2024-02-29'],
  ])('날짜 %s를 blur에서 %s로 확정한다', (input, expected) => {
    const onChange = vi.fn();
    render(<PageSearchArea detailFields={fields} onDetailValuesChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    const start = screen.getByLabelText('생성일 시작일');
    expect(start).toHaveAttribute('type', 'text');
    fireEvent.change(start, { target: { value: input } });
    fireEvent.blur(start);
    expect(start).toHaveValue(expected);
    expect(onChange).toHaveBeenLastCalledWith({
      createdAt: { from: expected, to: '' },
    });
  });

  it('blur 없이 조회해도 양쪽 날짜를 ISO로 정규화한다', () => {
    const onSearch = vi.fn();
    render(<PageSearchArea detailFields={fields} onDetailSearch={onSearch} />);
    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    fireEvent.change(screen.getByLabelText('생성일 시작일'), {
      target: { value: '20261001' },
    });
    fireEvent.change(screen.getByLabelText('생성일 종료일'), {
      target: { value: '261022' },
    });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    expect(onSearch).toHaveBeenCalledWith({
      createdAt: { from: '2026-10-01', to: '2026-10-22' },
    });
  });

  it('잘못된 날짜는 입력을 보존하고 오류를 표시하며 조회를 차단한다', () => {
    const onSearch = vi.fn();
    render(<PageSearchArea detailFields={fields} onDetailSearch={onSearch} />);
    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    const start = screen.getByLabelText('생성일 시작일');
    fireEvent.change(start, { target: { value: '20260230' } });
    fireEvent.blur(start);
    expect(start).toHaveValue('20260230');
    expect(start).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('올바른 날짜를 입력하세요.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    expect(onSearch).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: '상세 검색' })).toBeVisible();
    fireEvent.change(start, { target: { value: '20240229' } });
    fireEvent.blur(start);
    expect(start).toHaveAttribute('aria-invalid', 'false');
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    expect(onSearch).toHaveBeenCalledWith({
      createdAt: { from: '2024-02-29', to: '' },
    });
  });

  it('오류 날짜를 삭제하면 한쪽만 지정한 검색을 허용한다', () => {
    const onSearch = vi.fn();
    render(<PageSearchArea detailFields={fields} onDetailSearch={onSearch} />);
    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    const start = screen.getByLabelText('생성일 시작일');
    fireEvent.change(start, { target: { value: '20260230' } });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    expect(onSearch).not.toHaveBeenCalled();
    fireEvent.change(start, { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('생성일 종료일'), {
      target: { value: '20261022' },
    });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    expect(onSearch).toHaveBeenCalledWith({
      createdAt: { from: '', to: '2026-10-22' },
    });
  });

  it('초기화와 외부 ISO 날짜 복원은 날짜 오류도 해제한다', () => {
    const defaults = { createdAt: { from: '2026-10-01', to: '2026-10-22' } };
    const { rerender } = render(
      <PageSearchArea detailFields={fields} defaultValues={defaults} />,
    );
    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    const start = screen.getByLabelText('생성일 시작일');
    fireEvent.change(start, { target: { value: '20260230' } });
    fireEvent.blur(start);
    fireEvent.click(screen.getByRole('button', { name: '초기화' }));
    expect(start).toHaveValue('2026-10-01');
    expect(start).toHaveAttribute('aria-invalid', 'false');
    fireEvent.change(start, { target: { value: '20260230' } });
    fireEvent.blur(start);
    rerender(
      <PageSearchArea
        detailFields={fields}
        detailValues={{ createdAt: { from: '2026-09-01', to: '' } }}
      />,
    );
    expect(start).toHaveValue('2026-09-01');
    expect(start).toHaveAttribute('aria-invalid', 'false');
  });

  it('각 날짜의 달력을 열고 날짜 선택 결과를 ISO로 반영한다', () => {
    render(
      <PageSearchArea
        detailFields={fields}
        detailValues={{ createdAt: { from: '2026-10-01', to: '' } }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    fireEvent.click(screen.getByRole('button', { name: '생성일 시작일 달력 열기' }));
    fireEvent.click(screen.getByRole('gridcell', { name: '2026-10-22' }));
    expect(screen.getByLabelText('생성일 시작일')).toHaveValue('2026-10-22');
    expect(screen.getByLabelText('생성일 종료일')).toHaveValue('');
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
  });

  it('종료일 달력은 종료일 값을 선택으로 보여 주고 종료일만 바꾼다', () => {
    render(
      <PageSearchArea
        detailFields={fields}
        detailValues={{ createdAt: { from: '2026-10-10', to: '2026-10-20' } }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    fireEvent.click(screen.getByRole('button', { name: '생성일 종료일 달력 열기' }));
    expect(screen.getByRole('gridcell', { name: '2026-10-20' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('gridcell', { name: '2026-10-10' })).toHaveAttribute('aria-selected', 'false');
    fireEvent.click(screen.getByRole('gridcell', { name: '2026-10-25' }));
    expect(screen.getByLabelText('생성일 시작일')).toHaveValue('2026-10-10');
    expect(screen.getByLabelText('생성일 종료일')).toHaveValue('2026-10-25');
  });

  it('달력의 삭제는 그 날짜 하나만 비운다', () => {
    render(
      <PageSearchArea
        detailFields={fields}
        detailValues={{ createdAt: { from: '2026-10-10', to: '2026-10-20' } }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    fireEvent.click(screen.getByRole('button', { name: '생성일 종료일 달력 열기' }));
    fireEvent.click(screen.getByRole('button', { name: '삭제' }));
    expect(screen.getByLabelText('생성일 시작일')).toHaveValue('2026-10-10');
    expect(screen.getByLabelText('생성일 종료일')).toHaveValue('');
  });

  it('controlled 폼에서 다른 날짜를 편집해도 기존 오류를 유지한다', () => {
    function ControlledSearch() {
      const [values, setValues] = useState({});
      return (
        <PageSearchArea
          detailFields={fields}
          detailValues={values}
          onDetailValuesChange={setValues}
        />
      );
    }
    render(<ControlledSearch />);
    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    const start = screen.getByLabelText('생성일 시작일');
    fireEvent.change(start, { target: { value: '20260230' } });
    fireEvent.blur(start);
    expect(start).toHaveAttribute('aria-invalid', 'true');
    fireEvent.change(screen.getByLabelText('생성일 종료일'), {
      target: { value: '20261022' },
    });
    expect(start).toHaveAttribute('aria-invalid', 'true');
  });

  it('실제 적용된 상세 조건만 토글과 칩에 표시한다', () => {
    render(
      <PageSearchArea
        detailFields={fields}
        detailValues={{ name: '입력 중', status: 'Y' }}
        appliedDetailValues={{
          name: '기존 검색어',
          createdAt: { from: '2026-10-01', to: '' },
          status: 'Y',
        }}
      />,
    );

    const toggle = screen.getByRole('button', { name: '상세 검색 열기' });
    expect(toggle).toBeVisible();
    expect(toggle).toHaveAttribute('aria-description', '적용된 상세 검색 조건 3개');
    expect(screen.queryByText('이름: 입력 중')).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(screen.getByText('이름: 기존 검색어')).toBeVisible();
    expect(screen.getByText('생성일: 2026-10-01')).toBeVisible();
    expect(screen.getByText('상태: 사용')).toBeVisible();
  });

  it('상세검색에 추가 콘텐츠를 표시하고 적용 거래처 수를 배지에 더한다', () => {
    render(
      <PageSearchArea
        detailFields={fields}
        appliedDetailValues={{ name: '기존 검색어' }}
        detailExtraContent={<span>거래처 추가 검색</span>}
        detailExtraActiveFilterCount={2}
      />,
    );

    expect(screen.queryByText('거래처 추가 검색')).not.toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: '상세 검색 열기' });
    expect(toggle).toHaveAttribute('aria-description', '적용된 상세 검색 조건 3개');
    expect(screen.getByText('3')).toBeVisible();

    fireEvent.click(toggle);

    expect(
      within(screen.getByRole('dialog', { name: '상세 검색' })).getByText(
        '거래처 추가 검색',
      ),
    ).toBeVisible();
  });

  it('미적용 입력만 있으면 상세검색 토글을 활성화하지 않는다', () => {
    render(
      <PageSearchArea
        detailFields={fields}
        detailValues={{ name: '조회 전 값' }}
        appliedDetailValues={{}}
      />,
    );

    expect(
      screen.getByRole('button', { name: '상세 검색 열기' }),
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: /검색 조건 제거/ })).not.toBeInTheDocument();
  });

  it('적용된 상세 조건 칩 제거는 초안만 변경하고 명시적으로 조회하기 전까지 대기한다', () => {
    const onValuesChange = vi.fn();
    const onSearch = vi.fn();
    const appliedDetailValues = {
      name: '기존 검색어',
      status: 'Y',
    };
    render(
      <PageSearchArea
        detailFields={fields}
        detailValues={appliedDetailValues}
        appliedDetailValues={appliedDetailValues}
        onDetailValuesChange={onValuesChange}
        onDetailSearch={onSearch}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    fireEvent.click(screen.getByRole('button', { name: '이름 검색 조건 제거' }));

    const nextValues = { name: '', status: 'Y' };
    expect(onValuesChange).toHaveBeenLastCalledWith(nextValues);
    expect(onSearch).not.toHaveBeenCalled();
    expect(screen.queryByText('이름: 기존 검색어')).not.toBeInTheDocument();
    expect(screen.getByText('상태: 사용')).toBeVisible();
    expect(
      screen.getByText('조건 변경 내용은 조회 버튼을 눌러 적용하세요.'),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: '이름 검색 조건 제거' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '상태 검색 조건 제거' }),
    ).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '상태 검색 조건 제거' }));

    expect(onValuesChange).toHaveBeenLastCalledWith({ name: '', status: '' });
    expect(onSearch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    expect(onSearch).toHaveBeenCalledWith({ name: '', status: '' });
  });

  it('조회 전 안내는 조건 칩 아래에 두고 작업 버튼은 맨 위 행에 유지한다', () => {
    const appliedDetailValues = { name: '기존 검색어', status: 'Y' };
    render(
      <PageSearchArea
        detailFields={fields}
        detailValues={appliedDetailValues}
        appliedDetailValues={appliedDetailValues}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    fireEvent.click(screen.getByRole('button', { name: '이름 검색 조건 제거' }));

    const notice = screen.getByRole('status');
    const actions = screen.getByRole('group', { name: '상세 검색 작업' });
    expect(notice.parentElement).toBe(actions.parentElement);
    expect(getComputedStyle(actions.parentElement as HTMLElement).display).toBe(
      'grid',
    );
    expect(getComputedStyle(actions).gridRow).toBe('1');
    expect(getComputedStyle(actions).flexWrap).toBe('nowrap');
  });

  it('필수 날짜 범위의 양 끝을 입력하기 전에는 조회하지 않는다', () => {
    const onSearch = vi.fn();
    render(
      <PageSearchArea
        detailFields={[
          {
            field: 'orderDt',
            label: '수주일자',
            type: 'date',
            searchSpan: 1,
            required: true,
          },
        ]}
        onDetailSearch={onSearch}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    const from = screen.getByLabelText('수주일자 시작일');
    fireEvent.change(screen.getByLabelText('수주일자 종료일'), {
      target: { value: '20261022' },
    });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));

    expect(onSearch).not.toHaveBeenCalled();
    expect(from).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('필수 입력입니다.')).toBeVisible();
    expect(screen.getByRole('dialog', { name: '상세 검색' })).toBeVisible();

    fireEvent.change(from, { target: { value: '20261001' } });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));

    expect(onSearch).toHaveBeenCalledWith({
      orderDt: { from: '2026-10-01', to: '2026-10-22' },
    });
  });

  it('필수 날짜 조건에만 서버 날짜 기준 빠른 날짜 버튼을 제공한다', async () => {
    getSystemDateMock.mockResolvedValue('2026-11-17');
    const onSearch = vi.fn();
    render(
      <PageSearchArea
        detailFields={[
          {
            field: 'orderDt',
            label: '수주일자',
            type: 'date',
            searchSpan: 3,
            required: true,
          },
          {
            field: 'dueDt',
            label: '납기일',
            type: 'date',
            searchSpan: 3,
          },
        ]}
        onDetailSearch={onSearch}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    const group = screen.getByRole('group', {
      name: '수주일자 빠른 날짜 세팅',
    });
    expect(
      screen.queryByRole('group', { name: '납기일 빠른 날짜 세팅' }),
    ).toBeNull();

    fireEvent.click(within(group).getByRole('button', { name: '전월' }));
    await waitFor(() =>
      expect(screen.getByLabelText('수주일자 시작일')).toHaveValue(
        '2026-10-01',
      ),
    );
    expect(screen.getByLabelText('수주일자 종료일')).toHaveValue('2026-10-31');

    fireEvent.click(within(group).getByRole('button', { name: '오늘' }));
    await waitFor(() =>
      expect(screen.getByLabelText('수주일자 시작일')).toHaveValue(
        '2026-11-17',
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    expect(onSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        orderDt: { from: '2026-11-17', to: '2026-11-17' },
      }),
    );
  });

  describe('deferred quick dates', () => {
    const dateFields: PageSearchField[] = [
      { field: 'name', label: '이름', type: 'text' },
      { field: 'period', label: '기간', type: 'date', required: true },
    ];
    const defaults = {
      name: 'original',
      period: { from: '2026-10-01', to: '2026-10-31' },
    };

    function startRequest() {
      const request = deferredDate();
      getSystemDateMock.mockReset().mockReturnValueOnce(request.promise);
      const onChange = vi.fn();
      const props = {
        detailFields: dateFields,
        defaultValues: defaults,
        onDetailValuesChange: onChange,
      };
      const view = render(<PageSearchArea {...props} />);
      fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
      fireEvent.click(screen.getByRole('button', { name: '오늘', exact: true }));
      return { ...view, request, onChange, props };
    }

    it('merges the response with newer text and controlled parent echoes', async () => {
      const request = deferredDate();
      getSystemDateMock.mockReset().mockReturnValueOnce(request.promise);
      const onSearch = vi.fn();
      function ControlledSearch() {
        const [values, setValues] =
          useState<Record<string, PageSearchFieldValue>>(defaults);
        return (
          <PageSearchArea
            detailFields={dateFields}
            defaultValues={defaults}
            detailValues={values}
            onDetailValuesChange={setValues}
            onDetailSearch={onSearch}
          />
        );
      }
      render(<ControlledSearch />);
      fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
      fireEvent.click(screen.getByRole('button', { name: '오늘', exact: true }));
      fireEvent.change(screen.getByLabelText('이름'), { target: { value: 'latest' } });
      await act(async () => request.resolve('2026-11-18'));
      expect(screen.getByLabelText('이름')).toHaveValue('latest');
      expect(screen.getByLabelText('기간 시작일')).toHaveValue('2026-11-18');
      fireEvent.click(screen.getByRole('button', { name: '조회', exact: true }));
      expect(onSearch).toHaveBeenCalledWith({
        name: 'latest',
        period: { from: '2026-11-18', to: '2026-11-18' },
      });
    });

    it('preserves a manually edited date over an older response', async () => {
      const { request, onChange } = startRequest();
      fireEvent.change(screen.getByLabelText('기간 시작일'), {
        target: { value: '2026-12-01' },
      });
      onChange.mockClear();
      await act(async () => request.resolve('2026-11-18'));
      expect(screen.getByLabelText('기간 시작일')).toHaveValue('2026-12-01');
      expect(onChange).not.toHaveBeenCalled();
    });

    it.each(['resolve', 'reject'] as const)(
      'ignores an older %s after the latest preset succeeds',
      async (outcome) => {
        const { request, onChange } = startRequest();
        const latest = deferredDate();
        getSystemDateMock.mockReturnValueOnce(latest.promise);
        fireEvent.click(screen.getByRole('button', { name: '전월', exact: true }));
        await act(async () => latest.resolve('2026-11-18'));
        onChange.mockClear();
        await act(async () => {
          if (outcome === 'resolve') request.resolve('2026-12-18');
          else request.reject(new Error('older request failed'));
        });
        expect(screen.getByLabelText('기간 시작일')).toHaveValue('2026-10-01');
        expect(screen.getByLabelText('기간 종료일')).toHaveValue('2026-10-31');
        expect(screen.queryByText('서버 날짜를 불러오지 못했습니다.')).toBeNull();
        expect(onChange).not.toHaveBeenCalled();
      },
    );

    it('keeps requests for different date fields independent', async () => {
      const first = deferredDate();
      const second = deferredDate();
      getSystemDateMock.mockReset()
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(second.promise);
      const onChange = vi.fn();
      render(
        <PageSearchArea
          detailFields={[
            ...dateFields,
            { field: 'otherPeriod', label: '다른 기간', type: 'date', required: true },
          ]}
          defaultValues={defaults}
          onDetailValuesChange={onChange}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
      for (const label of ['기간', '다른 기간']) {
        fireEvent.click(within(screen.getByRole('group', {
          name: `${label} 빠른 날짜 세팅`,
        })).getByRole('button', { name: '오늘', exact: true }));
      }
      await act(async () => second.resolve('2026-11-19'));
      await act(async () => first.resolve('2026-11-18'));
      expect(screen.getByLabelText('기간 시작일')).toHaveValue('2026-11-18');
      expect(screen.getByLabelText('다른 기간 시작일')).toHaveValue('2026-11-19');
      expect(onChange).toHaveBeenLastCalledWith({
        ...defaults,
        period: { from: '2026-11-18', to: '2026-11-18' },
        otherPeriod: { from: '2026-11-19', to: '2026-11-19' },
      });
    });

    it.each(['reset', 'close', 'toggle', 'restore', 'unmount'] as const)(
      'discards a pending response after %s',
      async (action) => {
        const { request, onChange, props, rerender, unmount } = startRequest();
        if (action === 'reset') {
          fireEvent.click(screen.getByRole('button', { name: '초기화', exact: true }));
        } else if (action === 'close') {
          fireEvent.click(screen.getByRole('button', { name: '검색 닫기' }));
        } else if (action === 'toggle') {
          fireEvent.click(screen.getByRole('button', { name: '상세 검색 닫기' }));
        } else if (action === 'restore') {
          rerender(<PageSearchArea {...props} detailValues={{ name: 'restored' }} />);
        } else {
          unmount();
        }
        onChange.mockClear();
        await act(async () => request.resolve('2026-11-18'));
        expect(onChange).not.toHaveBeenCalled();
        if (action === 'reset' || action === 'restore') {
          expect(screen.getByLabelText('기간 시작일')).toHaveValue('2026-10-01');
        }
      },
    );
  });

  it('필수 날짜 상세조건은 칩에서 해제할 수 없다', () => {
    const onValuesChange = vi.fn();
    const onSearch = vi.fn();
    const appliedDetailValues = {
      orderDt: { from: '2026-10-01', to: '2026-10-22' },
    };
    render(
      <PageSearchArea
        detailFields={[
          {
            field: 'orderDt',
            label: '수주일자',
            type: 'date',
            searchSpan: 1,
            required: true,
          },
        ]}
        detailValues={appliedDetailValues}
        appliedDetailValues={appliedDetailValues}
        onDetailValuesChange={onValuesChange}
        onDetailSearch={onSearch}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    expect(
      screen.getByRole('button', { name: '수주일자 검색 조건 제거' }),
    ).toBeDisabled();
    expect(onValuesChange).not.toHaveBeenCalled();
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('상세검색이 열린 동안 그리드 로딩 덮개보다 위에 표시한다', () => {
    render(<PageSearchArea detailFields={fields} />);
    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));

    const detailDialog = screen.getByRole('dialog', { name: '상세 검색' });
    const searchArea = detailDialog.parentElement;
    expect(searchArea).not.toBeNull();
    const searchZIndex = Number.parseInt(
      getComputedStyle(searchArea as HTMLElement).zIndex,
      10,
    );
    expect(searchZIndex).toBeGreaterThan(12);
    expect(searchZIndex).toBeLessThan(1300);
  });

  const groupedFields: PageSearchField[] = [
    {
      field: 'submittedAt',
      label: '결재신청일',
      type: 'date',
      searchSpan: 4,
      group: 'date',
    },
    {
      field: 'documentStatus',
      label: '결재상태',
      type: 'select',
      searchSpan: 2,
      group: 'approval',
      options: [{ value: 'PENDING', label: '결재대기' }],
    },
    {
      field: 'documentType',
      label: '문서종류',
      type: 'select',
      searchSpan: 2,
      group: 'approval',
      options: [{ value: 'DRAFTING', label: '기안서' }],
    },
    {
      field: 'title',
      label: '제목',
      type: 'text',
      searchSpan: 4,
      group: 'title',
    },
    {
      field: 'drafter',
      label: '기안자',
      type: 'text',
      searchSpan: 1,
      group: 'participants',
    },
    {
      field: 'department',
      label: '기안부서',
      type: 'text',
      searchSpan: 1,
      group: 'participants',
    },
    {
      field: 'participant',
      label: '결재 참여자',
      type: 'text',
      searchSpan: 1,
      group: 'participants',
    },
    {
      field: 'standalone',
      label: '단독 필드',
      type: 'text',
      searchSpan: 3,
    },
  ];

  it('상세 오버레이에서 타입별 필드를 입력하고 검색할 수 있다', () => {
    const onDetailSearch = vi.fn();
    const onDetailValuesChange = vi.fn();

    render(
      <PageSearchArea
        detailFields={fields}
        detailValues={{}}
        onDetailValuesChange={onDetailValuesChange}
        onDetailSearch={onDetailSearch}
      >
        <button type="button">기본 검색</button>
      </PageSearchArea>,
    );

    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));

    expect(screen.getByRole('textbox', { name: '이름' })).toBeVisible();
    expect(screen.queryByText('생성일', { exact: true })).not.toBeInTheDocument();
    expect(screen.getByLabelText('생성일 시작일')).toBeVisible();
    expect(screen.getByLabelText('생성일 종료일')).toBeVisible();
    expect(screen.getByRole('combobox', { name: '상태' })).toBeVisible();

    fireEvent.change(screen.getByRole('textbox', { name: '이름' }), {
      target: { value: '공통' },
    });
    fireEvent.change(screen.getByLabelText('생성일 시작일'), {
      target: { value: '2026-01-01' },
    });
    fireEvent.change(screen.getByLabelText('생성일 종료일'), {
      target: { value: '2026-12-31' },
    });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));

    expect(onDetailValuesChange).toHaveBeenCalled();
    expect(onDetailSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '공통',
        createdAt: { from: '2026-01-01', to: '2026-12-31' },
      }),
    );
    expect(
      screen.queryByRole('button', { name: '검색 닫기' }),
    ).not.toBeInTheDocument();
  });

  it('group은 행을 나누고 span은 그룹 안의 필드 너비를 유지한다', () => {
    const { container } = render(
      <PageSearchArea detailFields={groupedFields}>
        <button type="button">기본 검색</button>
      </PageSearchArea>,
    );

    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));

    const groupRows = Array.from(
      container.querySelectorAll<HTMLElement>('[data-search-group]'),
    );
    expect(groupRows.map((group) => group.dataset.searchGroup)).toEqual([
      'date',
      'approval',
      'title',
      'participants',
    ]);
    expect(
      groupRows[1].querySelector('[data-search-field="documentStatus"]'),
    ).toHaveAttribute('data-search-span', '2');
    expect(
      groupRows[1].querySelector('[data-search-field="documentType"]'),
    ).toHaveAttribute('data-search-span', '2');
    expect(
      groupRows[2].querySelector('[data-search-field="title"]'),
    ).toHaveAttribute('data-search-span', '4');
    expect(within(groupRows[3]).getAllByRole('textbox')).toHaveLength(3);
    const standaloneField = container.querySelector(
      '[data-search-field="standalone"]',
    );
    expect(standaloneField).toHaveAttribute('data-search-span', '3');
    expect(standaloneField?.closest('[data-search-group]')).toBeNull();
  });

  it('상세 검색 필드와 하단 액션 사이에 가로 구분선을 표시한다', () => {
    render(
      <PageSearchArea detailFields={fields}>
        <button type="button">기본 검색</button>
      </PageSearchArea>,
    );

    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));

    expect(
      screen.getByRole('separator', { orientation: 'horizontal' }),
    ).toBeVisible();
  });

  it('검색 닫기는 조회하지 않고 오버레이만 닫는다', () => {
    const onDetailSearch = vi.fn();

    render(
      <PageSearchArea
        detailFields={fields}
        detailValues={{}}
        onDetailValuesChange={vi.fn()}
        onDetailSearch={onDetailSearch}
      >
        <button type="button">기본 검색</button>
      </PageSearchArea>,
    );

    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    fireEvent.click(screen.getByRole('button', { name: '검색 닫기' }));

    expect(onDetailSearch).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('button', { name: '검색 닫기' }),
    ).not.toBeInTheDocument();
  });

  it('초기화는 입력값을 비우고 상세 검색창을 유지한다', () => {
    const onDetailValuesChange = vi.fn();

    render(
      <PageSearchArea
        detailFields={fields}
        detailValues={{}}
        onDetailValuesChange={onDetailValuesChange}
      >
        <button type="button">기본 검색</button>
      </PageSearchArea>,
    );

    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    fireEvent.change(screen.getByRole('textbox', { name: '이름' }), {
      target: { value: '공통' },
    });
    fireEvent.click(screen.getByRole('button', { name: '초기화' }));

    expect(screen.getByRole('textbox', { name: '이름' })).toHaveValue('');
    expect(screen.getByRole('dialog', { name: '상세 검색' })).toBeVisible();
    expect(onDetailValuesChange).toHaveBeenLastCalledWith({});
  });

  it('resolved 기본값을 초기화에 적용하고 선택적 초기화 callback을 호출한다', () => {
    const onDetailValuesChange = vi.fn();
    const onDetailReset = vi.fn();
    const onDetailSearch = vi.fn();
    const defaultValues = {
      createdAt: { from: '2026-09-20', to: '2026-10-20' },
    };

    render(
      <PageSearchArea
        detailFields={fields}
        detailValues={{}}
        defaultValues={defaultValues}
        onDetailValuesChange={onDetailValuesChange}
        onDetailReset={onDetailReset}
        onDetailSearch={onDetailSearch}
      >
        <button type="button">기본 검색</button>
      </PageSearchArea>,
    );

    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
    expect(screen.getByLabelText('생성일 시작일')).toHaveValue('2026-09-20');
    expect(screen.getByLabelText('생성일 종료일')).toHaveValue('2026-10-20');

    fireEvent.change(screen.getByRole('textbox', { name: '이름' }), {
      target: { value: '변경 조건' },
    });
    fireEvent.click(screen.getByRole('button', { name: '초기화' }));

    expect(screen.getByRole('textbox', { name: '이름' })).toHaveValue('');
    expect(screen.getByLabelText('생성일 시작일')).toHaveValue('2026-09-20');
    expect(screen.getByLabelText('생성일 종료일')).toHaveValue('2026-10-20');
    expect(onDetailValuesChange).toHaveBeenLastCalledWith(defaultValues);
    expect(onDetailReset).toHaveBeenCalledWith(defaultValues);
    expect(onDetailSearch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '조회' }));

    expect(onDetailSearch).toHaveBeenCalledWith(defaultValues);
  });
});
