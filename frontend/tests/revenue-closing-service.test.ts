import { beforeEach, expect, it, vi } from 'vitest';
import { apiGet, apiPost } from '../src/shared/services/apiClient';
import {
  closeRevenueClosings,
  searchRevenueClosings,
} from '../src/pages/sales/revenue/closing/services/revenueClosing.service';

vi.mock('../src/shared/services/apiClient', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

it('sends date, keyword, and repeated customer IDs to the read endpoint', async () => {
  vi.mocked(apiGet).mockResolvedValue({ details: [], customerSummaries: [] });

  await expect(searchRevenueClosings({
    deliveryDtFrom: '2026-11-01',
    deliveryDtTo: '2026-11-30',
    keyword: ' gear ',
    customerIds: [12, 34],
  })).resolves.toEqual({ details: [], customerSummaries: [] });

  expect(apiGet).toHaveBeenCalledWith(
    '/api/v1/sales/revenue-closings/search?deliveryDtFrom=2026-11-01&deliveryDtTo=2026-11-30&keyword=gear&customerIds=12&customerIds=34',
  );
});

it('rejects malformed detail or summary response data', async () => {
  vi.mocked(apiGet).mockResolvedValue({ details: [], customerSummaries: null });

  await expect(searchRevenueClosings({
    deliveryDtFrom: '2026-11-01',
    deliveryDtTo: '2026-11-30',
    keyword: '',
    customerIds: [],
  })).rejects.toThrow('매출마감 조회 응답을 확인해 주세요.');
});

it('keeps distinct line IDs from the same delivery and posts the server date to the close endpoint', async () => {
  vi.mocked(apiPost).mockResolvedValue({
    closedCount: 2,
    items: [{ salesStatementId: 501, statementNo: 'TS-20261120-0001' }],
  });

  await expect(closeRevenueClosings([200, 201], '2026-11-20')).resolves.toEqual({
    closedCount: 2,
    items: [{ salesStatementId: 501, statementNo: 'TS-20261120-0001' }],
  });

  expect(apiPost).toHaveBeenCalledWith('/api/v1/sales/revenue-closings/close', {
    salesDeliveryDetailIds: [200, 201],
    statementDt: '2026-11-20',
  });
});

it('accepts a successful close that reuses already-issued statements without creating duplicates', async () => {
  vi.mocked(apiPost).mockResolvedValue({ closedCount: 2, items: [] });

  await expect(closeRevenueClosings([200, 201], '2026-11-20'))
    .resolves.toEqual({ closedCount: 2, items: [] });
});

it('rejects close responses that did not close every selected detail', async () => {
  vi.mocked(apiPost).mockResolvedValue({ closedCount: 1, items: [] });

  await expect(closeRevenueClosings([200, 201], '2026-11-20'))
    .rejects.toThrow('매출마감 처리 응답을 확인해 주세요.');
});
