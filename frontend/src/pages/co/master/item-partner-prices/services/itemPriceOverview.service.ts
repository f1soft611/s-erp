import { apiGet, apiPost } from '../../../../../shared/services/apiClient';
import type { ItemPriceOverviewFilters, ItemPriceOverviewRow } from '../types/itemPriceOverview.types';
import type { ItemPartnerPriceBatchPayload, ItemPartnerPriceBatchSaveInfo } from '../types/itemPartnerPrice.types';

type ApiRecord = Record<string, unknown>;

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown, label: string): string {
  if (value == null) return '';
  if (typeof value !== 'string') throw new Error(`${label} 응답을 확인할 수 없습니다.`);
  return value;
}

function nullableId(value: unknown, label: string): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${label} 응답을 확인할 수 없습니다.`);
  return parsed;
}

export function normalizeItemPriceOverviewRow(source: ApiRecord): ItemPriceOverviewRow {
  const materialId = nullableId(source.materialId, '품목 ID');
  if (materialId === null) throw new Error('품목 ID 응답을 확인할 수 없습니다.');
  const customerCount = Number(source.customerCount ?? 0);
  if (!Number.isSafeInteger(customerCount) || customerCount < 0) {
    throw new Error('거래처 수 응답을 확인할 수 없습니다.');
  }
  return {
    materialId,
    materialCode: text(source.materialCode, '품목코드'),
    materialName: text(source.materialName, '품목명'),
    materialSpec: text(source.materialSpec, '규격'),
    materialUnit: text(source.materialUnit, '단위'),
    materialTypeCode: text(source.materialTypeCode, '품목 계정분류'),
    customerCount,
    defaultSupplierId: nullableId(source.defaultSupplierId, '기본 거래처 ID'),
    defaultSupplierName: text(source.defaultSupplierName, '기본 거래처명'),
  };
}

export async function fetchItemPriceOverview(
  filters: ItemPriceOverviewFilters = {},
): Promise<ItemPriceOverviewRow[]> {
  const query = new URLSearchParams();
  if (filters.tradeType) query.set('tradeType', filters.tradeType);
  if (filters.keyword?.trim()) query.set('keyword', filters.keyword.trim());
  if (filters.priceFilter && filters.priceFilter !== 'ALL') query.set('priceFilter', filters.priceFilter);
  if (filters.itemTypes?.trim()) query.set('itemTypes', filters.itemTypes.trim());
  const result = await apiGet<{ resultList?: unknown }>(
    `/api/v1/co/master/item-partner-prices/overview${query.size ? `?${query}` : ''}`,
  );
  if (!Array.isArray(result.resultList) || !result.resultList.every(isRecord)) {
    throw new Error('품목 기준 단가 응답을 확인할 수 없습니다.');
  }
  return result.resultList.map(normalizeItemPriceOverviewRow);
}

/** 변경 집합을 기존 일괄 저장 API로 보낸다. 저장 뒤에는 목록을 다시 조회해 화면을 맞춘다. */
export async function saveItemPriceOverviewBatch(
  payload: ItemPartnerPriceBatchPayload,
): Promise<ItemPartnerPriceBatchSaveInfo> {
  const result = await apiPost<{ item?: { clearedDefaultMaterialIds?: unknown } }>(
    '/api/v1/co/master/item-partner-prices/save-batch', payload,
  );
  const cleared = result?.item?.clearedDefaultMaterialIds;
  return {
    clearedDefaultMaterialIds: Array.isArray(cleared)
      ? cleared.map(Number).filter((id) => Number.isSafeInteger(id) && id > 0) : [],
  };
}
