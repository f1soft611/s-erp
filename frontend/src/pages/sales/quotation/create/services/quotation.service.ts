import { apiDelete, apiGet, apiPost, apiPut } from '../../../../../shared/services/apiClient';
import type {
  QuotationCreateInput,
  QuotationCreatePayload,
  QuotationCreateResponse,
  QuotationForm,
  QuotationItem,
  QuotationResponse,
  QuotationValidationErrors,
} from '../types/quotation.types';

const QUOTATION_PATH = '/api/v1/sales/quotations';
const MAX_NUMERIC_15_2 = 9_999_999_999_999.99;

export function validateQuotationInput(input: QuotationCreateInput): QuotationValidationErrors {
  const errors: QuotationValidationErrors = { detailRows: {}, detailMessages: [] };
  if (!input.quotationDt.trim()) errors.quotationDt = '견적작성일을 입력해 주세요.';
  if (input.customerId == null || !Number.isSafeInteger(input.customerId) || input.customerId < 1) {
    errors.customerId = '거래처를 선택해 주세요.';
  }
  if (input.details.length === 0) errors.details = '견적 상세를 1건 이상 입력해 주세요.';

  input.details.forEach((row) => {
    const messages: string[] = [];
    if (!row.materialName.trim()) messages.push('품목명을 입력해 주세요.');
    if (!isNumeric15_2(row.quotationQty) || row.quotationQty <= 0) {
      messages.push('견적수량은 0보다 큰 유효한 값이어야 합니다.');
    }
    if (!isNumeric15_2(row.unitPrice) || row.unitPrice < 0) {
      messages.push('견적단가는 0 이상의 유효한 값이어야 합니다.');
    }
    if (!isNumeric15_2(row.lineAmt) || row.lineAmt < 0) {
      messages.push('계산된 견적금액이 허용 범위를 초과했습니다.');
    }
    if (messages.length) {
      errors.detailRows[row.rowId] = messages.join(' ');
      messages.forEach((message) => {
        if (!errors.detailMessages.includes(message)) errors.detailMessages.push(message);
      });
    }
  });
  return errors;
}

export function buildQuotationPayload(input: QuotationCreateInput): QuotationCreatePayload {
  if (input.customerId == null) throw new Error('거래처를 선택해 주세요.');
  return {
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
  const response = await apiPost<QuotationCreateResponse>(QUOTATION_PATH, payload);
  if (!response.item) throw new Error('견적 저장 응답에 생성된 견적이 없습니다.');
  return response.item;
}

export async function getQuotation(quotationId: number): Promise<QuotationItem> {
  const response = await apiGet<QuotationResponse>(`${QUOTATION_PATH}/${quotationId}`);
  if (!response.item) throw new Error('견적 조회 응답에 견적 정보가 없습니다.');
  return response.item;
}

export async function updateQuotation(
  quotationId: number,
  payload: QuotationCreatePayload,
): Promise<QuotationItem> {
  const response = await apiPut<QuotationResponse>(`${QUOTATION_PATH}/${quotationId}`, payload);
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
      quotationQty: Number(detail.quotationQty),
      unitPrice: Number(detail.unitPrice),
      lineAmt: Number(detail.lineAmt),
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
