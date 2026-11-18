import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCustomerPriceBatch } from '../src/pages/co/master/item-partner-prices/services/itemPriceCustomerChanges';
import {
  fetchItemPriceCustomers,
  normalizeItemPriceCustomerRow,
} from '../src/pages/co/master/item-partner-prices/services/itemPriceCustomer.service';
import {
  fetchItemPartnerPrices,
  normalizeItemPartnerPriceRow,
} from '../src/pages/co/master/item-partner-prices/services/itemPartnerPrice.service';
import type { ItemPartnerPriceRow } from '../src/pages/co/master/item-partner-prices/types/itemPartnerPrice.types';

const api = vi.hoisted(() => ({ apiGet: vi.fn(), apiPost: vi.fn() }));
vi.mock('../src/shared/services/apiClient', () => api);

const today = '2026-11-18';
let seq = 0;
const newId = () => `new-price-${++seq}`;
const customer = { customerId: 301 };

const base = {
  priceId: 10, tenantId: 9, materialId: 1, materialCode: 'A', materialName: '품목A', materialSpec: '규격',
  customerId: 301, customerCode: 'C1', customerName: '거래처1', tradeType: '매입', unitPrice: '1000',
  taxType: 'TAXABLE', vatIncludedAt: 'N', foreignUnitPrice: null, currency: null, moq: '5',
  startDt: '2026-11-01', endDt: null, useAt: 'Y', priceStatus: 'current',
};
const row = (overrides: Record<string, unknown> = {}): ItemPartnerPriceRow =>
  normalizeItemPartnerPriceRow({ ...base, ...overrides });
const changes = (partial: Partial<{ insertedRows: ItemPartnerPriceRow[]; updatedRows: ItemPartnerPriceRow[] }>) =>
  ({ insertedRows: [], updatedRows: [], deletedRows: [], ...partial });

beforeEach(() => { vi.clearAllMocks(); seq = 0; });

describe('item price by customer: services', () => {
  it('sends customerId in the price list query and keeps the item spec', async () => {
    api.apiGet.mockResolvedValue({ resultList: [base] });
    const rows = await fetchItemPartnerPrices({ customerId: 301, includeHistory: true });
    expect(api.apiGet).toHaveBeenCalledWith(
      '/api/v1/co/master/item-partner-prices?includeHistory=true&customerId=301',
    );
    expect(rows[0]).toMatchObject({ materialSpec: '규격' });
  });

  it('loads the customer list with filters and normalizes rows strictly', async () => {
    api.apiGet.mockResolvedValue({
      resultList: [{ customerId: 301, customerCode: 'C1', customerName: '거래처1', businessNo: '123', priceCount: 3 }],
    });
    const rows = await fetchItemPriceCustomers({ keyword: ' abc ', registerFilter: 'REGISTERED', effectiveOn: '2026-11-18' });
    expect(api.apiGet).toHaveBeenCalledWith(
      '/api/v1/co/master/item-partner-prices/customer-overview?keyword=abc&registerFilter=REGISTERED&effectiveOn=2026-11-18',
    );
    expect(rows).toEqual([{ customerId: 301, customerCode: 'C1', customerName: '거래처1', businessNo: '123', priceCount: 3 }]);
    await fetchItemPriceCustomers({ registerFilter: 'ALL' });
    expect(api.apiGet).toHaveBeenLastCalledWith('/api/v1/co/master/item-partner-prices/customer-overview');
    expect(() => normalizeItemPriceCustomerRow({ customerId: 0 })).toThrow();
    expect(() => normalizeItemPriceCustomerRow({ customerId: 1, priceCount: -1 })).toThrow();
  });
});

describe('item price by customer: change set', () => {
  it('inserts new rows for the selected customer and defaults a blank start date to today', () => {
    const created: ItemPartnerPriceRow = { ...row(), priceId: 'new-price-x', customerId: null, customerCode: '',
      customerName: '', startDt: '', unitPrice: 800, priceStatus: undefined };
    const batch = buildCustomerPriceBatch(changes({ insertedRows: [created] }), [], customer.customerId, today, newId);
    expect(batch.prices.insertedRows).toEqual([expect.objectContaining({
      priceId: 'new-price-x', customerId: 301, materialId: 1, tradeType: '매입', unitPrice: 800, startDt: today,
    })]);
    expect(batch.prices.updatedRows).toEqual([]);
  });

  it('corrects a current row when the start date is unchanged', () => {
    const source = row();
    const batch = buildCustomerPriceBatch(
      changes({ updatedRows: [{ ...source, unitPrice: 1100 }] }), [source], 301, today, newId,
    );
    expect(batch.prices.updatedRows).toEqual([expect.objectContaining({
      priceId: '10', unitPrice: 1100, startDt: '2026-11-01', endDt: null, moq: 5,
    })]);
    expect(batch.prices.insertedRows).toEqual([]);
  });

  it('starts a new period for a current row when the start date moves later, carrying MOQ', () => {
    const source = row();
    const batch = buildCustomerPriceBatch(
      changes({ updatedRows: [{ ...source, unitPrice: 1200, startDt: '2026-12-01' }] }), [source], 301, today, newId,
    );
    expect(batch.prices.updatedRows).toEqual([]);
    expect(batch.prices.insertedRows).toEqual([expect.objectContaining({
      priceId: 'new-price-1', unitPrice: 1200, startDt: '2026-12-01', endDt: null, moq: 5, customerId: 301,
    })]);
  });

  it('rejects moving a current start date earlier and editing past rows', () => {
    const source = row();
    expect(() => buildCustomerPriceBatch(
      changes({ updatedRows: [{ ...source, startDt: '2026-10-01' }] }), [source], 301, today, newId,
    )).toThrow('앞당');
    const past = row({ priceStatus: 'past', startDt: '2026-10-01', endDt: '2026-10-31' });
    expect(() => buildCustomerPriceBatch(
      changes({ updatedRows: [{ ...past, unitPrice: 5 }] }), [past], 301, today, newId,
    )).toThrow('과거');
  });

  it('lets a future row change freely as a plain update', () => {
    const future = row({ startDt: '2026-12-10', priceStatus: 'future' });
    const batch = buildCustomerPriceBatch(
      changes({ updatedRows: [{ ...future, startDt: '2026-12-20' }] }), [future], 301, today, newId,
    );
    expect(batch.prices.updatedRows).toEqual([expect.objectContaining({ priceId: '10', startDt: '2026-12-20' })]);
  });

  it('accepts a foreign-price-only row and requires at least one price', () => {
    const foreignOnly: ItemPartnerPriceRow = {
      ...row(), priceId: 'new-price-f', customerId: null, startDt: today, unitPrice: null,
      foreignUnitPrice: 4.5, currency: 'USD', priceStatus: undefined,
    };
    const batch = buildCustomerPriceBatch(changes({ insertedRows: [foreignOnly] }), [], 301, today, newId);
    expect(batch.prices.insertedRows).toEqual([expect.objectContaining({
      unitPrice: null, foreignUnitPrice: 4.5, currency: 'USD', customerId: 301,
    })]);
    const none: ItemPartnerPriceRow = { ...foreignOnly, priceId: 'new-price-n', foreignUnitPrice: null, currency: '' };
    expect(() => buildCustomerPriceBatch(changes({ insertedRows: [none] }), [], 301, today, newId))
      .toThrow('원화단가 또는 외화단가');
  });

  it('rejects VAT included for a non-taxable type', () => {
    const bad: ItemPartnerPriceRow = {
      ...row(), priceId: 'new-price-v', customerId: null, startDt: today, taxType: 'EXEMPT',
      vatIncludedAt: 'Y', priceStatus: undefined,
    };
    expect(() => buildCustomerPriceBatch(changes({ insertedRows: [bad] }), [], 301, today, newId))
      .toThrow('과세');
  });

  it('sends deletions for saved rows only, skips unsaved new rows and rejects past rows', () => {
    const source = row();
    const unsaved: ItemPartnerPriceRow = { ...row(), priceId: 'new-price-u', priceStatus: undefined };
    const batch = buildCustomerPriceBatch(
      { insertedRows: [], updatedRows: [], deletedRows: [source, unsaved] }, [source], 301, today, newId,
    );
    expect(batch.prices.deletedRows).toEqual([{ priceId: '10' }]);

    const past = row({ priceStatus: 'past', startDt: '2026-10-01', endDt: '2026-10-31' });
    expect(() => buildCustomerPriceBatch(
      { insertedRows: [], updatedRows: [], deletedRows: [past] }, [past], 301, today, newId,
    )).toThrow('과거');
  });

  it('requires a server date and a currency with the foreign price', () => {
    const created: ItemPartnerPriceRow = { ...row(), priceId: 'new-price-y', customerId: null, startDt: '', priceStatus: undefined };
    expect(() => buildCustomerPriceBatch(changes({ insertedRows: [created] }), [], 301, '', newId))
      .toThrow('서버 날짜');
    const noCurrency: ItemPartnerPriceRow = { ...row(), priceId: 'new-price-z', foreignUnitPrice: 3.5, currency: '', priceStatus: undefined };
    expect(() => buildCustomerPriceBatch(changes({ insertedRows: [noCurrency] }), [], 301, today, newId))
      .toThrow('통화');
  });
});
