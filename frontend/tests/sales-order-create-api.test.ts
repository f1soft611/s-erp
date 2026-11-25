import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiDelete, apiGet, apiGetWithExactDecimals, apiPostWithExactDecimals, apiPutWithExactDecimals } from '../src/shared/services/apiClient';
import {
  buildSalesOrderCreatePayload,
  createSalesOrder,
  deleteSalesOrder,
  getSalesOrder,
  toSalesOrderForm,
  updateSalesOrder,
  validateSalesOrderInput,
} from '../src/pages/sales/order/create/services/salesOrder.service';
import { searchOrderQuotations } from '../src/pages/sales/order/create/services/salesOrderMaster.service';
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
  apiGetWithExactDecimals: vi.fn(),
  apiPostWithExactDecimals: vi.fn(),
  apiPutWithExactDecimals: vi.fn(),
}));

const apiPostMock = vi.mocked(apiPostWithExactDecimals);
const apiGetMock = vi.mocked(apiGet);
const apiGetExactMock = vi.mocked(apiGetWithExactDecimals);
const apiPutMock = vi.mocked(apiPutWithExactDecimals);
const apiDeleteMock = vi.mocked(apiDelete);

describe('sales order create API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires both the selected destination and billing customer', () => {
    const errors = validateSalesOrderInput({
      orderDt: '2026-10-27',
      deliveryDt: '2026-11-27',
      customerId: 10,
      salesDestinationId: null,
      billingCustomerId: null,
      details: [detailRow()],
    });
    expect(errors.salesDestinationId).toBe('납품처를 선택해 주세요.');
    expect(errors.billingCustomerId).toBe('매출처를 선택해 주세요.');
  });

  it('validates quantities and prices with their respective policy scales', () => {
    const policy = {
      number: { places: 0, trailingZeros: 'FIXED' as const, rounding: 'HALF_UP' as const },
      decimal: { places: 3, trailingZeros: 'FIXED' as const, rounding: 'HALF_UP' as const },
      currency: { places: 3, trailingZeros: 'FIXED' as const, rounding: 'HALF_UP' as const },
    };
    const input = {
      orderDt: '2026-10-27', deliveryDt: '2026-11-27', customerId: 10,
      salesDestinationId: 90, billingCustomerId: 11,
      details: [detailRow({ orderQty: 1, unitPrice: 1.234, supplyAmount: 1.234, vatAmount: 0.123, totalAmount: 1.357 })],
    };
    expect(validateSalesOrderInput(input, policy).detailMessages).toEqual([]);
    expect(buildSalesOrderCreatePayload({ ...input, quotNo: null, deliveryPlace: null, deliveryMethod: null,
      remark: null }, policy)).toHaveProperty('decimalPolicy', policy);
    expect(buildSalesOrderCreatePayload({ ...input, quotNo: null, deliveryPlace: null, deliveryMethod: null,
      remark: null }, policy)).toHaveProperty('decimalColumns.unitPrice.type', 'decimal');
    expect(validateSalesOrderInput({ ...input, details: [detailRow({ orderQty: 1, unitPrice: 1.234,
      supplyAmount: 1.234, vatAmount: 0.2, totalAmount: 1.434 })] }, policy).detailMessages).toEqual([]);
    expect(validateSalesOrderInput({ ...input, details: [detailRow({ orderQty: 1.5 })] }, policy).detailMessages.join()).toContain('수량');
    expect(validateSalesOrderInput({ ...input, details: [detailRow({ unitPrice: 1.2345 })] }, policy).detailMessages.join()).toContain('단가');
    expect(validateSalesOrderInput({ ...input, details: [detailRow({ orderQty: 1, unitPrice: 1.234,
      supplyAmount: 1.23, vatAmount: 0.123, totalAmount: 1.353 })] }, policy).detailMessages.join()).toContain('재계산');
  });

  it('validates prices and calculated amounts using distinct decimal and currency policies', () => {
    const policy = {
      number: { places: 3, trailingZeros: 'FIXED' as const, rounding: 'HALF_UP' as const },
      decimal: { places: 3, trailingZeros: 'FIXED' as const, rounding: 'DOWN' as const },
      currency: { places: 2, trailingZeros: 'FIXED' as const, rounding: 'HALF_UP' as const },
    };
    const input = {
      orderDt: '2026-10-27', deliveryDt: '2026-11-27', customerId: 10,
      salesDestinationId: 90, billingCustomerId: 11,
      details: [detailRow({ orderQty: '1.234', unitPrice: '1.235', supplyAmount: '1.52', vatAmount: '0.15', totalAmount: '1.67' })],
    };
    expect(validateSalesOrderInput(input, policy).detailMessages).toEqual([]);
    expect(validateSalesOrderInput({ ...input, details: [{ ...input.details[0], vatAmount: '0.151' }] }, policy).detailMessages.join()).toContain('부가세');
    expect(validateSalesOrderInput({ ...input, details: [{ ...input.details[0], unitPrice: '1.2351' }] }, policy).detailMessages.join()).toContain('단가');
  });

  it('validates order inputs and calculated amounts against each shared column rule', async () => {
    const contracts = await import('../src/shared/services/decimalColumnContract');
    const original = contracts.getDecimalColumnContract('sales.order');
    const spy = vi.spyOn(contracts, 'getDecimalColumnContract').mockReturnValue({
      ...original,
      unitPrice: { type: 'decimal', places: 4 },
      supplyAmount: { type: 'currency', places: 2, rounding: 'HALF_UP' },
      vatAmount: { type: 'currency', places: 1, rounding: 'HALF_UP' },
      totalAmount: { type: 'currency', places: 3, rounding: 'DOWN' },
    });
    try {
      const policy = { places: 3, trailingZeros: 'FIXED' as const, rounding: 'DOWN' as const };
      const row = detailRow({ orderQty: '1', unitPrice: '1.235', supplyAmount: '1.24', vatAmount: '0.1', totalAmount: '1.340' });
      const input = { orderDt: '2026-10-27', deliveryDt: '2026-11-27', customerId: 10,
        salesDestinationId: 90, billingCustomerId: 11, details: [row] };
      expect(validateSalesOrderInput(input, policy).detailMessages).toEqual([]);
      expect(validateSalesOrderInput({ ...input, details: [{ ...row, vatAmount: '0.11' }] }, policy).detailMessages.join()).toContain('부가세');
    } finally { spy.mockRestore(); }
  });

  it('validates and transmits exact sales decimals without changing their digits', () => {
    const policy = {
      number: { places: 0, trailingZeros: 'FIXED' as const, rounding: 'DOWN' as const },
      decimal: { places: 6, trailingZeros: 'FIXED' as const, rounding: 'DOWN' as const },
      currency: { places: 6, trailingZeros: 'FIXED' as const, rounding: 'DOWN' as const },
    };
    const row = detailRow({
      orderQty: '1', unitPrice: '1234567890123.100001',
      supplyAmount: '1234567890123.100001', vatAmount: '123456789012.310000',
      totalAmount: '1358024679135.410001',
    });
    const input = {
      orderDt: '2026-10-27', deliveryDt: '2026-11-27', customerId: 10,
      salesDestinationId: 90, billingCustomerId: 11,
      quotNo: null, deliveryPlace: null, deliveryMethod: null, remark: null, details: [row],
    };
    expect(validateSalesOrderInput(input, policy).detailMessages).toEqual([]);
    expect(buildSalesOrderCreatePayload(input, policy).details[0].unitPrice).toBe('1234567890123.100001');
  });

  it('keeps exact decimal strings when a saved order is mapped back to the edit form', () => {
    const order = savedOrderItem();
    order.details[0] = { ...order.details[0], unitPrice: '1234567890123.100001',
      supplyAmt: '1234567890123.100001', vatAmt: '123456789012.310000',
      totalAmt: '1358024679135.410001' };
    const row = toSalesOrderForm(order).rows[0];
    expect(row.unitPrice).toBe('1234567890123.100001');
    expect(row.supplyAmount).toBe('1234567890123.100001');
    expect(row.vatAmount).toBe('123456789012.310000');
    expect(row.totalAmount).toBe('1358024679135.410001');
  });

  it('rejects missing header fields and incomplete detail rows', () => {
    const errors = validateSalesOrderInput({
      orderDt: '',
      deliveryDt: '',
      customerId: null,
      details: [],
    });

    expect(errors.orderDt).toBe('수주일자를 입력해 주세요.');
    expect(errors.deliveryDt).toBe('납기일자를 입력해 주세요.');
    expect(errors.customerId).toBe('거래처를 선택해 주세요.');
    expect(errors.details).toBe('품목 상세를 1건 이상 입력해 주세요.');
  });

  it('requires a selected material and positive quantity on every detail', () => {
    const errors = validateSalesOrderInput({
      orderDt: '2026-10-27',
      deliveryDt: '2026-11-27',
      customerId: 10,
      details: [detailRow({ materialId: null, orderQty: 0 })],
    });

    expect(errors.detailRows['line-1']).toContain('품목');
    expect(errors.detailRows['line-1']).toContain('수량');
  });

  it('collects detail validation messages once regardless of row count', () => {
    const errors = validateSalesOrderInput({
      orderDt: '2026-10-27',
      deliveryDt: '2026-11-27',
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
      salesDestinationId: 90,
      billingCustomerId: 11,
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
      salesDestinationId: 90,
      billingCustomerId: 11,
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
      salesDestinationId: 90,
      billingCustomerId: 11,
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
    expect(apiPostMock).toHaveBeenCalledWith('/api/v1/sales/orders', payload, expect.arrayContaining(['unitPrice']));

    apiPostMock.mockResolvedValue({});
    await expect(createSalesOrder(payload)).rejects.toThrow(
      '수주 저장 응답에 생성된 주문이 없습니다.',
    );
  });

  it('loads, updates and deletes an order by id', async () => {
    const order = savedOrderItem();
    apiGetExactMock.mockResolvedValue({ item: order } satisfies SalesOrderResponse);
    apiPutMock.mockResolvedValue({ item: order } satisfies SalesOrderResponse);
    apiDeleteMock.mockResolvedValue({ message: '삭제' });

    await expect(getSalesOrder(300)).resolves.toEqual(order);
    expect(apiGetExactMock).toHaveBeenCalledWith('/api/v1/sales/orders/300', expect.arrayContaining(['unitPrice']));

    const payload = buildSalesOrderCreatePayload({
      orderDt: '2026-10-27',
      customerId: 10,
      salesDestinationId: 90,
      billingCustomerId: 11,
      quotNo: null,
      deliveryDt: '',
      deliveryPlace: null,
      deliveryMethod: null,
      remark: null,
      details: [detailRow()],
    });
    await expect(updateSalesOrder(300, payload)).resolves.toEqual(order);
    expect(apiPutMock).toHaveBeenCalledWith('/api/v1/sales/orders/300', payload, expect.arrayContaining(['unitPrice']));

    await deleteSalesOrder(300);
    expect(apiDeleteMock).toHaveBeenCalledWith('/api/v1/sales/orders/300');

    apiGetExactMock.mockResolvedValue({});
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

  it('maps quotation options and limits the request to the selected customer', async () => {
    apiGetMock.mockResolvedValue({
      resultList: [{
        quotationId: 71,
        quotationNo: 'QT-20261116-0001',
        quotationDt: '2026-11-16',
        customerId: 10,
        customerCode: 'C-10',
        customerName: '거래처 10',
      }],
    });

    await expect(searchOrderQuotations(10, '거래처 10')).resolves.toEqual([
      {
        id: 71,
        code: 'QT-20261116-0001',
        name: '거래처 10',
        customerId: 10,
        details: [
          { label: '견적작성일', value: '2026-11-16' },
          { label: '거래처코드', value: 'C-10' },
        ],
      },
    ]);
    expect(apiGetMock).toHaveBeenCalledWith(
      '/api/v1/sales/quotations/options?customerId=10&keyword=%EA%B1%B0%EB%9E%98%EC%B2%98+10',
    );
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
