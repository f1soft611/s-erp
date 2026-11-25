import {
  apiDelete,
  apiGetWithExactDecimals,
  apiPostWithExactDecimals,
  apiPutWithExactDecimals,
} from '../../../../../shared/services/apiClient';
import type {
  SalesOrderCreateInput,
  SalesOrderCreatePayload,
  SalesOrderCreateResponse,
  SalesOrderCreated,
  SalesOrderForm,
  SalesOrderItem,
  SalesOrderResponse,
  SalesOrderValidationErrors,
} from '../types/salesOrder.types';
import { addExactSalesDecimals, isExactSalesPolicyNumber, multiplyExactSalesDecimals } from '../data/salesOrderAmounts';
import { compareGridExactDecimals } from '../../../../../shared/components/f1-grid/utils/gridExactDecimal';
import type { SalesOrderDecimalValue } from '../data/salesOrderDetail';
import type { GridDecimalModuleRule } from '../../../../../shared/services/gridDecimalPolicy.service';
import { getDecimalColumnContract, resolveDecimalColumn } from '../../../../../shared/services/decimalColumnContract';

const SALES_ORDER_PATH = '/api/v1/sales/orders';
const ORDER_DECIMAL_FIELDS = ['orderQty', 'unitPrice', 'supplyAmt', 'vatAmt', 'totalAmt', 'shippedQty'] as const;

const MAX_NUMERIC_15_2 = 9_999_999_999_999.99;

export function validateSalesOrderInput(
  input: Pick<SalesOrderCreateInput, 'orderDt' | 'deliveryDt' | 'customerId' | 'salesDestinationId' | 'billingCustomerId' | 'details'>,
  policy?: GridDecimalModuleRule,
): SalesOrderValidationErrors {
  const errors: SalesOrderValidationErrors = { detailRows: {}, detailMessages: [] };
  const contract = getDecimalColumnContract('sales.order');
  const quantityRule = policy && resolveDecimalColumn(contract.orderQty, policy);
  const priceRule = policy && resolveDecimalColumn(contract.unitPrice, policy);
  const supplyRule = policy && resolveDecimalColumn(contract.supplyAmount, policy);
  const vatRule = policy && resolveDecimalColumn(contract.vatAmount, policy);
  const totalRule = policy && resolveDecimalColumn(contract.totalAmount, policy);
  const quantityValid = (value: SalesOrderDecimalValue) => quantityRule
    ? isExactSalesPolicyNumber(String(value), quantityRule.places) : isNumeric15_2(Number(value));
  const amountValid = (value: SalesOrderDecimalValue, places?: number) => places !== undefined
    ? isExactSalesPolicyNumber(String(value), places) : isNumeric15_2(Number(value));
  const priceValid = (value: SalesOrderDecimalValue) => priceRule
    ? isExactSalesPolicyNumber(String(value), priceRule.places) : isNumeric15_2(Number(value));

  if (!input.orderDt.trim()) {
    errors.orderDt = '수주일자를 입력해 주세요.';
  }
  if (!input.deliveryDt?.trim()) {
    errors.deliveryDt = '납기일자를 입력해 주세요.';
  }
  if (
    input.customerId == null ||
    !Number.isSafeInteger(input.customerId) ||
    input.customerId < 1
  ) {
    errors.customerId = '거래처를 선택해 주세요.';
  }
  if (!Number.isSafeInteger(input.salesDestinationId) || (input.salesDestinationId ?? 0) < 1) {
    errors.salesDestinationId = '납품처를 선택해 주세요.';
  }
  if (!Number.isSafeInteger(input.billingCustomerId) || (input.billingCustomerId ?? 0) < 1) {
    errors.billingCustomerId = '매출처를 선택해 주세요.';
  }
  if (input.details.length === 0) {
    errors.details = '품목 상세를 1건 이상 입력해 주세요.';
  }

  for (const row of input.details) {
    const messages: string[] = [];
    if (
      row.materialId == null ||
      !Number.isSafeInteger(row.materialId) ||
      row.materialId < 1
    ) {
      messages.push('품목을 선택해 주세요.');
    }
    if (!quantityValid(row.orderQty) || Number(row.orderQty) <= 0) {
      messages.push('주문수량은 0보다 큰 유효한 값이어야 합니다.');
    }
    if (!priceValid(row.unitPrice) || Number(row.unitPrice) < 0) {
      messages.push('단가는 0 이상의 유효한 값이어야 합니다.');
    }
    if (!amountValid(row.vatAmount, vatRule?.places) || Number(row.vatAmount) < 0) {
      messages.push('부가세는 0 이상의 유효한 값이어야 합니다.');
    }
    if (
      !amountValid(row.supplyAmount, supplyRule?.places) ||
      !amountValid(row.totalAmount, totalRule?.places)
    ) {
      messages.push('계산된 금액이 허용 범위를 초과했습니다.');
    }
    if (supplyRule && totalRule && quantityValid(row.orderQty) && priceValid(row.unitPrice) && amountValid(row.vatAmount, vatRule?.places)) {
      try {
        const supply = multiplyExactSalesDecimals(String(row.orderQty), String(row.unitPrice), supplyRule);
        const total = addExactSalesDecimals(supply, String(row.vatAmount), totalRule);
        if (compareGridExactDecimals(row.supplyAmount, supply) !== 0 ||
          compareGridExactDecimals(row.totalAmount, total) !== 0) {
          messages.push('현재 정책에 맞게 금액을 재계산해 주세요.');
        }
      } catch {
        messages.push('계산된 금액이 허용 범위 또는 정밀도를 초과했습니다.');
      }
    }
    if (messages.length > 0) {
      errors.detailRows[row.rowId] = messages.join(' ');
      messages.forEach((message) => {
        if (!errors.detailMessages.includes(message)) {
          errors.detailMessages.push(message);
        }
      });
    }
  }

  return errors;
}

export function buildSalesOrderCreatePayload(
  input: SalesOrderCreateInput,
  decimalPolicy?: GridDecimalModuleRule,
): SalesOrderCreatePayload {
  if (input.customerId == null) {
    throw new Error('거래처를 선택해 주세요.');
  }
  if (input.salesDestinationId == null) throw new Error('납품처를 선택해 주세요.');
  if (input.billingCustomerId == null) throw new Error('매출처를 선택해 주세요.');
  const details = input.details.map((row) => {
    if (row.materialId == null) {
      throw new Error('모든 상세 행의 품목을 선택해 주세요.');
    }
    return {
      materialId: row.materialId,
      orderQty: row.orderQty,
      unitPrice: row.unitPrice,
      vatAmt: row.vatAmount,
      deliveryDt: row.deliveryDt || null,
    };
  });

  return {
    ...(decimalPolicy ? { decimalPolicy, decimalColumns: getDecimalColumnContract('sales.order') } : {}),
    orderDt: input.orderDt,
    customerId: input.customerId,
    salesDestinationId: input.salesDestinationId,
    billingCustomerId: input.billingCustomerId,
    quotNo: toNullableText(input.quotNo),
    deliveryDt: input.deliveryDt || null,
    deliveryPlace: toNullableText(input.deliveryPlace),
    deliveryMethod: toNullableText(input.deliveryMethod),
    remark: toNullableText(input.remark),
    details,
  };
}

export async function createSalesOrder(
  payload: SalesOrderCreatePayload,
): Promise<SalesOrderCreated> {
  const response = await apiPostWithExactDecimals<SalesOrderCreateResponse>(
    SALES_ORDER_PATH,
    payload,
    ORDER_DECIMAL_FIELDS,
  );
  if (response.item == null) {
    throw new Error('수주 저장 응답에 생성된 주문이 없습니다.');
  }
  return response.item;
}

export async function getSalesOrder(salesOrderId: number): Promise<SalesOrderItem> {
  const response = await apiGetWithExactDecimals<SalesOrderResponse>(
    `${SALES_ORDER_PATH}/${salesOrderId}`,
    ORDER_DECIMAL_FIELDS,
  );
  if (response.item == null) {
    throw new Error('수주 조회 응답에 수주 정보가 없습니다.');
  }
  return response.item;
}

export async function updateSalesOrder(
  salesOrderId: number,
  payload: SalesOrderCreatePayload,
): Promise<SalesOrderItem> {
  const response = await apiPutWithExactDecimals<SalesOrderResponse>(
    `${SALES_ORDER_PATH}/${salesOrderId}`,
    payload,
    ORDER_DECIMAL_FIELDS,
  );
  if (response.item == null) {
    throw new Error('수주 수정 응답에 수주 정보가 없습니다.');
  }
  return response.item;
}

export async function deleteSalesOrder(salesOrderId: number): Promise<void> {
  await apiDelete<unknown>(`${SALES_ORDER_PATH}/${salesOrderId}`);
}

export function toSalesOrderForm(order: SalesOrderItem): SalesOrderForm {
  return {
    customer: {
      id: order.customerId,
      code: order.customerCode ?? '',
      name: order.customerName ?? '',
    },
    destination: order.salesDestinationId == null ? null : {
      id: order.salesDestinationId,
      code: order.destinationCode ?? '',
      name: order.destinationName ?? '',
    },
    billingCustomer: order.billingCustomerId == null ? null : {
      id: order.billingCustomerId,
      code: order.billingCustomerCode ?? '',
      name: order.billingCustomerName ?? '',
    },
    header: {
      orderDt: order.orderDt,
      quotNo: order.quotNo ?? '',
      deliveryDt: order.deliveryDt ?? '',
      deliveryPlace: order.deliveryPlace ?? '',
      deliveryMethod: order.deliveryMethod ?? '',
      remark: order.remark ?? '',
    },
    rows: order.details.map((detail) => ({
      rowId: `order-line-${detail.salesOrderDetailId}`,
      materialId: detail.materialId,
      materialCode: detail.materialCode ?? '',
      materialName: detail.materialName ?? '',
      orderQty: detail.orderQty,
      unitPrice: detail.unitPrice,
      supplyAmount: detail.supplyAmt,
      vatAmount: detail.vatAmt ?? 0,
      totalAmount: detail.totalAmt,
      deliveryDt: detail.deliveryDt ?? '',
      shippedQty: detail.shippedQty ?? 0,
      lineStatus: detail.lineStatus ?? '',
    })),
  };
}

function isNumeric15_2(value: number): boolean {
  return Number.isFinite(value) && Math.abs(value) <= MAX_NUMERIC_15_2;
}

function toNullableText(value: string | null): string | null {
  const normalized = value?.trim() ?? '';
  return normalized || null;
}
