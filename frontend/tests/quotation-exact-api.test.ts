import { afterEach, expect, it, vi } from 'vitest';
import { getQuotation, toQuotationForm, updateQuotation } from '../src/pages/sales/quotation/create/services/quotation.service';
import { searchQuotationStatus } from '../src/pages/sales/quotation/status/services/quotationStatus.service';
import { createQuotationStatusColumns } from '../src/pages/sales/quotation/status/data/quotationStatusColumns';

vi.mock('../src/shared/services/authService', () => ({
  getStoredAuth: () => ({}),
  isAccessTokenExpiringSoon: () => false,
  isTokenExpired: () => false,
  logout: vi.fn(),
  refreshAccessToken: vi.fn(),
  resolveApiBaseUrl: () => '',
}));

afterEach(() => vi.unstubAllGlobals());

it('preserves quotation decimal tokens through retrieval and edit form mapping', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
    '{"resultCode":"200","result":{"item":{"quotationId":3,"customerId":1,"details":[{"quotationDetailId":2,"quotationQty":1,"unitPrice":1234567890123.100001,"lineAmt":1234567890123.100001}]}}}',
  )));
  const item = await getQuotation(3);
  expect(toQuotationForm(item).rows[0]).toMatchObject({
    quotationQty: '1', unitPrice: '1234567890123.100001', lineAmt: '1234567890123.100001',
  });
});

it('preserves quotation decimal tokens in the update response', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(
    '{"resultCode":"200","result":{"item":{"details":[{"unitPrice":1234567890123.100001}]}}}',
  ));
  vi.stubGlobal('fetch', fetch);
  const item = await updateQuotation(3, { quotationDt: '2026-11-24', customerId: 1,
    submitDt: null, customerReference: null, incoterms: null, paymentTerm: null, validTerm: null,
    currencyCode: null, remark: null, details: [] });
  expect(item.details[0].unitPrice).toBe('1234567890123.100001');
});

it('preserves exact amounts in the quotation status list', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
    '{"resultCode":"200","result":{"resultList":[{"quotationId":3,"quotationQty":1,"unitPrice":1234567890123.100001}]}}',
  )));
  const rows = await searchQuotationStatus({ quotationDtFrom: '2026-11-01', quotationDtTo: '2026-11-30' });
  expect(rows[0]).toMatchObject({ quotationId: 3, quotationQty: '1', unitPrice: '1234567890123.100001' });
  expect(createQuotationStatusColumns().find((column) => column.field === 'unitPrice')?.exactDecimal).toBe(true);
});
