import { afterEach, expect, it, vi } from 'vitest';
import { createSalesOrder, getSalesOrder, toSalesOrderForm, updateSalesOrder } from '../src/pages/sales/order/create/services/salesOrder.service';
import { searchSalesOrderStatus } from '../src/pages/sales/order/status/services/salesOrderStatus.service';
import { createSalesOrderStatusColumns } from '../src/pages/sales/order/status/data/salesOrderStatusColumns';

vi.mock('../src/shared/services/authService', () => ({
  getStoredAuth: () => ({}),
  isAccessTokenExpiringSoon: () => false,
  isTokenExpired: () => false,
  logout: vi.fn(),
  refreshAccessToken: vi.fn(),
  resolveApiBaseUrl: () => '',
}));

afterEach(() => vi.unstubAllGlobals());

it('preserves order response decimal tokens through the edit form', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
    '{"resultCode":"200","result":{"item":{"salesOrderId":300,"customerId":10,"details":[{"salesOrderDetailId":1,"materialId":2,"orderQty":1,"unitPrice":1234567890123.100001,"supplyAmt":1234567890123.100001,"vatAmt":123456789012.310000,"totalAmt":1358024679135.410001,"shippedQty":0}]}}}',
  )));
  const item = await getSalesOrder(300);
  expect(item.salesOrderId).toBe(300);
  expect(toSalesOrderForm(item).rows[0]).toMatchObject({
    orderQty: '1', unitPrice: '1234567890123.100001',
    supplyAmount: '1234567890123.100001', vatAmount: '123456789012.310000',
    totalAmount: '1358024679135.410001', shippedQty: '0',
  });
});

it('preserves exact decimal strings when an updated order is returned', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(
    '{"resultCode":"200","result":{"item":{"salesOrderId":300,"details":[{"unitPrice":1234567890123.100001}]}}}',
  ));
  vi.stubGlobal('fetch', fetch);
  const item = await updateSalesOrder(300, {
    orderDt: '2026-11-24', customerId: 1, salesDestinationId: 2, billingCustomerId: 3,
    quotNo: null, deliveryDt: null, deliveryPlace: null, deliveryMethod: null, remark: null,
    details: [{ materialId: 4, orderQty: '1', unitPrice: '1234567890123.100001',
      vatAmt: '123456789012.310000', deliveryDt: null }],
  });
  expect(item.details[0].unitPrice).toBe('1234567890123.100001');
  const request = fetch.mock.calls[0][1] as RequestInit;
  expect(String(request.body)).toContain('"unitPrice":"1234567890123.100001"');
});

it('preserves the exact total returned after creating an order', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
    '{"resultCode":"200","result":{"item":{"salesOrderId":300,"totalAmt":1358024679135.410001}}}',
  )));
  const item = await createSalesOrder({
    orderDt: '2026-11-24', customerId: 1, salesDestinationId: 2, billingCustomerId: 3,
    quotNo: null, deliveryDt: null, deliveryPlace: null, deliveryMethod: null, remark: null,
    details: [],
  });

  expect(item.totalAmt).toBe('1358024679135.410001');
});

it('preserves exact amounts in the order status list', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
    '{"resultCode":"200","result":{"resultList":[{"salesOrderId":3,"orderQty":1,"unitPrice":1234567890123.100001}]}}',
  )));
  const rows = await searchSalesOrderStatus({});
  expect(rows[0]).toMatchObject({ salesOrderId: 3, orderQty: '1', unitPrice: '1234567890123.100001' });
  expect(createSalesOrderStatusColumns().find((column) => column.field === 'unitPrice')?.exactDecimal).toBe(true);
});
