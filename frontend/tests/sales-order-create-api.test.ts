import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiDelete, apiGet, apiPost, apiPut } from '../src/shared/services/apiClient';
import {
  buildSalesOrderCreatePayload,
  createSalesOrder,
  deleteSalesOrder,
  getSalesOrder,
  toSalesOrderForm,
  updateSalesOrder,
  validateSalesOrderInput,
} from '../src/pages/sales/order/create/services/salesOrder.service';
import type {
  SalesOrderCreatePayload,
  SalesOrderCreateResponse,
  SalesOrderItem,
  SalesOrderResponse,
} from '../src/pages/sales/order/create/types/salesOrder.types';
import type { SalesOrderDetailRow } from '../src/pages/sales/order/create/data/salesOrderDetail';

vi.mock('../src/shared/services/apiClient', () => ({
  apiDelete: vi.fn(),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
}));

const apiPostMock = vi.mocked(apiPost);
const apiGetMock = vi.mocked(apiGet);
const apiPutMock = vi.mocked(apiPut);
const apiDeleteMock = vi.mocked(apiDelete);

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

  it('collects detail validation messages once regardless of row count', () => {
    const errors = validateSalesOrderInput({
      orderDt: '2026-10-27',
      customerId: 10,
      details: [
        detailRow({ rowId: 'line-1', orderQty: 0 }),
        detailRow({ rowId: 'line-2', orderQty: 0 }),
        detailRow({ rowId: 'line-3', materialId: null, orderQty: 0 }),
      ],
    });

    expect(errors.detailMessages).toEqual([
      '주문수량은 0보다 큰 유효한 값이어야 합니다.',
      '품목을 선택해 주세요.',
    ]);
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

  it('loads, updates and deletes an order by id', async () => {
    const order = savedOrderItem();
    apiGetMock.mockResolvedValue({ item: order } satisfies SalesOrderResponse);
    apiPutMock.mockResolvedValue({ item: order } satisfies SalesOrderResponse);
    apiDeleteMock.mockResolvedValue({ message: '삭제' });

    await expect(getSalesOrder(300)).resolves.toEqual(order);
    expect(apiGetMock).toHaveBeenCalledWith('/api/v1/sales/orders/300');

    const payload = buildSalesOrderCreatePayload({
      orderDt: '2026-10-27',
      customerId: 10,
      quotNo: null,
      deliveryDt: '',
      deliveryPlace: null,
      deliveryMethod: null,
      remark: null,
      details: [detailRow()],
    });
    await expect(updateSalesOrder(300, payload)).resolves.toEqual(order);
    expect(apiPutMock).toHaveBeenCalledWith('/api/v1/sales/orders/300', payload);

    await deleteSalesOrder(300);
    expect(apiDeleteMock).toHaveBeenCalledWith('/api/v1/sales/orders/300');

    apiGetMock.mockResolvedValue({});
    await expect(getSalesOrder(300)).rejects.toThrow('수주 조회 응답에 수주 정보가 없습니다.');
  });

  it('maps a loaded order to header values and editable grid rows', () => {
    const form = toSalesOrderForm(savedOrderItem());

    expect(form.customer).toEqual({ id: 10, code: 'C-10', name: '거래처 10' });
    expect(form.header).toEqual({
      orderDt: '2026-10-27',
      quotNo: 'Q-7',
      deliveryDt: '',
      deliveryPlace: '',
      deliveryMethod: '택배',
      remark: '',
    });
    expect(form.rows).toEqual([
      {
        rowId: 'order-line-450',
        materialId: 20,
        materialCode: 'M-20',
        materialName: '품목 20',
        orderQty: 2,
        unitPrice: 100,
        supplyAmount: 200,
        vatAmount: 20,
        totalAmount: 220,
        deliveryDt: '2026-11-10',
        shippedQty: 0,
        lineStatus: '대기',
      },
    ]);
  });
});

function savedOrderItem(): SalesOrderItem {
  return {
    salesOrderId: 300,
    orderNo: 'SO-20261027-0001',
    orderDt: '2026-10-27',
    customerId: 10,
    customerCode: 'C-10',
    customerName: '거래처 10',
    quotNo: 'Q-7',
    deliveryDt: null,
    deliveryPlace: null,
    deliveryMethod: '택배',
    status: '수주등록',
    totalAmt: 220,
    remark: null,
    details: [
      {
        salesOrderDetailId: 450,
        lineNo: 1,
        materialId: 20,
        materialCode: 'M-20',
        materialName: '품목 20',
        orderQty: 2,
        unitPrice: 100,
        supplyAmt: 200,
        vatAmt: 20,
        totalAmt: 220,
        deliveryDt: '2026-11-10',
        shippedQty: 0,
        lineStatus: '대기',
      },
    ],
  };
}

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
