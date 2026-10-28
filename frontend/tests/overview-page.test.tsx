import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { createAppTheme } from '../src/theme/theme';
import { OverviewPage } from '../src/pages/groupware/OverviewPage';
import { apiGet } from '../src/shared/services/apiClient';

vi.mock('../src/shared/services/apiClient', () => ({ apiGet: vi.fn() }));
vi.mock('../src/pages/groupware/documents/status/components/DocumentStatusDetail', () => ({
  DocumentStatusDetail: () => null,
}));

const overview = {
  asOfDate: '2026-10-28', fetchedAt: '2026-10-28T09:30:00+09:00',
  canReadApprovals: true, canReadNotices: true, canReadSales: true,
  approvalPath: '/groupware/doc/write', approvalStatus: 'ready', noticeStatus: 'ready',
  approval: { actionRequiredCount: 3, draftCount: 2, revisionRequestedCount: 1, notices: [] },
  notices: [{ postId: 8, title: '검증용 운영 공지', isPinned: 'Y', createdAt: '2026-10-28T08:00:00' }],
};
const sales = {
  month: '2026-10', from: '2026-10-01', to: '2026-10-31',
  asOfDate: '2026-10-28', fetchedAt: '2026-10-28T09:30:00+09:00',
  orderCount: 4, supplyAmount: 1250000, totalAmount: 1375000, upcomingCount: 0,
  trend: ['05', '06', '07', '08', '09', '10'].map((month) => ({
    month: `2026-${month}`, orderCount: 0, supplyAmount: 0,
  })), upcoming: [],
};
const get = vi.mocked(apiGet);

function Location() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}</output>;
}
function mount(mode: 'light' | 'dark' = 'light') {
  return render(
    <ThemeProvider theme={createAppTheme(mode)}>
      <MemoryRouter>
        <OverviewPage
          selectedModule={{ id: 'groupware', name: '그룹웨어', icon: null, tree: [], menus: [] }}
          currentMenuName="종합현황"
          content={{ title: '종합현황', description: '업무 현황', cards: [{ label: '샘플', value: '999' }], items: [] }}
        />
        <Location />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('real-data overview', () => {
  beforeEach(() => {
    get.mockReset();
    get.mockImplementation(async (path) => ({ item: path.includes('/sales') ? sales : overview }));
  });

  it('reserves the personal cards and separate task/notice panels before overview arrives', () => {
    get.mockImplementation(() => new Promise(() => {}));
    mount();
    const loading = screen.getByRole('status', { name: '종합현황 불러오는 중' });
    expect(within(loading).getAllByTestId('metric-skeleton')).toHaveLength(3);
    expect(within(loading).getByTestId('work-skeleton')).toBeInTheDocument();
    expect(within(loading).getByTestId('notice-skeleton')).toBeInTheDocument();
    expect(within(loading).queryByRole('button')).not.toBeInTheDocument();
    within(loading).getAllByRole('button', { hidden: true }).forEach((card) => {
      expect(card).toBeDisabled();
      expect(card).toHaveAttribute('tabindex', '-1');
    });
    expect(screen.queryByRole('region', { name: '영업 현황' })).not.toBeInTheDocument();
  });

  it('uses a sales-specific chart and due-list skeleton without replacing loaded personal widgets', async () => {
    get.mockImplementation((path) => path.endsWith('/overview')
      ? Promise.resolve({ item: overview }) : new Promise(() => {}));
    mount();
    await screen.findByText('검증용 운영 공지');
    const loading = screen.getByRole('status', { name: '수주 현황 불러오는 중' });
    expect(within(loading).getAllByTestId('metric-skeleton')).toHaveLength(3);
    expect(within(loading).getByTestId('trend-skeleton')).toBeInTheDocument();
    expect(within(loading).getByTestId('due-skeleton')).toBeInTheDocument();
    expect(within(loading).queryByTestId('work-skeleton')).not.toBeInTheDocument();
    expect(within(loading).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByLabelText('수주 조회 월')).toBeEnabled();
    expect(screen.getByRole('button', { name: '내가 처리할 결재 3건' })).toBeInTheDocument();
  });

  it.each(['light', 'dark'] as const)('renders actual widgets without samples in %s theme', async (mode) => {
    mount(mode);
    expect(await screen.findByText('검증용 운영 공지')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /선택 월 수주.*4/ })).toBeInTheDocument();
    expect(screen.queryByText('999')).not.toBeInTheDocument();
    expect(screen.getByText('처리할 업무가 없습니다.')).toBeInTheDocument();
    expect(screen.getByText('예정된 납기가 없습니다.')).toBeInTheDocument();
    expect(screen.getByText(/출하 미반영/)).toBeInTheDocument();
  });

  it('does not request or show sales for a user without sales read permission', async () => {
    get.mockResolvedValue({ item: { ...overview, canReadSales: false } });
    mount();
    await screen.findByText('검증용 운영 공지');
    expect(get.mock.calls.some(([path]) => path.includes('/sales'))).toBe(false);
    expect(screen.queryByRole('region', { name: '영업 현황' })).not.toBeInTheDocument();
  });

  it('keeps notices when approvals fail and allows retry', async () => {
    get.mockImplementation(async (path) => ({
      item: path.includes('/sales') ? sales : { ...overview, approvalStatus: 'error', approval: null },
    }));
    mount();
    expect(await screen.findByText('검증용 운영 공지')).toBeInTheDocument();
    expect(screen.getByText('결재 업무를 불러오지 못했습니다.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '결재 업무 다시 조회' }));
    await waitFor(() => expect(get.mock.calls.filter(([path]) => path.endsWith('/overview')).length).toBe(2));
  });

  it('changes month and drills down using that exact month', async () => {
    get.mockImplementation(async (path) => ({
      item: path.includes('/sales')
        ? { ...sales, month: path.includes('2026-09') ? '2026-09' : '2026-10' }
        : overview,
    }));
    mount();
    await screen.findByRole('button', { name: /선택 월 수주.*4/ });
    fireEvent.change(screen.getByLabelText('수주 조회 월'), { target: { value: '2026-09' } });
    await waitFor(() => expect(get).toHaveBeenCalledWith(
      '/api/v1/dashboard/sales?month=2026-09', expect.any(AbortSignal),
    ));
    fireEvent.click(await screen.findByRole('button', { name: /선택 월 수주.*4/ }));
    expect(screen.getByTestId('location')).toHaveTextContent('/sales/order/status?dashboardMonth=2026-09');
  });

  it('shows a real error instead of sales zeroes and recovers on retry', async () => {
    let failed = true;
    get.mockImplementation(async (path) => {
      if (path.includes('/sales') && failed) throw new Error('unavailable');
      return { item: path.includes('/sales') ? sales : overview };
    });
    mount();
    await screen.findByText('수주 현황을 불러오지 못했습니다.');
    expect(screen.queryByRole('button', { name: /선택 월 수주/ })).not.toBeInTheDocument();
    failed = false;
    fireEvent.click(screen.getByRole('button', { name: '수주 현황 다시 조회' }));
    expect(await screen.findByRole('button', { name: /선택 월 수주.*4/ })).toBeInTheDocument();
  });

  it('ignores a late response from the previously selected month', async () => {
    let finishOctober: ((value: { item: typeof sales }) => void) | undefined;
    get.mockImplementation((path) => {
      if (path.endsWith('/overview')) return Promise.resolve({ item: overview });
      if (path.includes('2026-10')) return new Promise((resolve) => { finishOctober = resolve; });
      return Promise.resolve({ item: { ...sales, month: '2026-09', orderCount: 6 } });
    });
    mount();
    await screen.findByLabelText('수주 조회 월');
    await waitFor(() => expect(finishOctober).toBeDefined());
    fireEvent.change(screen.getByLabelText('수주 조회 월'), { target: { value: '2026-09' } });
    await screen.findByRole('button', { name: /선택 월 수주.*6/ });
    await act(async () => { finishOctober?.({ item: { ...sales, orderCount: 99 } }); });
    expect(screen.getByRole('button', { name: /선택 월 수주.*6/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /선택 월 수주.*99/ })).not.toBeInTheDocument();
  });

  it('does not navigate to trend months outside the supported search range', async () => {
    get.mockImplementation(async (path) => ({
      item: path.endsWith('/overview') ? overview : path.includes('1900-01') ? {
        ...sales, month: '1900-01', from: '1900-01-01', to: '1900-01-31',
        trend: ['1899-08', '1899-09', '1899-10', '1899-11', '1899-12', '1900-01']
          .map((month) => ({ month, orderCount: 0, supplyAmount: 0 })),
      } : sales,
    }));
    mount();
    await screen.findByRole('button', { name: /선택 월 수주.*4/ });
    fireEvent.change(screen.getByLabelText('수주 조회 월'), { target: { value: '1900-01' } });
    const bar = await screen.findByRole('button', { name: /1899-08 수주 공급가액/ });
    expect(bar).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(bar);
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
  });
});
