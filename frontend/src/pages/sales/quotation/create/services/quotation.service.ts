import { apiDelete, apiGetWithExactDecimals, apiPostWithExactDecimals, apiPutWithExactDecimals } from '../../../../../shared/services/apiClient';
import type {
  QuotationCreateInput,
  QuotationCreatePayload,
  QuotationCreateResponse,
  QuotationForm,
  QuotationItem,
  QuotationResponse,
  QuotationValidationErrors,
} from '../types/quotation.types';
import { isExactSalesPolicyNumber, multiplyExactSalesDecimals } from '../../../order/create/data/salesOrderAmounts';
import { compareGridExactDecimals } from '../../../../../shared/components/f1-grid/utils/gridExactDecimal';
import type { SalesOrderDecimalValue } from '../../../order/create/data/salesOrderDetail';
import type { GridDecimalModuleRule } from '../../../../../shared/services/gridDecimalPolicy.service';
import { getDecimalColumnContract, resolveDecimalColumn } from '../../../../../shared/services/decimalColumnContract';
import { calculateQuotationTotals } from '../data/quotationDetail';

const QUOTATION_PATH = '/api/v1/sales/quotations';
const QUOTATION_DECIMAL_FIELDS = ['quotationQty', 'unitPrice', 'lineAmt', 'supplyAmt', 'vatAmt', 'totalAmt'] as const;
const MAX_NUMERIC_15_2 = 9_999_999_999_999.99;

export function validateQuotationInput(input: QuotationCreateInput, policy?: GridDecimalModuleRule): QuotationValidationErrors {
  const errors: QuotationValidationErrors = { detailRows: {}, detailMessages: [] };
  const contract = getDecimalColumnContract('sales.quotation');
  const quantityRule = policy && resolveDecimalColumn(contract.quotationQty, policy);
  const priceRule = policy && resolveDecimalColumn(contract.unitPrice, policy);
  const amountRule = policy && resolveDecimalColumn(contract.lineAmt, policy);
  const quantityValid = (value: SalesOrderDecimalValue) => quantityRule ? isExactSalesPolicyNumber(String(value), quantityRule.places) : isNumeric15_2(Number(value));
  const amountValid = (value: SalesOrderDecimalValue) => amountRule ? isExactSalesPolicyNumber(String(value), amountRule.places) : isNumeric15_2(Number(value));
  const priceValid = (value: SalesOrderDecimalValue) => priceRule ? isExactSalesPolicyNumber(String(value), priceRule.places) : isNumeric15_2(Number(value));
  if (!input.quotationDt.trim()) errors.quotationDt = '견적작성일을 입력해 주세요.';
  if (input.customerId == null || !Number.isSafeInteger(input.customerId) || input.customerId < 1) {
    errors.customerId = '거래처를 선택해 주세요.';
  }
  if (input.details.length === 0) errors.details = '견적 상세를 1건 이상 입력해 주세요.';

  input.details.forEach((row) => {
    const messages: string[] = [];
    if (!row.materialName.trim()) messages.push('품목명을 입력해 주세요.');
    if (!quantityValid(row.quotationQty) || Number(row.quotationQty) <= 0) {
      messages.push('견적수량은 0보다 큰 유효한 값이어야 합니다.');
    }
    if (!priceValid(row.unitPrice) || Number(row.unitPrice) < 0) {
      messages.push('견적단가는 0 이상의 유효한 값이어야 합니다.');
    }
    if (!amountValid(row.lineAmt) || Number(row.lineAmt) < 0) {
      messages.push('계산된 견적금액이 허용 범위를 초과했습니다.');
    }
    if (amountRule && quantityValid(row.quotationQty) && priceValid(row.unitPrice)) {
      try {
        const amount = multiplyExactSalesDecimals(String(row.quotationQty), String(row.unitPrice), amountRule);
        if (compareGridExactDecimals(row.lineAmt, amount) !== 0) messages.push('현재 정책에 맞게 금액을 재계산해 주세요.');
      } catch {
        messages.push('계산된 견적금액이 허용 범위 또는 정밀도를 초과했습니다.');
      }
    }
    if (messages.length) {
      errors.detailRows[row.rowId] = messages.join(' ');
      messages.forEach((message) => {
        if (!errors.detailMessages.includes(message)) errors.detailMessages.push(message);
      });
    }
  });
  if (amountRule && policy && errors.detailMessages.length === 0) {
    try {
      calculateQuotationTotals(input.details.map((row) => ({ lineAmt: String(row.lineAmt) })),
        'places' in policy ? policy : policy.currency, policy);
    } catch {
      errors.detailMessages.push('견적 합계가 허용 범위를 초과했습니다.');
    }
  }
  return errors;
}

export function buildQuotationPayload(input: QuotationCreateInput, decimalPolicy?: GridDecimalModuleRule): QuotationCreatePayload {
  if (input.customerId == null) throw new Error('거래처를 선택해 주세요.');
  return {
    ...(decimalPolicy ? { decimalPolicy, decimalColumns: getDecimalColumnContract('sales.quotation') } : {}),
    quotationDt: input.quotationDt,
    submitDt: input.submitDt || null,
    customerId: input.customerId,
    customerReference: toNullableText(input.customerReference),
    incoterms: toNullableText(input.incoterms),
    paymentTerm: toNullableText(input.paymentTerm),
    validTerm: toNullableText(input.validTerm),
    currencyCode: toNullableText(input.currencyCode),
    remark: toNullableText(input.remark),
    details: input.details.map((row) => ({
      materialId: row.materialId,
      materialCode: toNullableText(row.materialCode),
      materialName: row.materialName.trim(),
      materialSpec: toNullableText(row.materialSpec),
      unit: toNullableText(row.unit),
      quotationQty: row.quotationQty,
      unitPrice: row.unitPrice,
      remark: toNullableText(row.remark),
    })),
  };
}

export async function createQuotation(payload: QuotationCreatePayload): Promise<QuotationItem> {
  const response = await apiPostWithExactDecimals<QuotationCreateResponse>(QUOTATION_PATH, payload, QUOTATION_DECIMAL_FIELDS);
  if (!response.item) throw new Error('견적 저장 응답에 생성된 견적이 없습니다.');
  return response.item;
}

export async function getQuotation(quotationId: number): Promise<QuotationItem> {
  const response = await apiGetWithExactDecimals<QuotationResponse>(`${QUOTATION_PATH}/${quotationId}`, QUOTATION_DECIMAL_FIELDS);
  if (!response.item) throw new Error('견적 조회 응답에 견적 정보가 없습니다.');
  return response.item;
}

export async function updateQuotation(
  quotationId: number,
  payload: QuotationCreatePayload,
): Promise<QuotationItem> {
  const response = await apiPutWithExactDecimals<QuotationResponse>(`${QUOTATION_PATH}/${quotationId}`, payload, QUOTATION_DECIMAL_FIELDS);
  if (!response.item) throw new Error('견적 수정 응답에 견적 정보가 없습니다.');
  return response.item;
}

export async function deleteQuotation(quotationId: number): Promise<void> {
  await apiDelete<unknown>(`${QUOTATION_PATH}/${quotationId}`);
}

export function toQuotationForm(quotation: QuotationItem): QuotationForm {
  return {
    customer: {
      id: quotation.customerId,
      code: quotation.customerCode ?? '',
      name: quotation.customerName ?? '',
    },
    header: {
      quotationDt: quotation.quotationDt,
      submitDt: quotation.submitDt ?? null,
      customerReference: quotation.customerReference ?? null,
      incoterms: quotation.incoterms ?? null,
      paymentTerm: quotation.paymentTerm ?? null,
      validTerm: quotation.validTerm ?? null,
      currencyCode: quotation.currencyCode ?? null,
      remark: quotation.remark ?? null,
    },
    rows: quotation.details.map((detail) => ({
      rowId: `quotation-line-${detail.quotationDetailId}`,
      materialId: detail.materialId,
      materialCode: detail.materialCode ?? '',
      materialName: detail.materialName ?? '',
      materialSpec: detail.materialSpec ?? '',
      unit: detail.unit ?? '',
      quotationQty: detail.quotationQty,
      unitPrice: detail.unitPrice,
      lineAmt: detail.lineAmt,
      remark: detail.remark ?? '',
    })),
  };
}

function isNumeric15_2(value: number): boolean {
  return Number.isFinite(value) && Math.abs(value) <= MAX_NUMERIC_15_2;
}

function toNullableText(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? '';
  return normalized || null;
}
