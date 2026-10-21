import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PageSearchArea } from '../src/shared/components/PageSearchArea';
import type { PageSearchField } from '../src/shared/components/page-search/searchFields';

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
