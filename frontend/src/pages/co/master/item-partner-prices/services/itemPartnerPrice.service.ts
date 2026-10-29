import { apiGet, apiPost } from '../../../../../shared/services/apiClient';
import {
  GridSaveReconciliationError,
  resolveSavedGridRows,
  type F1GridSavedRow,
} from '../../../../../shared/components/f1-grid';
import type {
  ItemPartnerPriceBatchPayload,
  ItemPartnerPriceFilters,
  ItemPartnerPriceImportRequestRow,
  ItemPartnerPriceImportValidation,
  ItemPartnerPriceImportValidationRow,
  ItemPartnerPriceRow,
} from '../types/itemPartnerPrice.types';

type ApiRecord = Record<string, unknown>;

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function positiveId(value: unknown, label: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} 응답을 확인할 수 없습니다.`);
  }
  return parsed;
}

function nullableNumber(value: unknown, label: string): number | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'number' && typeof value !== 'string') {
    throw new Error(`${label} 응답을 확인할 수 없습니다.`);
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} 응답을 확인할 수 없습니다.`);
  }
  return parsed;
}

function text(value: unknown, label: string): string {
  if (value == null) return '';
  if (typeof value !== 'string') throw new Error(`${label} 응답을 확인할 수 없습니다.`);
  return value;
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}

function normalizeTradeType(value: unknown): ItemPartnerPriceRow['tradeType'] {
  if (value === '매입' || value === '매출') return value;
  throw new Error('거래구분 응답을 확인할 수 없습니다.');
}

export function normalizeItemPartnerPriceRow(source: ApiRecord): ItemPartnerPriceRow {
  const tradeType = normalizeTradeType(source.tradeType);
  const useAt = source.useAt;
  if (useAt !== 'Y' && useAt !== 'N') throw new Error('사용여부 응답을 확인할 수 없습니다.');
  const materialId = positiveId(source.materialId, '품목 ID');
  const customerId = positiveId(source.customerId, '거래처 ID');
  const startDt = text(source.startDt, '적용 시작일');
  const endDt = source.endDt == null || source.endDt === ''
    ? null
    : text(source.endDt, '적용 종료일');
  if (!validDate(startDt) || endDt !== null &&
      (!validDate(endDt) || endDt < startDt)) {
    throw new Error('적용기간 응답을 확인할 수 없습니다.');
  }
  const currency = text(source.currency, '통화');
  if (currency.length > 10) throw new Error('통화 응답을 확인할 수 없습니다.');
  const result: ItemPartnerPriceRow = {
    priceId: positiveId(source.priceId, '단가 ID'),
    materialId,
    materialCode: text(source.materialCode, '품목코드'),
    materialName: text(source.materialName, '품목명'),
    customerId,
    customerCode: text(source.customerCode, '거래처코드'),
    customerName: text(source.customerName, '거래처명'),
    tradeType,
    unitPrice: nullableNumber(source.unitPrice, '단가'),
    currency,
    startDt,
    endDt,
    moq: nullableNumber(source.moq, '최소주문수량'),
    useAt,
  };
  if (result.unitPrice === null) throw new Error('단가 응답을 확인할 수 없습니다.');
  if (source.tenantId != null) result.tenantId = positiveId(source.tenantId, '테넌트 ID');
  for (const field of ['createdBy', 'createdAt', 'updatedBy', 'updatedAt'] as const) {
    if (source[field] != null) result[field] = text(source[field], field);
  }
  return result;
}

function priceRows(value: unknown): ItemPartnerPriceRow[] {
  if (!Array.isArray(value) || !value.every(isRecord)) {
    throw new Error('단가 목록 응답을 확인할 수 없습니다.');
  }
  return value.map(normalizeItemPartnerPriceRow);
}

export async function fetchItemPartnerPrices(
  filters: ItemPartnerPriceFilters = {},
): Promise<ItemPartnerPriceRow[]> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (typeof value === 'string' && value.trim()) query.set(key, value.trim());
  }
  const result = await apiGet<{ resultList?: unknown }>(
    `/api/v1/co/master/item-partner-prices${query.size ? `?${query}` : ''}`,
  );
  return priceRows(result.resultList);
}

function normalizeImportValidationRow(
  value: unknown,
  expectedSourceRow: number,
): ItemPartnerPriceImportValidationRow {
  if (!isRecord(value) || value.sourceRowNumber !== expectedSourceRow ||
      !Array.isArray(value.errors)) {
    throw new Error('엑셀 단가 검증 응답을 확인할 수 없습니다.');
  }
  const errors = value.errors.map((error) => {
    if (!isRecord(error) || typeof error.code !== 'string' ||
        typeof error.message !== 'string') {
      throw new Error('엑셀 단가 검증 오류 응답을 확인할 수 없습니다.');
    }
    return { code: error.code, message: error.message };
  });
  const result: ItemPartnerPriceImportValidationRow = {
    sourceRowNumber: expectedSourceRow,
    errors,
  };
  for (const [field, label] of [
    ['materialId', '품목 ID'],
    ['customerId', '거래처 ID'],
  ] as const) {
    if (value[field] != null) result[field] = positiveId(value[field], label);
  }
  for (const field of ['materialCode', 'materialName', 'customerCode', 'customerName'] as const) {
    if (value[field] != null) result[field] = text(value[field], field);
  }
  if (!errors.length &&
      (!result.materialId || !result.customerId ||
        !result.materialCode || !result.materialName ||
        !result.customerCode || !result.customerName)) {
    throw new Error('정상 검증 행의 품목·거래처 응답이 누락되었습니다.');
  }
  return result;
}

export async function validateItemPartnerPriceImport(
  rows: ItemPartnerPriceImportRequestRow[],
): Promise<ItemPartnerPriceImportValidation> {
  if (!rows.length || rows.length > 1000) {
    throw new Error('엑셀 검증 행은 1~1,000개여야 합니다.');
  }
  const result = await apiPost<{ item?: { rows?: unknown } }>(
    '/api/v1/co/master/item-partner-prices/validate-import',
    { rows },
  );
  if (!Array.isArray(result.item?.rows) || result.item.rows.length !== rows.length) {
    throw new Error('엑셀 단가 검증 응답을 확인할 수 없습니다.');
  }
  return {
    rows: result.item.rows.map((row, index) =>
      normalizeImportValidationRow(row, rows[index].sourceRowNumber)),
  };
}

export async function saveItemPartnerPriceRows(
  payload: ItemPartnerPriceBatchPayload,
  requested: ItemPartnerPriceRow[],
): Promise<F1GridSavedRow<ItemPartnerPriceRow>[]> {
  const result = await apiPost<{
    item?: { prices?: unknown; rowIdMappings?: unknown };
  }>('/api/v1/co/master/item-partner-prices/save-batch', payload);
  try {
    return resolveSavedGridRows(
      requested,
      priceRows(result.item?.prices),
      result.item?.rowIdMappings,
      'priceId',
    );
  } catch (cause) {
    throw new GridSaveReconciliationError(cause);
  }
}
