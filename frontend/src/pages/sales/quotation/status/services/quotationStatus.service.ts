import type { PageSearchFieldValue } from '../../../../../shared/components/page-search/searchFields';
import { apiGet } from '../../../../../shared/services/apiClient';
import type {
  QuotationStatusFilters,
  QuotationStatusListResponse,
  QuotationStatusRow,
  QuotationStatusSearchValues,
} from '../types/quotationStatus.types';

const QUOTATION_STATUS_PATH = '/api/v1/sales/quotation-status';

export function toQuotationStatusFilters(
  values: QuotationStatusSearchValues,
): QuotationStatusFilters {
  const quotationDt = readDateRange(values, 'quotationDt');
  const submitDt = readDateRange(values, 'submitDt');
  const filters: QuotationStatusFilters = {
    quotationDtFrom: quotationDt.from ?? '',
    quotationDtTo: quotationDt.to ?? '',
    submitDtFrom: submitDt.from,
    submitDtTo: submitDt.to,
    quotationNo: readText(values, 'quotationNo'),
    customerKeyword: readText(values, 'customerName'),
    materialKeyword: readText(values, 'materialName'),
  };
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== ''),
  ) as QuotationStatusFilters;
}

export function validateQuotationStatusRange(
  values: QuotationStatusSearchValues,
): string {
  const { from, to } = readDateRange(values, 'quotationDt');
  if (!isIsoDate(from) || !isIsoDate(to)) {
    return '견적작성일 시작일과 종료일을 입력해 주세요.';
  }
  if (from > to) return '견적작성일 시작일은 종료일보다 늦을 수 없습니다.';
  return '';
}

export async function searchQuotationStatus(
  filters: QuotationStatusFilters,
): Promise<QuotationStatusRow[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.append(key, value);
  });
  const query = params.toString();
  const response = await apiGet<QuotationStatusListResponse>(
    query ? `${QUOTATION_STATUS_PATH}?${query}` : QUOTATION_STATUS_PATH,
  );
  return response?.resultList ?? [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readText(values: QuotationStatusSearchValues, field: string): string | undefined {
  const value = values[field];
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  return String(value).trim() || undefined;
}

function readDateRange(values: QuotationStatusSearchValues, field: string) {
  const value = values[field];
  if (!isRecord(value)) return {};
  return {
    from: typeof value.from === 'string' ? value.from.trim() || undefined : undefined,
    to: typeof value.to === 'string' ? value.to.trim() || undefined : undefined,
  };
}

function isIsoDate(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value))
    && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value);
}

export function cloneQuotationStatusSearchValues(
  values: QuotationStatusSearchValues,
): QuotationStatusSearchValues {
  return Object.fromEntries(
    Object.entries(values).map(([field, value]) => [
      field,
      value !== null && typeof value === 'object' ? { ...value } : value,
    ]),
  );
}

export function isQuotationStatusSearchSession(
  value: unknown,
): value is { detailValues: QuotationStatusSearchValues } {
  if (!isRecord(value) || !isRecord(value.detailValues)) return false;
  const detailValues = value.detailValues as QuotationStatusSearchValues;
  const hasValidFields = Object.values(detailValues).every((item) => {
    if (item === null || typeof item === 'string' || typeof item === 'boolean') return true;
    if (typeof item === 'number') return Number.isFinite(item);
    if (!isRecord(item)) return false;
    return Object.keys(item).every((key) => key === 'from' || key === 'to')
      && (item.from === undefined || typeof item.from === 'string')
      && (item.to === undefined || typeof item.to === 'string');
  });
  return hasValidFields && !validateQuotationStatusRange(detailValues);
}

export type { PageSearchFieldValue };
