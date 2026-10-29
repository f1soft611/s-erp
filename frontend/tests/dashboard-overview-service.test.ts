import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet } from '../src/shared/services/apiClient';
import { fetchDashboardOverview, fetchDashboardSales } from '../src/pages/dashboard/overview/services/overview.service';

vi.mock('../src/shared/services/apiClient', () => ({ apiGet: vi.fn() }));
const get = vi.mocked(apiGet);

export const overviewFixture = {
  asOfDate: '2026-10-28', fetchedAt: '2026-10-28T09:30:00+09:00',
  canReadApprovals: true, canReadNotices: true, canReadSales: true,
  approvalPath: '/groupware/doc/write', approvalStatus: 'ready', noticeStatus: 'ready',
  approval: {
    actionRequiredCount: 3, draftCount: 2, revisionRequestedCount: 1,
    referenceConfirmationRequiredCount: 1,
    referenceConfirmationItems: [{ electronicApprovalId: 12, title: '검증용 참조 문서' }],
    notices: [{ electronicApprovalId: 7, title: '검증용 결재 문서', noticeType: 'ACTION_REQUIRED' }],
  },
  notices: [{ postId: 8, title: '검증용 운영 공지', isPinned: 'Y', createdAt: '2026-10-28T08:00:00' }],
};

export const salesFixture = {
  month: '2026-10', from: '2026-10-01', to: '2026-10-31',
  asOfDate: '2026-10-28', fetchedAt: '2026-10-28T09:30:00+09:00',
  orderCount: 4, supplyAmount: 1250000, totalAmount: 1375000, upcomingCount: 1,
  trend: ['05', '06', '07', '08', '09', '10'].map((month) => ({
    month: `2026-${month}`, orderCount: 4, supplyAmount: 1250000,
  })),
  upcoming: [{ salesOrderId: 9, orderNo: 'SO-FIXTURE-9', customerName: '검증용 거래처', deliveryDt: '2026-10-30' }],
};

describe('dashboard API contract', () => {
  beforeEach(() => get.mockReset());

  it('passes selected month and cancellation signal without tenant parameters', async () => {
    get.mockResolvedValue({ item: salesFixture });
    const signal = new AbortController().signal;
    expect(await fetchDashboardSales('2026-10', signal)).toEqual(salesFixture);
    expect(get).toHaveBeenCalledWith('/api/v1/dashboard/sales?month=2026-10', signal);
  });

  it('rejects missing or malformed summaries instead of inventing zeroes', async () => {
    get.mockResolvedValue({ item: { ...overviewFixture, approval: null } });
    await expect(fetchDashboardOverview()).rejects.toThrow('종합현황 응답');
    get.mockResolvedValue({ item: { ...salesFixture, supplyAmount: null } });
    await expect(fetchDashboardSales('2026-10')).rejects.toThrow('수주 집계 응답');
  });

  it.each([
    ['missing count', { referenceConfirmationRequiredCount: undefined }],
    ['negative count', { referenceConfirmationRequiredCount: -1 }],
    ['unsafe count', { referenceConfirmationRequiredCount: Number.MAX_SAFE_INTEGER + 1 }],
    ['malformed count', { referenceConfirmationRequiredCount: '1' }],
    ['missing items', { referenceConfirmationItems: undefined }],
    ['malformed items', { referenceConfirmationItems: null }],
    ['malformed item', { referenceConfirmationItems: [{ electronicApprovalId: '12', title: '문서' }] }],
    ['invalid title', { referenceConfirmationItems: [{ electronicApprovalId: 12, title: null }] }],
  ])('rejects %s reference confirmation summary data', async (_label, patch) => {
    get.mockResolvedValue({
      item: { ...overviewFixture, approval: { ...overviewFixture.approval, ...patch } },
    });
    await expect(fetchDashboardOverview()).rejects.toThrow('종합현황 응답');
  });

  it('accepts explicit partial failure and permission-hidden sections', async () => {
    const item = { ...overviewFixture, canReadSales: false, approvalStatus: 'error', approval: null };
    get.mockResolvedValue({ item });
    expect(await fetchDashboardOverview()).toEqual(item);
  });

  it('accepts the preceding-year trend for the earliest selectable month', async () => {
    const item = {
      ...salesFixture, month: '1900-01', from: '1900-01-01', to: '1900-01-31',
      trend: ['1899-08', '1899-09', '1899-10', '1899-11', '1899-12', '1900-01']
        .map((month) => ({ month, orderCount: 0, supplyAmount: 0 })),
    };
    get.mockResolvedValue({ item });
    expect(await fetchDashboardSales('1900-01')).toEqual(item);
  });
});
