import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiPost } from '../src/shared/services/apiClient';
import {
  buildSalesOrderCreatePayload,
  createSalesOrder,
  validateSalesOrderInput,
} from '../src/pages/sales/order/create/services/salesOrder.service';
import type {
  SalesOrderCreatePayload,
  SalesOrderCreateResponse,
} from '../src/pages/sales/order/create/types/salesOrder.types';
import type { SalesOrderDetailRow } from '../src/pages/sales/order/create/data/salesOrderDetail';

vi.mock('../src/shared/services/apiClient', () => ({
  apiPost: vi.fn(),
}));

const apiPostMock = vi.mocked(apiPost);

describe('sales order create API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects missing header fields and incomplete detail rows', () => {
    const errors = validateSalesOrderInput({
      orderDt: '',
      customerId: null,
      details: [],
    });

    expect(errors.orderDt).toBe('수주일자를 입력해 주세요.');
    expect(errors.customerId).toBe('거래처를 선택해 주세요.');
    expect(errors.details).toBe('품목 상세를 1건 이상 입력해 주세요.');
  });

  it('requires a selected material and positive quantity on every detail', () => {
    const errors = validateSalesOrderInput({
      orderDt: '2026-10-27',
      customerId: 10,
      details: [detailRow({ materialId: null, orderQty: 0 })],
    });

    expect(errors.detailRows['line-1']).toContain('품목');
    expect(errors.detailRows['line-1']).toContain('수량');
  });

  it('maps only editable header and detail fields to the API contract', () => {
    const payload = buildSalesOrderCreatePayload({
      orderDt: '2026-10-27',
      customerId: 10,
      quotNo: '  Q-7 ',
      deliveryDt: '',
      deliveryPlace: '  1층 ',
      deliveryMethod: '택배',
      remark: ' 확인 ',
      details: [detailRow()],
    });

    expect(payload).toEqual({
      orderDt: '2026-10-27',
      customerId: 10,
      quotNo: 'Q-7',
      deliveryDt: null,
      deliveryPlace: '1층',
      deliveryMethod: '택배',
      remark: '확인',
      details: [{
        materialId: 20,
        orderQty: 2,
        unitPrice: 3,
        vatAmt: 0.6,
        deliveryDt: null,
      }],
    } satisfies SalesOrderCreatePayload);
    expect(payload.details[0]).not.toHaveProperty('supplyAmount');
    expect(payload.details[0]).not.toHaveProperty('totalAmount');
    expect(payload).not.toHaveProperty('tenantId');
    expect(payload).not.toHaveProperty('orderNo');
  });

  it('posts the payload and requires a returned order item', async () => {
    const saved = { salesOrderId: 300, orderNo: 'SO-20261027-0001' };
    apiPostMock.mockResolvedValue({ item: saved } satisfies SalesOrderCreateResponse);
    const payload: SalesOrderCreatePayload = {
      orderDt: '2026-10-27',
      customerId: 10,
      quotNo: null,
      deliveryDt: null,
      deliveryPlace: null,
      deliveryMethod: null,
      remark: null,
      details: [{
        materialId: 20,
        orderQty: 2,
        unitPrice: 3,
        vatAmt: 0.6,
        deliveryDt: null,
      }],
    };

    await expect(createSalesOrder(payload)).resolves.toEqual(saved);
    expect(apiPostMock).toHaveBeenCalledWith('/api/v1/sales/orders', payload);

    apiPostMock.mockResolvedValue({});
    await expect(createSalesOrder(payload)).rejects.toThrow(
      '수주 저장 응답에 생성된 주문이 없습니다.',
    );
  });
});

function detailRow(
  overrides: Partial<SalesOrderDetailRow> = {},
): SalesOrderDetailRow {
  return {
    rowId: 'line-1',
    materialId: 20,
    materialCode: 'MAT-20',
    materialName: '품목',
    orderQty: 2,
    unitPrice: 3,
    supplyAmount: 6,
    vatAmount: 0.6,
    totalAmount: 6.6,
    deliveryDt: '',
    shippedQty: 0,
    lineStatus: '대기',
    ...overrides,
  };
}
