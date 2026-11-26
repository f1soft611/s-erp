import { afterEach, expect, it, vi } from 'vitest';
import { deliveryForm, getDelivery, getDeliveryStatus, searchSourceOrders } from '../src/pages/sales/shipment/delivery/create/services/salesDelivery.service';
import { statementDetailColumns } from '../src/pages/sales/shipment/statement/create/data/statementDetailColumns';

vi.mock('../src/shared/services/authService', () => ({
  getStoredAuth: () => ({}), isAccessTokenExpiringSoon: () => false, isTokenExpired: () => false,
  logout: vi.fn(), refreshAccessToken: vi.fn(), resolveApiBaseUrl: () => '',
}));
afterEach(() => vi.unstubAllGlobals());

it('preserves source order numeric tokens for delivery selection', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
    '{"resultCode":"200","result":{"items":[{"salesOrderId":1,"remainingQty":1,"plannedQty":1234567890123.100001,"unitPrice":1234567890123.100001}]}}',
  )));
  const rows = await searchSourceOrders({ keyword: '', orderDtFrom: '', orderDtTo: '', orderNo: '',
    customerKeyword: '', materialKeyword: '', planNo: '', planDtFrom: '', planDtTo: '' });
  expect(rows[0]).toMatchObject({ salesOrderId: 1, remainingQty: '1', plannedQty: '1234567890123.100001', unitPrice: '1234567890123.100001' });
});

it('preserves the saved delivery decimal tokens through the edit form', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
    '{"resultCode":"200","result":{"item":{"salesDeliveryId":3,"details":[{"salesDeliveryDetailId":1,"deliveryQty":1,"unitPrice":1234567890123.100001,"supplyAmt":1234567890123.100001,"vatAmt":123456789012.310000,"totalAmt":1358024679135.410001}]}}}',
  )));
  const item = await getDelivery(3);
  expect(deliveryForm(item).details[0]).toMatchObject({ deliveryQty: '1', unitPrice: '1234567890123.100001',
    supplyAmt: '1234567890123.100001', vatAmt: '123456789012.310000', totalAmt: '1358024679135.410001' });
});

it('preserves exact decimal amounts in the delivery status response', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
    '{"resultCode":"200","result":{"items":[{"salesDeliveryId":3,"deliveryQty":1,"unitPrice":1234567890123.100001}]}}',
  )));
  const rows = await getDeliveryStatus({ deliveryDtFrom: '2026-11-01', deliveryDtTo: '2026-11-30',
    keyword: '', deliveryType: '', customerKeyword: '', materialKeyword: '', deliveryNo: '' });
  expect(rows[0]).toMatchObject({ salesDeliveryId: 3, deliveryQty: '1', unitPrice: '1234567890123.100001' });
});

it('uses exact decimal rendering for delivery values in the statement creation grid', () => {
  expect(statementDetailColumns.find((column) => column.field === 'unitPrice')?.exactDecimal).toBe(true);
});
