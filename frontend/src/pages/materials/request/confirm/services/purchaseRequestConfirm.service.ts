import { apiGet, apiPost, apiPut } from '../../../../../shared/services/apiClient';
import type { MasterPickerSearch } from '../../../../../shared/components/master-picker/masterPicker.types';
import {
  fetchCommonCodeGroups,
  fetchCommonCodeItems,
} from '../../../../co/master/common-code/services/commonCodeManagement.service';
import { fetchCustomers } from '../../../../co/master/customers/services/customerManagement.service';
import { fetchWarehouses } from '../../../../co/master/warehouse/services/warehouseManagement.service';
import { calculateAmount, type PurchaseRequestConfirmRow } from '../data/purchaseRequestConfirmColumns';
import type {
  ConfirmSelectOption,
  PurchaseConfirmItem,
  PurchaseConfirmListItem,
  PurchaseConfirmStatusFilter,
  PurchaseRequestConfirmCandidate,
  PurchaseRequestConfirmDetail,
  PurchaseRequestConfirmPayload,
  PurchaseRequestOrderClosePayload,
  PurchaseUnitPrice,
} from '../types/purchaseRequestConfirm.types';

type ItemResult = { item?: PurchaseConfirmItem | null };

const CONFIRM_PATH = '/api/v1/materials/purchase-request-confirms';
const ORDER_TYPE_GROUP_CODE = 'PURCHASE_ORDER_TYPE';
export const DEFAULT_CURRENCY = 'KRW';
export const DEFAULT_TAX_TYPE = 'TAXABLE';

function requireItem(result: ItemResult): PurchaseConfirmItem {
  if (!result.item) throw new Error('구매요청확정 응답에 확정 정보가 없습니다.');
  return result.item;
}

/** 확정 대상 품목 행 목록(요청·부분확정 요청의 확정 안 된 행) */
type DateRange = { fromDt?: string; toDt?: string };

function setDateRange(query: URLSearchParams, range?: DateRange) {
  if (range?.fromDt) query.set('fromDt', range.fromDt);
  if (range?.toDt) query.set('toDt', range.toDt);
}

/** 요청일 기간(선택)과 검색어로 확정 대상 구매요청 품목을 조회한다. */
export async function searchConfirmCandidates(keyword: string, range?: DateRange): Promise<PurchaseRequestConfirmCandidate[]> {
  const query = new URLSearchParams();
  if (keyword.trim()) query.set('keyword', keyword.trim());
  setDateRange(query, range);
  const suffix = query.toString() ? `?${query}` : '';
  const result = await apiGet<{ resultList?: PurchaseRequestConfirmCandidate[] }>(`${CONFIRM_PATH}/candidates${suffix}`);
  return Array.isArray(result.resultList) ? result.resultList : [];
}

/**
 * 고른 품목 행(상세 행 ID)의 상세 정보. 확정되지 않은 행에는 서버가 품목의 기본 거래처와 그 단가·발주구분을 채워 준다.
 * baseDt(단가 기준일)를 생략하면 서버 오늘 날짜를 쓴다.
 */
export async function fetchRequestDetails(
  purchaseRequestDetailIds: number[],
  baseDt?: string,
): Promise<PurchaseRequestConfirmDetail[]> {
  const query = new URLSearchParams({ purchaseRequestDetailIds: purchaseRequestDetailIds.join(',') });
  if (baseDt) query.set('baseDt', baseDt);
  const result = await apiGet<{ resultList?: PurchaseRequestConfirmDetail[] }>(`${CONFIRM_PATH}/request-details?${query}`);
  return Array.isArray(result.resultList) ? result.resultList : [];
}

export async function searchPurchaseConfirms(
  keyword: string,
  status: PurchaseConfirmStatusFilter,
  range?: DateRange,
): Promise<PurchaseConfirmListItem[]> {
  const query = new URLSearchParams();
  if (keyword.trim()) query.set('keyword', keyword.trim());
  query.set('status', status);
  setDateRange(query, range);
  const result = await apiGet<{ resultList?: PurchaseConfirmListItem[] }>(`${CONFIRM_PATH}?${query}`);
  return Array.isArray(result.resultList) ? result.resultList : [];
}

export async function getPurchaseConfirm(purchaseConfirmId: number): Promise<PurchaseConfirmItem> {
  return requireItem(await apiGet<ItemResult>(`${CONFIRM_PATH}/${purchaseConfirmId}`));
}

export async function createPurchaseConfirm(payload: PurchaseRequestConfirmPayload): Promise<PurchaseConfirmItem> {
  return requireItem(await apiPost<ItemResult>(CONFIRM_PATH, payload));
}

export async function savePurchaseConfirmOrderClose(
  purchaseConfirmId: number,
  payload: PurchaseRequestOrderClosePayload,
): Promise<PurchaseConfirmItem> {
  return requireItem(await apiPut<ItemResult>(`${CONFIRM_PATH}/${purchaseConfirmId}/order-close`, payload));
}

export async function cancelPurchaseConfirm(purchaseConfirmId: number): Promise<PurchaseConfirmItem> {
  return requireItem(await apiPost<ItemResult>(`${CONFIRM_PATH}/${purchaseConfirmId}/cancel`, {}));
}

/** 단가관리의 거래구분 매입 유효 단가. 없으면 null. */
export async function fetchDefaultUnitPrice(
  materialId: number,
  supplierId: number,
  baseDt: string,
): Promise<PurchaseUnitPrice | null> {
  const query = new URLSearchParams({
    materialId: String(materialId),
    supplierId: String(supplierId),
    baseDt,
  });
  const result = await apiGet<{ item?: PurchaseUnitPrice | null }>(`${CONFIRM_PATH}/unit-price?${query}`);
  return result.item ?? null;
}

export async function fetchWarehouseOptions(): Promise<ConfirmSelectOption[]> {
  const warehouses = await fetchWarehouses({ disuseAt: 'N', useAt: 'Y' });
  return warehouses.map((warehouse) => ({
    value: String(warehouse.warehouseId),
    label: warehouse.warehouseName,
  }));
}

async function fetchCodeOptions(groupCode: string): Promise<ConfirmSelectOption[]> {
  const groups = await fetchCommonCodeGroups();
  const group = groups.find((candidate) => candidate.groupCode === groupCode);
  if (!group) return [];
  const items = await fetchCommonCodeItems(group.id);
  return items
    .filter((codeItem) => codeItem.useAt === 'Y')
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((codeItem) => ({ value: codeItem.itemCode, label: codeItem.itemNm }));
}

export const fetchOrderTypeOptions = () => fetchCodeOptions(ORDER_TYPE_GROUP_CODE);
export const fetchTaxTypeOptions = () => fetchCodeOptions('PURCHASE_TAX_TYPE');
export async function fetchCurrencyOptions(): Promise<ConfirmSelectOption[]> {
  const options = await fetchCodeOptions('CURRENCY');
  // 기본 통화(KRW)가 공통코드에 없어도 선택 목록에서 사라지지 않게 한다.
  return options.some((option) => option.value === DEFAULT_CURRENCY)
    ? options
    : [{ value: DEFAULT_CURRENCY, label: DEFAULT_CURRENCY }, ...options];
}

export const searchSuppliers: MasterPickerSearch = async (keyword) => {
  const customers = await fetchCustomers({ keyword, useAt: 'Y' });
  return customers.map((customer) => {
    const id = Number(customer.customerId);
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error('거래처 ID 응답을 확인할 수 없습니다.');
    const details = [['사업자번호', customer.businessNo], ['대표자명', customer.presidentName]]
      .filter(([, value]) => typeof value === 'string' && value.trim())
      .map(([label, value]) => ({ label: String(label), value: String(value).trim() }));
    return {
      id,
      code: String(customer.customerCode ?? ''),
      name: String(customer.customerName ?? ''),
      ...(details.length ? { details } : {}),
    };
  });
};

/** 상세 행을 그리드 행으로 바꾼다. 신규 확정이면 확정수량·확정납기일 기본값을 요청값으로 채운다. */
export function toConfirmRows(details: PurchaseRequestConfirmDetail[], draft: boolean): PurchaseRequestConfirmRow[] {
  return details.map((detail) => {
    const confirmQty = detail.confirmQty ?? (draft ? Number(detail.requestQty) : null);
    const unitPrice = detail.unitPrice == null ? null : Number(detail.unitPrice);
    const currencyCode = detail.currencyCode ?? DEFAULT_CURRENCY;
    return {
      rowId: String(detail.purchaseRequestDetailId),
      purchaseRequestId: detail.purchaseRequestId,
      requestNo: detail.requestNo,
      requestDt: detail.requestDt,
      requesterName: detail.requesterName ?? '',
      purchaseRequestDetailId: detail.purchaseRequestDetailId,
      lineNo: detail.lineNo,
      materialId: detail.materialId,
      materialCode: detail.materialCode ?? '',
      materialName: detail.materialName ?? '',
      materialSpec: detail.materialSpec ?? '',
      unit: detail.unit ?? '',
      requestQty: Number(detail.requestQty),
      requestDeliveryDt: detail.requestDeliveryDt,
      useTypeName: detail.useTypeName ?? detail.useType,
      confirmQty: confirmQty == null ? null : Number(confirmQty),
      confirmDeliveryDt: detail.confirmDeliveryDt ?? (draft ? detail.requestDeliveryDt : ''),
      warehouseId: detail.warehouseId == null ? '' : String(detail.warehouseId),
      orderType: detail.orderType ?? '',
      supplierId: detail.supplierId,
      supplierCode: detail.supplierCode ?? '',
      supplierName: detail.supplierName ?? '',
      unitPrice,
      currencyCode,
      taxType: detail.taxType || DEFAULT_TAX_TYPE,
      vatIncludedAt: detail.vatIncludedAt === 'Y' ? 'Y' : 'N',
      // 요청 불러오기로 채운 기본 거래처 단가를 단가 선택(구매처 선택)과 같은 규칙으로 보관한다.
      wonUnitPrice: draft && unitPrice != null && currencyCode === DEFAULT_CURRENCY ? unitPrice : null,
      foreignUnitPrice: draft && detail.foreignUnitPrice != null ? Number(detail.foreignUnitPrice) : null,
      foreignCurrency: draft ? detail.foreignCurrency ?? '' : '',
      amount: draft ? calculateAmount(confirmQty, unitPrice) : detail.amount == null ? 0 : Number(detail.amount),
      confirmRemark: detail.confirmRemark ?? '',
      orderClosed: detail.orderCloseAt === 'Y',
    };
  });
}

/** 행 통화 목록(빈값은 KRW). 2개 이상이면 확정할 수 없다. */
export function distinctCurrencies(rows: PurchaseRequestConfirmRow[]): string[] {
  return [...new Set(rows.map((row) => row.currencyCode || DEFAULT_CURRENCY))].sort();
}

export function currencyMixMessage(currencies: string[]): string {
  return `통화가 다른 품목이 섞여 있습니다(${currencies.join(', ')}). 같은 통화 품목끼리 확정해 주세요.`;
}

export function validateConfirmInput(confirmDt: string, rows: PurchaseRequestConfirmRow[]): string[] {
  const messages: string[] = [];
  const add = (message: string) => {
    if (!messages.includes(message)) messages.push(message);
  };
  if (!confirmDt) add('확정일을 입력해 주세요.');
  if (rows.length === 0) add('확정할 구매요청 품목을 불러와 주세요.');
  for (const row of rows) {
    if (!(Number(row.confirmQty) > 0)) add('확정수량은 0보다 커야 합니다.');
    if (!row.confirmDeliveryDt) add('확정납기일을 입력해 주세요.');
    if (!row.warehouseId) add('입고창고를 선택해 주세요.');
    if (!row.orderType) add('발주구분을 선택해 주세요.');
    if (!row.supplierId) add('구매처를 선택해 주세요.');
    if (row.unitPrice != null && Number(row.unitPrice) < 0) add('단가는 0 이상이어야 합니다.');
    if (row.vatIncludedAt === 'Y' && row.taxType !== DEFAULT_TAX_TYPE) add('부가세 포함은 과세일 때만 선택할 수 있습니다.');
    if (row.confirmRemark.trim().length > 500) add('확정비고는 500자 이내로 입력해 주세요.');
  }
  return messages;
}

export function buildConfirmPayload(
  confirmDt: string,
  remark: string,
  rows: PurchaseRequestConfirmRow[],
): PurchaseRequestConfirmPayload {
  return {
    confirmDt,
    remark: remark.trim() ? remark.trim() : null,
    details: rows.map((row) => ({
      purchaseRequestDetailId: row.purchaseRequestDetailId,
      confirmQty: Number(row.confirmQty),
      confirmDeliveryDt: row.confirmDeliveryDt,
      warehouseId: Number(row.warehouseId),
      orderType: row.orderType,
      supplierId: Number(row.supplierId),
      unitPrice: row.unitPrice == null ? null : Number(row.unitPrice),
      currencyCode: row.currencyCode || DEFAULT_CURRENCY,
      taxType: row.taxType || DEFAULT_TAX_TYPE,
      vatIncludedAt: row.vatIncludedAt === 'Y' ? 'Y' : 'N',
      confirmRemark: row.confirmRemark.trim() ? row.confirmRemark.trim() : null,
    })),
  };
}

/** 저장된 값과 다른 행만 보낸다. */
export function buildOrderClosePayload(
  rows: PurchaseRequestConfirmRow[],
  baseline: PurchaseRequestConfirmRow[],
): PurchaseRequestOrderClosePayload {
  const saved = new Map(baseline.map((row) => [row.purchaseRequestDetailId, row.orderClosed]));
  return {
    details: rows
      .filter((row) => saved.get(row.purchaseRequestDetailId) !== row.orderClosed)
      .map((row) => ({ purchaseRequestDetailId: row.purchaseRequestDetailId, orderCloseAt: row.orderClosed ? 'Y' : 'N' })),
  };
}
