import { describe, expect, it } from 'vitest';
import { buildItemPriceBatch, buildItemPriceRemoveBatch } from '../src/pages/co/master/item-partner-prices/services/itemPriceOverviewChanges';
import { normalizeItemPriceOverviewRow } from '../src/pages/co/master/item-partner-prices/services/itemPriceOverview.service';
import type { ItemPriceOverviewRow } from '../src/pages/co/master/item-partner-prices/types/itemPriceOverview.types';

const today = '2026-11-18';
let seq = 0;
const ids = () => `new-price-${++seq}`;

const side = (overrides: Record<string, unknown> = {}) => ({
  priceId: 10,
  unitPrice: '1000',
  taxType: 'TAXABLE',
  vatIncludedAt: 'N',
  foreignUnitPrice: null,
  currency: null,
  moq: '5',
  startDt: '2026-11-01',
  endDt: null,
  priceStatus: 'current',
  ...overrides,
});

function parent(overrides: Record<string, unknown> = {}): ItemPriceOverviewRow {
  return normalizeItemPriceOverviewRow({
    rowId: 'item-1', parentId: null, materialId: 1, materialCode: 'A', materialName: '품목A',
    materialSpec: '규격', materialUnit: 'EA', specialCount: 1, purchase: side(), sales: null, ...overrides,
  });
}

function child(): ItemPriceOverviewRow {
  return normalizeItemPriceOverviewRow({
    rowId: 'cust-1-301', parentId: 'item-1', materialId: 1, materialCode: 'A', materialName: '품목A',
    customerId: 301, customerCode: 'C1', customerName: '거래처1', purchase: side({ priceId: 12, unitPrice: '900' }),
    sales: null,
  });
}

const changes = (partial: Partial<{ insertedRows: ItemPriceOverviewRow[]; updatedRows: ItemPriceOverviewRow[] }>) => ({
  insertedRows: [], updatedRows: [], deletedRows: [], ...partial,
});

describe('item price overview model', () => {
  it('normalizes parent and child rows with flat side fields', () => {
    const row = parent();
    expect(row).toMatchObject({
      displayName: 'A · 품목A', specialLabel: '특별 1건', purchasePriceId: 10, purchaseUnitPrice: 1000,
      purchaseMoq: 5, purchaseStatus: 'current', salesPriceId: null, salesUnitPrice: null, salesStatus: '',
    });
    expect(child()).toMatchObject({ displayName: '거래처1', specialLabel: '', customerId: 301 });
    expect(() => normalizeItemPriceOverviewRow({ rowId: '' })).toThrow();
  });

  it('normalizes order type, default supplier flag and the parent default supplier name', () => {
    const row = child();
    expect(row).toMatchObject({ purchaseOrderType: '', purchaseDefaultSupplier: false, salesDefaultSupplier: false });
    const withDefault = normalizeItemPriceOverviewRow({
      rowId: 'cust-1-301', parentId: 'item-1', materialId: 1, materialCode: 'A', materialName: '품목A',
      customerId: 301, customerCode: 'C1', customerName: '거래처1', sales: null,
      purchase: side({ priceId: 12, orderType: 'DOMESTIC', orderTypeName: '내수', defaultSupplier: true }),
    });
    expect(withDefault).toMatchObject({
      purchaseOrderType: 'DOMESTIC', purchaseOrderTypeName: '내수', purchaseDefaultSupplier: true,
    });
    const parentRow = parent({ defaultSupplierId: 301, defaultSupplierName: '거래처1' });
    expect(parentRow).toMatchObject({ defaultSupplierId: 301, defaultSupplierName: '거래처1' });
  });

  it('sends a flag-only change with unchanged values so the server keeps the price row', () => {
    const source = child();
    const edited = { ...source, purchaseDefaultSupplier: true };
    const batch = buildItemPriceBatch(changes({ updatedRows: [edited] }), [source], today, ids);
    expect(batch.prices.insertedRows).toEqual([]);
    expect(batch.prices.updatedRows).toEqual([expect.objectContaining({
      priceId: '12', customerId: 301, tradeType: '매입', unitPrice: 900, startDt: '2026-11-01',
      defaultSupplier: true, orderType: '',
    })]);
    const cleared = buildItemPriceBatch(changes({ updatedRows: [{ ...edited, purchaseDefaultSupplier: false }] }),
      [{ ...source, purchaseDefaultSupplier: true }], today, ids);
    expect(cleared.prices.updatedRows[0]).toMatchObject({ defaultSupplier: false });
  });

  it('sends the order type with value changes and never flags common-price or sales rows', () => {
    const source = parent();
    const edited = { ...source, purchaseOrderType: 'DOMESTIC', salesUnitPrice: 1500 };
    const batch = buildItemPriceBatch(changes({ updatedRows: [edited] }), [source], today, ids);
    expect(batch.prices.updatedRows[0]).toMatchObject({ tradeType: '매입', orderType: 'DOMESTIC' });
    expect(batch.prices.updatedRows[0]).not.toHaveProperty('defaultSupplier');
    expect(batch.prices.insertedRows[0]).toMatchObject({ tradeType: '매출', orderType: '' });
    expect(batch.prices.insertedRows[0]).not.toHaveProperty('defaultSupplier');
  });

  it('inserts a new default price when the side had none', () => {
    const source = parent();
    const edited = { ...source, salesUnitPrice: 1500, salesStartDt: today };
    const batch = buildItemPriceBatch(changes({ updatedRows: [edited] }), [source], today, ids);
    expect(batch.prices.updatedRows).toEqual([]);
    expect(batch.prices.insertedRows).toEqual([expect.objectContaining({
      materialId: 1, customerId: null, tradeType: '매출', unitPrice: 1500, startDt: today,
      taxType: 'TAXABLE', vatIncludedAt: 'N', foreignUnitPrice: null, currency: '', endDt: null, useAt: 'Y',
      priceId: expect.stringMatching(/^new-price-/),
    })]);
  });

  it('defaults a blank start date to today', () => {
    const source = parent();
    const edited = { ...source, salesUnitPrice: 1500 };
    const batch = buildItemPriceBatch(changes({ updatedRows: [edited] }), [source], today, ids);
    expect(batch.prices.insertedRows[0].startDt).toBe(today);
  });

  it('corrects a current price when only the value changes, keeping end date and MOQ', () => {
    const source = parent();
    const edited = { ...source, purchaseUnitPrice: 1100 };
    const batch = buildItemPriceBatch(changes({ updatedRows: [edited] }), [source], today, ids);
    expect(batch.prices.insertedRows).toEqual([]);
    expect(batch.prices.updatedRows).toEqual([expect.objectContaining({
      priceId: '10', unitPrice: 1100, startDt: '2026-11-01', endDt: null, moq: 5, customerId: null, tradeType: '매입',
    })]);
  });

  it('starts a new period when the start date moves later, carrying MOQ', () => {
    const source = parent();
    const edited = { ...source, purchaseUnitPrice: 1200, purchaseStartDt: '2026-12-01' };
    const batch = buildItemPriceBatch(changes({ updatedRows: [edited] }), [source], today, ids);
    expect(batch.prices.updatedRows).toEqual([]);
    expect(batch.prices.insertedRows).toEqual([expect.objectContaining({
      unitPrice: 1200, startDt: '2026-12-01', moq: 5, endDt: null,
    })]);
  });

  it('rejects moving a current price start date earlier or clearing the price', () => {
    const source = parent();
    expect(() => buildItemPriceBatch(
      changes({ updatedRows: [{ ...source, purchaseStartDt: '2026-10-01' }] }), [source], today, ids,
    )).toThrow('앞당');
    expect(() => buildItemPriceBatch(
      changes({ updatedRows: [{ ...source, purchaseUnitPrice: null }] }), [source], today, ids,
    )).toThrow('지울 수 없');
  });

  it('lets a future price move its start date as a plain update', () => {
    const source = parent({ purchase: side({ startDt: '2026-12-10', priceStatus: 'future' }) });
    const edited = { ...source, purchaseStartDt: '2026-12-20' };
    const batch = buildItemPriceBatch(changes({ updatedRows: [edited] }), [source], today, ids);
    expect(batch.prices.updatedRows).toEqual([expect.objectContaining({ priceId: '10', startDt: '2026-12-20' })]);
  });

  it('accepts a foreign-price-only side and only blocks clearing when both prices become empty', () => {
    const source = parent();
    const foreignOnly = buildItemPriceBatch(changes({ updatedRows: [{
      ...source, salesUnitPrice: null, salesForeignUnitPrice: 7.5, salesCurrency: 'USD', salesStartDt: today,
    }] }), [source], today, ids);
    expect(foreignOnly.prices.insertedRows).toEqual([expect.objectContaining({
      tradeType: '매출', unitPrice: null, foreignUnitPrice: 7.5, currency: 'USD', startDt: today,
    })]);

    const clearUnit = { ...source, purchaseUnitPrice: null, purchaseForeignUnitPrice: 2, purchaseCurrency: 'USD' };
    const kept = buildItemPriceBatch(changes({ updatedRows: [clearUnit] }), [source], today, ids);
    expect(kept.prices.updatedRows[0]).toMatchObject({ unitPrice: null, foreignUnitPrice: 2, currency: 'USD' });

    expect(() => buildItemPriceBatch(
      changes({ updatedRows: [{ ...source, purchaseUnitPrice: null }] }), [source], today, ids,
    )).toThrow('지울 수 없');
  });

  it('requires a currency with the foreign price and keeps currency empty without one', () => {
    const source = parent();
    expect(() => buildItemPriceBatch(
      changes({ updatedRows: [{ ...source, purchaseForeignUnitPrice: 3 }] }), [source], today, ids,
    )).toThrow('통화');
    const batch = buildItemPriceBatch(
      changes({ updatedRows: [{ ...source, purchaseForeignUnitPrice: 3, purchaseCurrency: 'USD' }] }),
      [source], today, ids,
    );
    expect(batch.prices.updatedRows[0]).toMatchObject({ foreignUnitPrice: 3, currency: 'USD' });
  });

  it('skips untouched rows and rows with an empty side that stay empty', () => {
    const source = parent();
    const batch = buildItemPriceBatch(changes({ updatedRows: [{ ...source }] }), [source], today, ids);
    expect(batch.prices.insertedRows).toEqual([]);
    expect(batch.prices.updatedRows).toEqual([]);
  });

  it('saves a new special-price child with the picked customer and each priced side', () => {
    const source = parent();
    const newChild = {
      ...child(), rowId: 'new-child-1', customerId: 302, customerCode: 'C2', customerName: '거래처2',
      purchasePriceId: null, purchaseUnitPrice: 800, purchaseStartDt: '2026-11-18',
      purchaseStatus: '' as const, purchaseMoq: null, purchaseEndDt: null,
      salesPriceId: null, salesUnitPrice: null,
    };
    const batch = buildItemPriceBatch(changes({ insertedRows: [newChild] }), [source], today, ids);
    expect(batch.prices.insertedRows).toEqual([expect.objectContaining({
      materialId: 1, customerId: 302, tradeType: '매입', unitPrice: 800,
    })]);
  });

  it('rejects a new child without a customer or any price', () => {
    const source = parent();
    const blankChild = { ...child(), rowId: 'new-child-2', customerId: null, purchasePriceId: null,
      purchaseUnitPrice: 800, salesPriceId: null, salesUnitPrice: null };
    expect(() => buildItemPriceBatch(changes({ insertedRows: [blankChild] }), [source], today, ids))
      .toThrow('거래처');
    const noPrice = { ...child(), rowId: 'new-child-3', customerId: 302, purchasePriceId: null,
      purchaseUnitPrice: null, salesPriceId: null, salesUnitPrice: null };
    expect(() => buildItemPriceBatch(changes({ insertedRows: [noPrice] }), [source], today, ids))
      .toThrow('단가');
  });

  it('builds a delete batch for the chosen sides that have a price', () => {
    const source = parent({ sales: side({ priceId: 11, unitPrice: '1500' }) });
    const both = buildItemPriceRemoveBatch(source, ['purchase', 'sales'], 'delete');
    expect(both.prices.deletedRows).toEqual([{ priceId: '10' }, { priceId: '11' }]);
    expect(both.prices.updatedRows).toEqual([]);
    expect(buildItemPriceRemoveBatch(source, ['sales'], 'delete').prices.deletedRows).toEqual([{ priceId: '11' }]);
  });

  it('builds a deactivate batch that keeps every value and sets useAt to N', () => {
    const source = parent();
    const batch = buildItemPriceRemoveBatch(source, ['purchase'], 'deactivate');
    expect(batch.prices.deletedRows).toEqual([]);
    expect(batch.prices.updatedRows).toEqual([expect.objectContaining({
      priceId: '10', tradeType: '매입', unitPrice: 1000, startDt: '2026-11-01', endDt: null, moq: 5, useAt: 'N',
    })]);
  });

  it('rejects when no chosen side has a registered price', () => {
    const source = parent();
    expect(() => buildItemPriceRemoveBatch(source, ['sales'], 'delete')).toThrow('선택');
    expect(() => buildItemPriceRemoveBatch(source, [], 'deactivate')).toThrow('선택');
  });

  it('requires a server date', () => {
    const source = parent();
    expect(() => buildItemPriceBatch(
      changes({ updatedRows: [{ ...source, salesUnitPrice: 1 }] }), [source], '', ids,
    )).toThrow('서버 날짜');
  });
});
