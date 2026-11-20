import { apiGet, apiPost } from '../../../../../shared/services/apiClient';
import type { ItemPriceOverviewFilters, ItemPriceOverviewRow, ItemPriceSideKey } from '../types/itemPriceOverview.types';
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

function nullableNumber(value: unknown, label: string): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${label} 응답을 확인할 수 없습니다.`);
  return parsed;
}

function nullableId(value: unknown, label: string): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${label} 응답을 확인할 수 없습니다.`);
  return parsed;
}

function emptySide(side: ItemPriceSideKey): Partial<ItemPriceOverviewRow> {
  return {
    [`${side}PriceId`]: null,
    [`${side}UnitPrice`]: null,
    [`${side}TaxType`]: 'TAXABLE',
    [`${side}VatIncludedAt`]: 'N',
    [`${side}ForeignUnitPrice`]: null,
    [`${side}Currency`]: '',
    [`${side}Moq`]: null,
    [`${side}StartDt`]: '',
    [`${side}EndDt`]: null,
    [`${side}Status`]: '',
    [`${side}OrderType`]: '',
    [`${side}OrderTypeName`]: '',
    [`${side}DefaultSupplier`]: false,
  };
}

function sideFields(side: ItemPriceSideKey, source: unknown): Partial<ItemPriceOverviewRow> {
  if (source == null) return emptySide(side);
  if (!isRecord(source)) throw new Error('단가 응답을 확인할 수 없습니다.');
  const status = source.priceStatus;
  if (status !== 'current' && status !== 'future') throw new Error('단가 적용 상태 응답을 확인할 수 없습니다.');
  const vat = source.vatIncludedAt == null ? 'N' : source.vatIncludedAt;
  if (vat !== 'Y' && vat !== 'N') throw new Error('부가세포함 응답을 확인할 수 없습니다.');
  const startDt = text(source.startDt, '적용 시작일');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDt)) throw new Error('적용 시작일 응답을 확인할 수 없습니다.');
  return {
    [`${side}PriceId`]: nullableId(source.priceId, '단가 ID'),
    [`${side}UnitPrice`]: nullableNumber(source.unitPrice, '원화단가'),
    [`${side}TaxType`]: text(source.taxType, '부가세구분') || 'TAXABLE',
    [`${side}VatIncludedAt`]: vat,
    [`${side}ForeignUnitPrice`]: nullableNumber(source.foreignUnitPrice, '외화단가'),
    [`${side}Currency`]: text(source.currency, '통화'),
    [`${side}Moq`]: nullableNumber(source.moq, '최소주문수량'),
    [`${side}StartDt`]: startDt,
    [`${side}EndDt`]: source.endDt == null || source.endDt === '' ? null : text(source.endDt, '적용 종료일'),
    [`${side}Status`]: status,
    [`${side}OrderType`]: text(source.orderType, '발주구분'),
    [`${side}OrderTypeName`]: text(source.orderTypeName, '발주구분명'),
    [`${side}DefaultSupplier`]: source.defaultSupplier === true,
  };
}

export function normalizeItemPriceOverviewRow(source: ApiRecord): ItemPriceOverviewRow {
  const rowId = text(source.rowId, '행 ID');
  if (!rowId) throw new Error('행 ID 응답을 확인할 수 없습니다.');
  const parentId = source.parentId == null || source.parentId === '' ? null : text(source.parentId, '부모 행 ID');
  const materialCode = text(source.materialCode, '품목코드');
  const materialName = text(source.materialName, '품목명');
  const customerCode = text(source.customerCode, '거래처코드');
  const customerName = text(source.customerName, '거래처명');
  const specialCount = Number(source.specialCount ?? 0);
  if (!Number.isSafeInteger(specialCount) || specialCount < 0) {
    throw new Error('특별단가 건수 응답을 확인할 수 없습니다.');
  }
  return {
    rowId,
    parentId,
    materialId: nullableId(source.materialId, '품목 ID'),
    materialCode,
    materialName,
    materialSpec: text(source.materialSpec, '규격'),
    materialUnit: text(source.materialUnit, '단위'),
    customerId: nullableId(source.customerId, '거래처 ID'),
    customerCode,
    customerName,
    displayName: parentId === null ? `${materialCode} · ${materialName}` : customerName,
    specialCount,
    specialLabel: parentId === null && specialCount > 0 ? `특별 ${specialCount}건` : '',
    defaultSupplierId: nullableId(source.defaultSupplierId, '기본 거래처 ID'),
    defaultSupplierName: text(source.defaultSupplierName, '기본 거래처명'),
    ...emptySide('purchase'),
    ...emptySide('sales'),
    ...sideFields('purchase', source.purchase),
    ...sideFields('sales', source.sales),
  } as ItemPriceOverviewRow;
}

export async function fetchItemPriceOverview(
  filters: ItemPriceOverviewFilters = {},
): Promise<ItemPriceOverviewRow[]> {
  const query = new URLSearchParams();
  if (filters.keyword?.trim()) query.set('keyword', filters.keyword.trim());
  if (filters.priceFilter && filters.priceFilter !== 'ALL') query.set('priceFilter', filters.priceFilter);
  if (filters.effectiveOn?.trim()) query.set('effectiveOn', filters.effectiveOn.trim());
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
