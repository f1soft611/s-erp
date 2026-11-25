import { afterEach, expect, it, vi } from 'vitest';
import { searchRevenueClosings } from '../src/pages/sales/revenue/closing/services/revenueClosing.service';

vi.mock('../src/shared/services/authService', () => ({
  getStoredAuth: () => ({}), isAccessTokenExpiringSoon: () => false, isTokenExpired: () => false,
  logout: vi.fn(), refreshAccessToken: vi.fn(), resolveApiBaseUrl: () => '',
}));
afterEach(() => vi.unstubAllGlobals());

it('preserves revenue closing detail decimal values while retaining numeric identifiers', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
    '{"resultCode":"200","result":{"details":[{"rowId":2,"salesDeliveryId":3,"customerId":1,"deliveryNo":"D","deliveryDt":"2026-11-24","orderNo":null,"customerCode":"C","customerName":"고객","materialCode":"M","materialName":"품목","closingStatus":"OPEN","quantity":1,"salesAmount":1234567890123.100001,"vatAmount":0,"totalAmount":1234567890123.100001}],"customerSummaries":[]}}',
  )));
  const result = await searchRevenueClosings({ deliveryDtFrom: '2026-11-01', deliveryDtTo: '2026-11-30', keyword: '', customerIds: [] });
  expect(result.details[0]).toMatchObject({ rowId: 2, quantity: '1', salesAmount: '1234567890123.100001' });
});
