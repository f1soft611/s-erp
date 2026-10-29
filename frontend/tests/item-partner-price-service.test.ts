import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchItemPartnerPrices,
  normalizeItemPartnerPriceRow,
  saveItemPartnerPriceRows,
  validateItemPartnerPriceImport,
} from '../src/pages/co/master/item-partner-prices/services/itemPartnerPrice.service';

const api = vi.hoisted(() => ({ apiGet: vi.fn(), apiPost: vi.fn() }));
vi.mock('../src/shared/services/apiClient', () => api);

const sample = {
  priceId: 45,
  tenantId: 9,
  materialId: 101,
  materialCode: '000101',
  materialName: '원재료',
  customerId: 201,
  customerCode: '000201',
  customerName: '거래처',
  tradeType: '매입',
  unitPrice: '1250.50',
  currency: 'KRW',
  startDt: '2026-10-01',
  endDt: null,
  moq: null,
  useAt: 'Y',
};

beforeEach(() => vi.clearAllMocks());

describe('item partner price service', () => {
  it('strictly normalizes price rows and rejects invalid tenant IDs', () => {
    expect(normalizeItemPartnerPriceRow(sample)).toMatchObject({
      priceId: 45,
      materialCode: '000101',
      unitPrice: 1250.5,
      moq: null,
      useAt: 'Y',
    });
    expect(() => normalizeItemPartnerPriceRow({ ...sample, customerId: 0 })).toThrow();
    expect(() => normalizeItemPartnerPriceRow({ ...sample, useAt: 'X' })).toThrow();
  });

  it('encodes submitted list filters without tenant identity', async () => {
    api.apiGet.mockResolvedValue({ resultList: [sample] });
    await fetchItemPartnerPrices({
      keyword: ' flour ',
      tradeType: '매입',
      effectiveOn: '2026-10-01',
      useAt: 'Y',
    });
    expect(api.apiGet).toHaveBeenCalledWith(
      '/api/v1/co/master/item-partner-prices?keyword=flour&tradeType=%EB%A7%A4%EC%9E%85&effectiveOn=2026-10-01&useAt=Y',
    );
  });

  it('validates import rows and rejects malformed preflight responses', async () => {
    const request = {
      rows: [{
        sourceRowNumber: 2,
        tradeType: '매입',
        materialCode: '000101',
        customerCode: '000201',
        unitPrice: '1250.50',
        currency: 'KRW',
        startDt: '2026-10-01',
        endDt: null,
        moq: null,
        useAt: 'Y',
      }],
    };
    api.apiPost.mockResolvedValue({
      item: { rows: [{
        sourceRowNumber: 2,
        materialId: 101,
        materialCode: '000101',
        materialName: '원재료',
        customerId: 201,
        customerCode: '000201',
        customerName: '거래처',
        errors: [],
      }] },
    });
    await expect(validateItemPartnerPriceImport(request.rows)).resolves.toMatchObject({
      rows: [{ sourceRowNumber: 2, materialId: 101, errors: [] }],
    });
    expect(api.apiPost).toHaveBeenCalledWith(
      '/api/v1/co/master/item-partner-prices/validate-import',
      request,
    );
    api.apiPost.mockResolvedValue({ item: { rows: [] } });
    await expect(validateItemPartnerPriceImport(request.rows)).rejects.toThrow();
  });

  it('reconciles saved rows by the server-provided local ID mapping', async () => {
    api.apiPost.mockResolvedValue({
      item: {
        prices: [sample],
        rowIdMappings: { 'new-price-1': 45 },
      },
    });
    const localRow = { ...normalizeItemPartnerPriceRow(sample), priceId: 'new-price-1' };
    const saved = await saveItemPartnerPriceRows({
      prices: { insertedRows: [localRow], updatedRows: [], deletedRows: [] },
    }, [localRow]);
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      previousRowId: 'new-price-1',
      row: { priceId: 45 },
    });
  });
});
