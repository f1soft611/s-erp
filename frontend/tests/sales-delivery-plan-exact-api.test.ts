import { afterEach, expect, it, vi } from 'vitest';
import { getDeliveryPlan, planRowsFromDetails, searchPlanSourceOrders } from '../src/pages/sales/shipment/deliveryplan/services/salesDeliveryPlan.service';

vi.mock('../src/shared/services/authService', () => ({
  getStoredAuth: () => ({}), isAccessTokenExpiringSoon: () => false, isTokenExpired: () => false,
  logout: vi.fn(), refreshAccessToken: vi.fn(), resolveApiBaseUrl: () => '',
}));
afterEach(() => vi.unstubAllGlobals());

it('preserves planned quantities through a retrieved plan and editing rows', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
    '{"resultCode":"200","result":{"item":{"salesDeliveryPlanId":1,"details":[{"salesDeliveryPlanDetailId":2,"salesOrderId":3,"salesOrderDetailId":4,"plannedQty":1234567890123.100001,"orderQty":1234567890123.100001,"deliveredQty":0}]}}}',
  )));
  const plan = await getDeliveryPlan(1);
  expect(planRowsFromDetails(plan.details)[0]).toMatchObject({
    plannedQty: '1234567890123.100001', orderQty: '1234567890123.100001', deliveredQty: '0',
  });
});

it('preserves plan source order quantities', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
    '{"resultCode":"200","result":{"items":[{"salesOrderId":3,"orderQty":1234567890123.100001,"remainingPlanQty":1234567890123.100001}]}}',
  )));
  const rows = await searchPlanSourceOrders('');
  expect(rows[0]).toMatchObject({ salesOrderId: 3, orderQty: '1234567890123.100001', remainingPlanQty: '1234567890123.100001' });
});
