import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet, apiPost, apiPut } from '../src/shared/services/apiClient';
import {
  createDeliveryPlan, defaultDeliveryPlanFilters, getDeliveryPlan, getDeliveryPlanStatus,
  searchPlanSourceOrders, updateDeliveryPlan, validDeliveryPlanPeriod, validateDeliveryPlan,
} from '../src/pages/sales/delivery-plan/services/salesDeliveryPlan.service';
import type { DeliveryPlanRequest, PlanSourceOrderRow } from '../src/pages/sales/delivery-plan/types/salesDeliveryPlan.types';

vi.mock('../src/shared/services/apiClient', () => ({
  apiGet: vi.fn(), apiPost: vi.fn(), apiPut: vi.fn(),
}));

const source: PlanSourceOrderRow = {
  salesOrderId: 7, salesOrderDetailId: 70, orderNo: 'SO-7', orderDt: '2026-11-04',
  customerId: 10, customerCode: 'C10', customerName: '거래처', deliveryPlace: '창고',
  deliveryMethod: '택배', lineNo: 1, materialId: 20, materialCode: 'M20',
  materialName: '품목', unit: 'EA', orderQty: 10, shippedQty: 0, unitPrice: 100,
  planDt: '2026-11-08',
};
const request: DeliveryPlanRequest = {
  salesOrderId: 7,
  details: [
    { salesDeliveryPlanDetailId: null, salesOrderDetailId: 70, planDt: '2026-11-08', plannedQty: 4 },
    { salesDeliveryPlanDetailId: null, salesOrderDetailId: 70, planDt: '2026-11-09', plannedQty: 6 },
  ],
};

describe('sales delivery plan contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('accepts split plans within the source order quantity and rejects over-planning', () => {
    expect(validateDeliveryPlan(request, [source])).toBe('');
    expect(validateDeliveryPlan({
      ...request, details: [...request.details, { ...request.details[0], plannedQty: 1 }],
    }, [source])).toContain('초과');
    expect(validateDeliveryPlan({
      ...request, details: [{ ...request.details[0], plannedQty: 0 }],
    }, [source])).toContain('수량');
  });

  it('requires a valid period and initializes status filters to the current month', () => {
    const filters = defaultDeliveryPlanFilters(new Date(2026, 10, 4));
    expect(filters).toEqual({ planDtFrom: '2026-11-01', planDtTo: '2026-11-30', keyword: '' });
    expect(validDeliveryPlanPeriod(filters)).toBe(true);
    expect(validDeliveryPlanPeriod({ ...filters, planDtFrom: '' })).toBe(false);
    expect(validDeliveryPlanPeriod({ ...filters, planDtTo: '2026-02-30' })).toBe(false);
  });

  it('uses the tenant-scoped plan endpoints and validates response envelopes', async () => {
    const item = { salesDeliveryPlanId: 9, planNo: 'DP-9', details: [] };
    vi.mocked(apiGet).mockResolvedValue({ items: [source], item });
    vi.mocked(apiPost).mockResolvedValue({ item });
    vi.mocked(apiPut).mockResolvedValue({ item });
    expect(await searchPlanSourceOrders('SO & 7')).toEqual([source]);
    expect(await createDeliveryPlan(request)).toEqual(item);
    expect(await getDeliveryPlan(9)).toEqual(item);
    expect(await updateDeliveryPlan(9, request)).toEqual(item);
    await getDeliveryPlanStatus(defaultDeliveryPlanFilters(new Date(2026, 10, 4)));
    expect(apiGet).toHaveBeenCalledWith('/api/v1/sales/delivery-plans/source-orders?keyword=SO+%26+7');
    expect(apiPost).toHaveBeenCalledWith('/api/v1/sales/delivery-plans', request);
    expect(apiPut).toHaveBeenCalledWith('/api/v1/sales/delivery-plans/9', request);
    vi.mocked(apiGet).mockResolvedValue({});
    await expect(getDeliveryPlan(9)).rejects.toThrow('납품계획 응답');
  });
});
