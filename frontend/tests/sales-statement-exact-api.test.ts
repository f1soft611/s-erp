import { afterEach, expect, it, vi } from 'vitest';
import { getStatement, getStatementStatus, searchStatementSources } from '../src/pages/sales/shipment/statement/services/salesStatement.service';
import { createStatementSourceColumns } from '../src/pages/sales/shipment/statement/create/data/statementSourceColumns';

vi.mock('../src/shared/services/authService', () => ({
  getStoredAuth: () => ({}), isAccessTokenExpiringSoon: () => false, isTokenExpired: () => false,
  logout: vi.fn(), refreshAccessToken: vi.fn(), resolveApiBaseUrl: () => '',
}));
afterEach(() => vi.unstubAllGlobals());

it('preserves statement detail and header decimal tokens', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
    '{"resultCode":"200","result":{"item":{"salesStatementId":1,"totalAmt":1234567890123.100001,"details":[{"unitPrice":1234567890123.100001}]}}}',
  )));
  const item = await getStatement(1);
  expect(item.totalAmt).toBe('1234567890123.100001');
  expect(item.details[0].unitPrice).toBe('1234567890123.100001');
});

it('preserves statement status decimal tokens', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
    '{"resultCode":"200","result":{"items":[{"salesStatementId":1,"lineTotalAmt":1234567890123.100001}]}}',
  )));
  const rows = await getStatementStatus('2026-11-01', '2026-11-30', '');
  expect(rows[0].lineTotalAmt).toBe('1234567890123.100001');
});

it('preserves source delivery totals in the statement picker', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
    '{"resultCode":"200","result":{"items":[{"salesDeliveryId":1,"totalAmt":1234567890123.100001}]}}',
  )));
  const rows = await searchStatementSources({ keyword: '', deliveryDtFrom: '2026-11-01', deliveryDtTo: '2026-11-30',
    deliveryType: '', customerKeyword: '', materialKeyword: '', deliveryNo: '' });
  expect(rows[0].totalAmt).toBe('1234567890123.100001');
  expect(createStatementSourceColumns().find((column) => column.field === 'totalAmt')?.exactDecimal).toBe(true);
});
