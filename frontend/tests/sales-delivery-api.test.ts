import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet, apiPost, apiPut, apiDelete } from '../src/shared/services/apiClient';
import { ApiResponseError } from '../src/shared/services/apiErrors';
import {
  buildDeliveryPayload, validateDelivery, sourceOrderForm, createDelivery, deliveryAmounts,
  getDelivery, updateDelivery, deleteDelivery, searchSourceOrders, getDeliveryStatus,
  defaultDeliveryFilters, validDeliveryPeriod, restoreDeliveryFilters,
} from '../src/pages/sales/shipment/delivery/create/services/salesDelivery.service';
import type { DeliveryForm, SourceOrderRow } from '../src/pages/sales/shipment/delivery/create/types/salesDelivery.types';

vi.mock('../src/shared/services/apiClient', () => {
  const apiGet = vi.fn();
  const apiPost = vi.fn();
  const apiPut = vi.fn();
  return { apiGet, apiGetWithExactDecimals: (path: string) => apiGet(path),
    apiPost, apiPut, apiDelete: vi.fn(),
    apiPostWithExactDecimals: (path: string, payload: unknown) => apiPost(path, payload),
    apiPutWithExactDecimals: (path: string, payload: unknown) => apiPut(path, payload) };
});

export const source: SourceOrderRow = {
  salesOrderId: 7, salesOrderDetailId: 70, salesDeliveryPlanDetailId: 700, orderNo: 'SO-7', orderDt: '2026-11-04',
  customerId: 10, customerCode: 'C10', deliveryPlace: '창고',
  customerName: '거래처', planNo: 'DP-1', planDt: '2026-11-08',
  deliveryMethod: '택배', lineNo: 1, materialId: 20, materialCode: 'M20',
  materialName: '품목', unit: 'EA', orderQty: 10, shippedQty: 4, plannedQty: 6,
  deliveredQty: 0, remainingQty: 6, unitPrice: 100,
};

function form(): DeliveryForm {
  return sourceOrderForm([source], '2026-11-04');
}

describe('sales delivery contract', () => {
  beforeEach(() => vi.clearAllMocks());
  it('calculates and validates delivery values under the current type rules', () => {
    const policy = {
      number: { places: 3, rounding: 'HALF_UP', trailingZeros: 'FIXED' },
      decimal: { places: 3, rounding: 'DOWN', trailingZeros: 'FIXED' },
      currency: { places: 2, rounding: 'HALF_UP', trailingZeros: 'FIXED' },
    } as const;
    const amounts = deliveryAmounts(1.234, 1.235, undefined, policy.currency);
    expect(amounts).toEqual({ supplyAmt: 1.52, vatAmt: 0.15, totalAmt: 1.67 });
    const delivery = { ...form(), details: [{ ...form().details[0], deliveryQty: 1.234, unitPrice: 1.235, ...amounts }] };
    expect(validateDelivery(delivery, policy)).toBe('');
    expect(buildDeliveryPayload(delivery, policy)).toHaveProperty('decimalPolicy', policy);
    expect(buildDeliveryPayload(delivery, policy)).toHaveProperty('decimalColumns.supplyAmt.type', 'currency');
    expect(validateDelivery({ ...delivery, details: [{ ...delivery.details[0], vatAmt: 0.2, totalAmt: 1.72 }] }, policy)).toBe('');
    expect(validateDelivery({ ...delivery, details: [{ ...delivery.details[0], unitPrice: 1.2345 }] }, policy)).toContain('단가');
    expect(validateDelivery({ ...delivery, details: [{ ...delivery.details[0], supplyAmt: 1.53, totalAmt: 1.67 }] }, policy)).toContain('재계산');
    expect(validateDelivery({ ...delivery, details: [{ ...delivery.details[0], vatAmt: 0.151 }] }, policy)).toContain('VAT');
  });

  it('calculates and validates delivery amounts using shared column rules', async () => {
    const contracts = await import('../src/shared/services/decimalColumnContract');
    const original = contracts.getDecimalColumnContract('sales.delivery');
    const spy = vi.spyOn(contracts, 'getDecimalColumnContract').mockReturnValue({
      ...original,
      deliveryQty: { type: 'number', places: 1 },
      supplyAmt: { type: 'currency', places: 2, rounding: 'HALF_UP' },
      vatAmt: { type: 'currency', places: 1, rounding: 'HALF_UP' },
      totalAmt: { type: 'currency', places: 3, rounding: 'DOWN' },
    });
    try {
      const rule = { places: 3, rounding: 'DOWN' as const, trailingZeros: 'FIXED' as const };
      const amounts = deliveryAmounts('1', '1.235', undefined, rule);
      expect(amounts).toEqual({ supplyAmt: '1.24', vatAmt: '0.1', totalAmt: '1.340' });
      const delivery = { ...form(), details: [{ ...form().details[0], deliveryQty: '1', unitPrice: '1.235', ...amounts }] };
      expect(validateDelivery(delivery, rule)).toBe('');
      expect(validateDelivery({ ...delivery, details: [{ ...delivery.details[0], deliveryQty: '1.01' }] }, rule)).toContain('출하수량');
    } finally { spy.mockRestore(); }
  });
  it('preserves exact source order values through calculation and delivery validation', () => {
    const policy = {
      number: { places: 0, rounding: 'DOWN', trailingZeros: 'FIXED' },
      decimal: { places: 6, rounding: 'DOWN', trailingZeros: 'FIXED' },
      currency: { places: 6, rounding: 'DOWN', trailingZeros: 'FIXED' },
    } as const;
    const result = sourceOrderForm([{ ...source, remainingQty: '1', unitPrice: '1234567890123.100001' }],
      '2026-11-04', policy.decimal);
    expect(result.details[0]).toMatchObject({
      deliveryQty: '1', unitPrice: '1234567890123.100001',
      supplyAmt: '1234567890123.100001', vatAmt: '123456789012.310000', totalAmt: '1358024679135.410001',
    });
    expect(validateDelivery(result, policy)).toBe('');
    expect(buildDeliveryPayload(result, policy).details[0].unitPrice).toBe('1234567890123.100001');
  });
  it('loads multiple source orders with per-line references and combined order numbers', () => {
    const result = sourceOrderForm([
      source,
      { ...source, salesOrderId: 8, salesOrderDetailId: 80, salesDeliveryPlanDetailId: 800, orderNo: 'SO-8' },
    ], '2026-11-04');
    expect(result.customerId).toBe(10);
    expect(result.salesOrderId).toBe(7);
    expect(result.orderNo).toBe('SO-7, SO-8');
    expect(result.details).toHaveLength(2);
    expect(result.details[0]).toMatchObject({ deliveryQty: 6, salesOrderId: 7, salesOrderDetailId: 70,
      salesDeliveryPlanDetailId: 700, vatAmt: 60 });
    expect(result.details[1]).toMatchObject({ salesOrderId: 8, salesOrderDetailId: 80,
      salesDeliveryPlanDetailId: 800 });
  });
  it('keeps exhausted plan rows selectable without initializing a negative delivery quantity', () => {
    const result = sourceOrderForm([{ ...source, remainingQty: -5, deliveredQty: 11 }], '2026-11-04');
    expect(result.details).toHaveLength(1);
    expect(result.details[0]).toMatchObject({ salesDeliveryPlanDetailId: 700, deliveryQty: 0, supplyAmt: 0 });
    expect(validateDelivery(result)).toContain('출하수량');
  });
  it.each(['create', 'update'] as const)('converts only the server confirmation conflict for %s into a warning', async (operation) => {
    const request = () => operation === 'create'
      ? createDelivery(buildDeliveryPayload(form()))
      : updateDelivery(3, buildDeliveryPayload(form()));
    const api = operation === 'create' ? vi.mocked(apiPost) : vi.mocked(apiPut);
    api.mockRejectedValue(new ApiResponseError('[OVER_DELIVERY_CONFIRM_REQUIRED] 수주 100, 저장후 105, 초과 5', 409));
    await expect(request()).rejects.toMatchObject({
      name: 'OverDeliveryConfirmationRequired', message: '수주 100, 저장후 105, 초과 5',
    });
    const ordinary = new ApiResponseError('잔량 초과', 409);
    api.mockRejectedValue(ordinary);
    await expect(request()).rejects.toBe(ordinary);
    const denied = new ApiResponseError('[OVER_DELIVERY_CONFIRM_REQUIRED] 권한 오류', 403);
    api.mockRejectedValue(denied);
    await expect(request()).rejects.toBe(denied);
  });
  it('sends direct references as null and excludes display/server amount fields', () => {
    const payload = buildDeliveryPayload({ ...form(), deliveryType: 'DIRECT' });
    expect(payload.salesOrderId).toBeNull();
    expect(payload.details).toEqual([{ materialId: 20, salesOrderId: null, salesOrderDetailId: null, salesDeliveryPlanDetailId: null,
      deliveryQty: 6, unitPrice: 100, vatAmt: 60 }]);
  });
  it('rejects missing headers, source references, duplicate source lines and invalid amounts', () => {
    expect(validateDelivery({ ...form(), deliveryDt: '', customerId: null })).toContain('출하일자');
    expect(validateDelivery({ ...form(), salesOrderId: null })).toContain('수주');
    expect(validateDelivery({ ...form(), details: [form().details[0], form().details[0]] })).toContain('중복');
    expect(validateDelivery({ ...form(), details: [{ ...form().details[0], deliveryQty: 0 }] })).toContain('수량');
    expect(validateDelivery({ ...form(), details: [{ ...form().details[0], unitPrice: NaN }] })).toContain('단가');
    expect(validateDelivery({ ...form(), details: [{ ...form().details[0], vatAmt: -1 }] })).toContain('VAT');
  });
  it('uses the exact CRUD and source endpoints and fails missing envelopes', async () => {
    const item = { salesDeliveryId: 3 };
    vi.mocked(apiPost).mockResolvedValue({ item });
    vi.mocked(apiPut).mockResolvedValue({ item });
    vi.mocked(apiGet).mockResolvedValue({ item, items: [source] });
    expect(await createDelivery(buildDeliveryPayload(form()))).toEqual(item);
    await getDelivery(3);
    await updateDelivery(3, buildDeliveryPayload(form()));
    await deleteDelivery(3);
    await searchSourceOrders({
      keyword: 'SO & 7',
      orderDtFrom: '2026-11-01',
      orderDtTo: '2026-11-30',
      orderNo: 'SO/7',
      customerKeyword: 'C+1',
      materialKeyword: 'M 20',
      planNo: 'DP-7',
      planDtFrom: '2026-11-05',
      planDtTo: '2026-11-20',
    });
    expect(apiPost).toHaveBeenCalledWith('/api/v1/sales/deliveries', expect.any(Object));
    expect(apiPut).toHaveBeenCalledWith('/api/v1/sales/deliveries/3', expect.any(Object));
    expect(apiDelete).toHaveBeenCalledWith('/api/v1/sales/deliveries/3');
    expect(apiGet).toHaveBeenCalledWith(
      '/api/v1/sales/deliveries/source-orders?keyword=SO+%26+7&orderDtFrom=2026-11-01&orderDtTo=2026-11-30&orderNo=SO%2F7&customerKeyword=C%2B1&materialKeyword=M+20&planNo=DP-7&planDtFrom=2026-11-05&planDtTo=2026-11-20',
    );
    vi.mocked(apiGet).mockResolvedValue({});
    await expect(getDelivery(3)).rejects.toThrow();
    vi.mocked(apiPost).mockRejectedValue(new Error('잔량 초과'));
    await expect(createDelivery(buildDeliveryPayload(form()))).rejects.toThrow('잔량 초과');
  });
  it('requires a valid period even for restored filters and sends optional status filters', async () => {
    const defaults = defaultDeliveryFilters(new Date(2026, 10, 4));
    expect(defaults).toMatchObject({ deliveryDtFrom: '2026-11-01', deliveryDtTo: '2026-11-30' });
    expect(validDeliveryPeriod({ ...defaults, deliveryDtFrom: '' })).toBe(false);
    expect(validDeliveryPeriod({ ...defaults, deliveryDtFrom: '2026-12-01' })).toBe(false);
    expect(validDeliveryPeriod({ ...defaults, deliveryDtFrom: '2026-02-30' })).toBe(false);
    expect(restoreDeliveryFilters({ ...defaults, deliveryDtTo: '' }, defaults)).toEqual(defaults);
    await expect(getDeliveryStatus({ ...defaults, deliveryDtTo: '' })).rejects.toThrow('기간');
    expect(apiGet).not.toHaveBeenCalled();
    vi.mocked(apiGet).mockResolvedValue({ items: [] });
    await getDeliveryStatus({ ...defaults, customerKeyword: '거래처', deliveryType: 'ORDER' });
    expect(apiGet).toHaveBeenCalledWith(expect.stringContaining('deliveryDtFrom=2026-11-01'));
    expect(apiGet).toHaveBeenCalledWith(expect.stringContaining('deliveryType=ORDER'));
  });
});
