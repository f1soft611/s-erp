import { apiPost } from '../../../../../shared/services/apiClient';
import type {
  SalesOrderCreateInput,
  SalesOrderCreatePayload,
  SalesOrderCreateResponse,
  SalesOrderCreated,
  SalesOrderValidationErrors,
} from '../types/salesOrder.types';

const MAX_NUMERIC_15_2 = 9_999_999_999_999.99;

export function validateSalesOrderInput(
  input: Pick<SalesOrderCreateInput, 'orderDt' | 'customerId' | 'details'>,
): SalesOrderValidationErrors {
  const errors: SalesOrderValidationErrors = { detailRows: {} };

  if (!input.orderDt.trim()) {
    errors.orderDt = '수주일자를 입력해 주세요.';
  }
  if (
    input.customerId == null ||
    !Number.isSafeInteger(input.customerId) ||
    input.customerId < 1
  ) {
    errors.customerId = '거래처를 선택해 주세요.';
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
    if (!isNumeric15_2(row.orderQty) || row.orderQty <= 0) {
      messages.push('주문수량은 0보다 큰 유효한 값이어야 합니다.');
    }
    if (!isNumeric15_2(row.unitPrice) || row.unitPrice < 0) {
      messages.push('단가는 0 이상의 유효한 값이어야 합니다.');
    }
    if (!isNumeric15_2(row.vatAmount) || row.vatAmount < 0) {
      messages.push('부가세는 0 이상의 유효한 값이어야 합니다.');
    }
    if (
      !isNumeric15_2(row.supplyAmount) ||
      !isNumeric15_2(row.totalAmount)
    ) {
      messages.push('계산된 금액이 허용 범위를 초과했습니다.');
    }
    if (messages.length > 0) {
      errors.detailRows[row.rowId] = messages.join(' ');
    }
  }

  return errors;
}

export function buildSalesOrderCreatePayload(
  input: SalesOrderCreateInput,
): SalesOrderCreatePayload {
  if (input.customerId == null) {
    throw new Error('거래처를 선택해 주세요.');
  }
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
    orderDt: input.orderDt,
    customerId: input.customerId,
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
  const response = await apiPost<SalesOrderCreateResponse>(
    '/api/v1/sales/orders',
    payload,
  );
  if (response.item == null) {
    throw new Error('수주 저장 응답에 생성된 주문이 없습니다.');
  }
  return response.item;
}

function isNumeric15_2(value: number): boolean {
  return Number.isFinite(value) && Math.abs(value) <= MAX_NUMERIC_15_2;
}

function toNullableText(value: string | null): string | null {
  const normalized = value?.trim() ?? '';
  return normalized || null;
}
