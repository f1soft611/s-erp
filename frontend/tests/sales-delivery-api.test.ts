import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet, apiPost, apiPut, apiDelete } from '../src/shared/services/apiClient';
import { ApiResponseError } from '../src/shared/services/apiErrors';
import {
  buildDeliveryPayload, validateDelivery, sourceOrderForm, createDelivery,
  getDelivery, updateDelivery, deleteDelivery, searchSourceOrders, getDeliveryStatus,
  defaultDeliveryFilters, validDeliveryPeriod, restoreDeliveryFilters,
} from '../src/pages/sales/delivery/create/services/salesDelivery.service';
import type { DeliveryForm, SourceOrderRow } from '../src/pages/sales/delivery/create/types/salesDelivery.types';

vi.mock('../src/shared/services/apiClient', () => ({
  apiGet: vi.fn(), apiPost: vi.fn(), apiPut: vi.fn(), apiDelete: vi.fn(),
}));

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
  it('loads one source order with customer and remaining quantities', () => {
    const result = sourceOrderForm([source, { ...source, salesOrderId: 8 }], '2026-11-04');
    expect(result.customerId).toBe(10);
    expect(result.salesOrderId).toBe(7);
    expect(result.details).toHaveLength(1);
    expect(result.details[0]).toMatchObject({ deliveryQty: 6, salesOrderDetailId: 70,
      salesDeliveryPlanDetailId: 700, vatAmt: 60 });
  });
  it('keeps exhausted plan rows selectable without initializing a negative delivery quantity', () => {
    const result = sourceOrderForm([{ ...source, remainingQty: -5, deliveredQty: 11 }], '2026-11-04');
    expect(result.details).toHaveLength(1);
    expect(result.details[0]).toMatchObject({ salesDeliveryPlanDetailId: 700, deliveryQty: 0, supplyAmt: 0 });
    expect(validateDelivery(result)).toContain('납품수량');
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
    expect(payload.details).toEqual([{ materialId: 20, salesOrderDetailId: null, salesDeliveryPlanDetailId: null,
      deliveryQty: 6, unitPrice: 100, vatAmt: 60 }]);
  });
  it('rejects missing headers, source references, duplicate source lines and invalid amounts', () => {
    expect(validateDelivery({ ...form(), deliveryDt: '', customerId: null })).toContain('납품일자');
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
    await searchSourceOrders('SO & 7');
    expect(apiPost).toHaveBeenCalledWith('/api/v1/sales/deliveries', expect.any(Object));
    expect(apiPut).toHaveBeenCalledWith('/api/v1/sales/deliveries/3', expect.any(Object));
    expect(apiDelete).toHaveBeenCalledWith('/api/v1/sales/deliveries/3');
    expect(apiGet).toHaveBeenCalledWith('/api/v1/sales/deliveries/source-orders?keyword=SO+%26+7');
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
