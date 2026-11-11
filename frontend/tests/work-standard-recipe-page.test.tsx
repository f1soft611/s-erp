import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { WorkStandardRecipePage } from '../src/pages/co/work-standard/recipe/WorkStandardRecipePage';
import { SAMPLE_WORK_STANDARDS } from '../src/pages/co/work-standard/recipe/data/workStandard.data';
import {
  calculateFormulaTotals,
  calculatePerPlateGram,
  calculateRatio,
} from '../src/pages/co/work-standard/recipe/data/workStandardFormula';
import {
  filterBySegment,
  filterWorkStandards,
  toWorkStandardListRow,
} from '../src/pages/co/work-standard/recipe/services/workStandard.service';
import type { MenuPermission } from '../src/pages/dashboard/types/dashboard';

vi.mock('../src/pages/co/master/materials/services/materialManagement.service', () => ({
  fetchMaterials: vi.fn(async () => []),
}));

describe('work standard recipe filtering and formula calculation', () => {
  it('filters by keyword (including formula material names), detail filters and list segment', () => {
    expect(filterWorkStandards(SAMPLE_WORK_STANDARDS, { keyword: '100246' }).map((item) => item.workStandardId)).toEqual([2]);
    expect(filterWorkStandards(SAMPLE_WORK_STANDARDS, { keyword: '바닐라' })).toHaveLength(3);
    expect(
      filterWorkStandards(SAMPLE_WORK_STANDARDS, { keyword: '', versionStatus: '샘플', processName: '혼합믹서' })
        .map((item) => item.workStandardId),
    ).toEqual([7, 8]);

    const rows = SAMPLE_WORK_STANDARDS.map(toWorkStandardListRow);
    expect(filterBySegment(rows, '샘플').map((row) => row.workStandardId)).toEqual([7, 8, 9]);
    expect(filterBySegment(rows, '전체')).toHaveLength(9);
  });

  it('calculates ratio and per-plate grams from the batch input quantity', () => {
    const [dark] = SAMPLE_WORK_STANDARDS;
    const totals = calculateFormulaTotals(dark.formula, dark.baseQty);
    expect(totals).toEqual({ inputQty: 35.46, ratio: 100, perPlateG: 886.5 });
    expect(calculateRatio(18, totals.inputQty)).toBe(50.76);
    expect(calculatePerPlateGram(18, 40)).toBe(450);
    expect(calculatePerPlateGram(18, 0)).toBe(0);
  });
});

const PAGE_TEST_TIMEOUT = 30000;

describe('work standard recipe page', () => {
  it('loads the list, selects the first work standard and updates details on row selection', async () => {
    renderPage();

    const basicInfo = await screen.findByRole('region', { name: '작업표준서 기본정보' });
    await waitFor(() => expect(within(basicInfo).getByLabelText('품목코드')).toHaveValue('100245'));
    expect(screen.getByText('기준정보 > 작업표준서 관리 > 작업표준서 등록(레시피)')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '배합비 6' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '삭제' })).toBeDisabled();
    expect(within(basicInfo).getByRole('button', { name: '버전 개정' })).toBeDisabled();

    const totals = screen.getByLabelText('배합비 합계');
    expect(totals).toHaveTextContent('35.460');
    expect(totals).toHaveTextContent('100.00');
    expect(totals).toHaveTextContent('886.5');

    const list = screen.getByRole('grid', { name: '작업표준서 목록' });
    fireEvent.click(within(list).getByText('(반)카카올라 밀크 생초콜릿 [판]'));
    await waitFor(() => expect(within(basicInfo).getByLabelText('품목코드')).toHaveValue('100246'));
    expect(screen.getByRole('tab', { name: '배합비 4' })).toBeInTheDocument();
  }, PAGE_TEST_TIMEOUT);

  it('applies the unified keyword search and the sample segment chip', async () => {
    renderPage();
    const basicInfo = await screen.findByRole('region', { name: '작업표준서 기본정보' });
    await waitFor(() => expect(within(basicInfo).getByLabelText('품목코드')).toHaveValue('100245'));

    fireEvent.change(screen.getByLabelText('작업표준서 빠른 검색'), { target: { value: '제로슈가' } });
    fireEvent.keyDown(screen.getByLabelText('작업표준서 빠른 검색'), { key: 'Enter' });
    await waitFor(() => expect(within(basicInfo).getByLabelText('품목코드')).toHaveValue('100261'));
    expect(screen.getByText(/1건/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('작업표준서 빠른 검색'), { target: { value: '' } });
    fireEvent.keyDown(screen.getByLabelText('작업표준서 빠른 검색'), { key: 'Enter' });
    await waitFor(() => expect(within(basicInfo).getByLabelText('품목코드')).toHaveValue('100245'));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '샘플' }));
    });
    const list = screen.getByRole('grid', { name: '작업표준서 목록' });
    expect(within(list).queryByText('(반)카카올라 밀크 생초콜릿 [판]')).not.toBeInTheDocument();
    expect(within(list).getByText('(반)카카올라 인절미 생초콜릿 [판]')).toBeInTheDocument();
  }, PAGE_TEST_TIMEOUT);

  it('resets the form and formula when 신규 is clicked', async () => {
    renderPage();
    const basicInfo = await screen.findByRole('region', { name: '작업표준서 기본정보' });
    await waitFor(() => expect(within(basicInfo).getByLabelText('품목코드')).toHaveValue('100245'));

    fireEvent.click(screen.getByRole('button', { name: '신규' }));
    expect(within(basicInfo).getByLabelText('품목코드')).toHaveValue('품목 선택 시 자동 입력');
    expect(screen.getByRole('tab', { name: '배합비 0' })).toBeInTheDocument();
    expect(screen.getByText('신규 작업표준서 · 저장은 백엔드 연결 후 제공')).toBeInTheDocument();
  }, PAGE_TEST_TIMEOUT);
});

const permissions: MenuPermission = {
  read: true,
  create: true,
  update: true,
  delete: true,
  excel: false,
} as MenuPermission;

function renderPage() {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: (
          <WorkStandardRecipePage
            selectedModule={{ id: 'co', name: '기준정보' } as never}
            currentMenuName="작업표준서 등록(레시피)"
            content={{ title: '작업표준서 등록(레시피)', description: '설명', cards: [], items: [] } as never}
            breadcrumbItems={['기준정보', '작업표준서 관리', '작업표준서 등록(레시피)']}
            selectedMenuPermissions={permissions}
          />
        ),
      },
    ],
    { initialEntries: ['/'] },
  );
  return render(<RouterProvider router={router} />);
}
