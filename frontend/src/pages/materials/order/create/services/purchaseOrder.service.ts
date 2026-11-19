import { apiGet, apiPost, apiPut } from '../../../../../shared/services/apiClient';
import {
  fetchCommonCodeGroups,
  fetchCommonCodeItems,
} from '../../../../co/master/common-code/services/commonCodeManagement.service';
import { calculateOrderAmounts, isTaxable } from '../data/purchaseOrderAmounts';
import { buildDiffNote, type PurchaseOrderRow } from '../data/purchaseOrderColumns';
import type {
  PurchaseOrderCandidate,
  PurchaseOrderDetailItem,
  PurchaseOrderItem,
  PurchaseOrderMaterialDefault,
  PurchaseOrderPayload,
  PurchaseOrderSelectOption,
  PurchaseOrderSourceType,
  PurchaseOrderTaxType,
} from '../types/purchaseOrder.types';

const ORDER_PATH = '/api/v1/materials/purchase-orders';
const TAX_TYPE_GROUP_CODE = 'PURCHASE_TAX_TYPE';
export const DEFAULT_CURRENCY = 'KRW';

export type CandidateSearch = { fromDt: string; toDt: string; keyword: string };

/** 발주 대상 확정 품목 행(잔량이 남은 행) */
export async function searchOrderCandidates(search: CandidateSearch): Promise<PurchaseOrderCandidate[]> {
  const query = new URLSearchParams();
  if (search.fromDt) query.set('fromDt', search.fromDt);
  if (search.toDt) query.set('toDt', search.toDt);
  if (search.keyword.trim()) query.set('keyword', search.keyword.trim());
  const suffix = query.toString() ? `?${query}` : '';
  const result = await apiGet<{ resultList?: PurchaseOrderCandidate[] }>(`${ORDER_PATH}/candidates${suffix}`);
  return Array.isArray(result.resultList) ? result.resultList : [];
}

export async function fetchMaterialDefault(materialId: number): Promise<PurchaseOrderMaterialDefault> {
  const result = await apiGet<{ item?: PurchaseOrderMaterialDefault | null }>(
    `${ORDER_PATH}/material-default?materialId=${materialId}`,
  );
  if (!result.item) throw new Error('품목 기본값 응답이 비어 있습니다.');
  return result.item;
}

export async function createPurchaseOrder(payload: PurchaseOrderPayload): Promise<PurchaseOrderItem> {
  const result = await apiPost<{ item?: PurchaseOrderItem | null }>(ORDER_PATH, payload);
  if (!result.item) throw new Error('발주 등록 응답에 발주 정보가 없습니다.');
  return result.item;
}

function requireOrder(result: { item?: PurchaseOrderItem | null }, label: string): PurchaseOrderItem {
  if (!result.item) throw new Error(`발주 ${label} 응답에 발주 정보가 없습니다.`);
  return result.item;
}

export async function getPurchaseOrder(purchaseOrderId: number): Promise<PurchaseOrderItem> {
  return requireOrder(await apiGet<{ item?: PurchaseOrderItem | null }>(`${ORDER_PATH}/${purchaseOrderId}`), '조회');
}

export async function updatePurchaseOrder(
  purchaseOrderId: number,
  payload: PurchaseOrderPayload,
): Promise<PurchaseOrderItem> {
  return requireOrder(
    await apiPut<{ item?: PurchaseOrderItem | null }>(`${ORDER_PATH}/${purchaseOrderId}`, payload),
    '수정',
  );
}

export type PurchaseOrderReceiptClosePayload = {
  details: { purchaseOrderDetailId: number; receiptCloseAt: 'Y' | 'N' }[];
};

/** 입고대기 마감 값만 저장한다. 수량·단가 등 다른 값은 보내지 않는다. */
export async function savePurchaseOrderReceiptClose(
  purchaseOrderId: number,
  payload: PurchaseOrderReceiptClosePayload,
): Promise<PurchaseOrderItem> {
  return requireOrder(
    await apiPut<{ item?: PurchaseOrderItem | null }>(`${ORDER_PATH}/${purchaseOrderId}/receipt-close`, payload),
    '입고대기마감 저장',
  );
}

/** 저장된 값과 다른 행의 마감 값만 보낸다. */
export function buildReceiptClosePayload(
  rows: PurchaseOrderRow[],
  baseline: PurchaseOrderRow[],
): PurchaseOrderReceiptClosePayload {
  const saved = new Map(baseline.map((row) => [row.purchaseOrderDetailId, row.receiptClosed]));
  return {
    details: rows
      .filter((row) => row.purchaseOrderDetailId !== null && saved.get(row.purchaseOrderDetailId) !== row.receiptClosed)
      .map((row) => ({
        purchaseOrderDetailId: row.purchaseOrderDetailId as number,
        receiptCloseAt: row.receiptClosed ? 'Y' as const : 'N' as const,
      })),
  };
}

export async function cancelPurchaseOrder(purchaseOrderId: number): Promise<PurchaseOrderItem> {
  return requireOrder(
    await apiPost<{ item?: PurchaseOrderItem | null }>(`${ORDER_PATH}/${purchaseOrderId}/cancel`, {}),
    '취소',
  );
}

/** 저장된 발주 행 → 그리드 행. 확정 기준값으로 "확정 대비" 문구를 계산한다. */
export function detailToRow(detail: PurchaseOrderDetailItem, supplierId: number | null): PurchaseOrderRow {
  const row: PurchaseOrderRow = {
    rowId: `order-${detail.purchaseOrderDetailId}`,
    purchaseOrderDetailId: detail.purchaseOrderDetailId,
    purchaseRequestDetailId: detail.purchaseRequestDetailId,
    confirmNo: detail.confirmNo ?? '',
    requestNo: detail.requestNo ?? '',
    materialId: detail.materialId,
    materialCode: detail.materialCode ?? '',
    materialName: detail.materialName ?? '',
    materialSpec: detail.materialSpec ?? '',
    unit: detail.unit ?? '',
    useTypeName: detail.useTypeName ?? detail.useType,
    confirmQty: detail.confirmQty == null ? null : Number(detail.confirmQty),
    remainQty: detail.remainQty == null ? null : Number(detail.remainQty),
    orderQty: Number(detail.orderQty),
    unitPrice: detail.unitPrice == null ? null : Number(detail.unitPrice),
    deliveryDt: detail.deliveryDt,
    warehouseId: String(detail.warehouseId),
    inspectAt: detail.inspectAt === 'Y',
    receiptClosed: detail.receiptCloseAt === 'Y',
    arrivedQty: detail.arrivedQty == null ? 0 : Number(detail.arrivedQty),
    supplyAmt: Number(detail.supplyAmt),
    vatAmt: Number(detail.vatAmt),
    totalAmt: Number(detail.totalAmt),
    stockQty: null,
    remark: detail.remark ?? '',
    confirmSupplierId: detail.confirmSupplierId,
    confirmUnitPrice: detail.confirmUnitPrice == null ? null : Number(detail.confirmUnitPrice),
    confirmDeliveryDt: detail.confirmDeliveryDt ?? '',
    confirmWarehouseId: detail.confirmWarehouseId == null ? '' : String(detail.confirmWarehouseId),
    diffNote: '',
  };
  return { ...row, diffNote: buildDiffNote(row, supplierId) };
}

/** 부가세구분 공통코드(PURCHASE_TAX_TYPE) 중 사용 중인 항목을 정렬 순서대로 조회한다. */
export async function fetchTaxTypeOptions(): Promise<PurchaseOrderSelectOption[]> {
  const groups = await fetchCommonCodeGroups();
  const group = groups.find((candidate) => candidate.groupCode === TAX_TYPE_GROUP_CODE);
  if (!group) return [];
  const items = await fetchCommonCodeItems(group.id);
  return items
    .filter((codeItem) => codeItem.useAt === 'Y')
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((codeItem) => ({ value: codeItem.itemCode, label: codeItem.itemNm }));
}

export function emptyRowDefaults(): Pick<PurchaseOrderRow,
  'confirmQty' | 'remainQty' | 'stockQty' | 'confirmSupplierId' | 'confirmUnitPrice' | 'confirmDeliveryDt'
  | 'confirmWarehouseId' | 'diffNote' | 'confirmNo' | 'requestNo' | 'useTypeName'> {
  return {
    confirmQty: null,
    remainQty: null,
    stockQty: null,
    confirmSupplierId: null,
    confirmUnitPrice: null,
    confirmDeliveryDt: '',
    confirmWarehouseId: '',
    diffNote: '',
    confirmNo: '',
    requestNo: '',
    useTypeName: '',
  };
}

/** 확정 불러오기 행 → 그리드 행. 수량은 잔량, 나머지는 확정값을 기본값으로 쓴다. */
export function candidateToRow(
  candidate: PurchaseOrderCandidate,
  taxType: PurchaseOrderTaxType,
  vatIncluded: boolean,
  supplierId: number | null,
): PurchaseOrderRow {
  const unitPrice = candidate.unitPrice == null ? null : Number(candidate.unitPrice);
  const orderQty = Number(candidate.remainQty);
  const base: PurchaseOrderRow = {
    rowId: `confirm-${candidate.purchaseRequestDetailId}`,
    purchaseOrderDetailId: null,
    purchaseRequestDetailId: candidate.purchaseRequestDetailId,
    confirmNo: candidate.confirmNo,
    requestNo: candidate.requestNo,
    materialId: candidate.materialId,
    materialCode: candidate.materialCode ?? '',
    materialName: candidate.materialName ?? '',
    materialSpec: candidate.materialSpec ?? '',
    unit: candidate.unit ?? '',
    useTypeName: candidate.useTypeName ?? candidate.useType ?? '',
    confirmQty: Number(candidate.confirmQty),
    remainQty: orderQty,
    orderQty,
    unitPrice,
    deliveryDt: candidate.confirmDeliveryDt ?? candidate.requestDeliveryDt ?? '',
    warehouseId: candidate.warehouseId == null ? '' : String(candidate.warehouseId),
    inspectAt: candidate.inspectAt === 'Y',
    receiptClosed: false,
    arrivedQty: 0,
    supplyAmt: 0,
    vatAmt: 0,
    totalAmt: 0,
    stockQty: candidate.stockQty == null ? null : Number(candidate.stockQty),
    remark: candidate.remark ?? '',
    confirmSupplierId: candidate.supplierId,
    confirmUnitPrice: unitPrice,
    confirmDeliveryDt: candidate.confirmDeliveryDt ?? '',
    confirmWarehouseId: candidate.warehouseId == null ? '' : String(candidate.warehouseId),
    diffNote: '',
  };
  const amounts = calculateOrderAmounts(base.orderQty, base.unitPrice, taxType, vatIncluded);
  const row = { ...base, ...amounts };
  return { ...row, diffNote: buildDiffNote(row, supplierId) };
}

/** 확정 행의 부가세구분·부가세포함 조합 목록(없으면 과세·미포함). 두 가지 이상이면 한 발주서에 담을 수 없다. */
export function distinctCandidateTaxSettings(candidates: PurchaseOrderCandidate[]): { taxType: PurchaseOrderTaxType; vatIncluded: boolean }[] {
  const seen = new Map<string, { taxType: PurchaseOrderTaxType; vatIncluded: boolean }>();
  for (const candidate of candidates) {
    const taxType = ((candidate.taxType as PurchaseOrderTaxType | null | undefined) || 'TAXABLE');
    const vatIncluded = taxType === 'TAXABLE' && candidate.vatIncludedAt === 'Y';
    seen.set(`${taxType}|${vatIncluded}`, { taxType, vatIncluded });
  }
  return [...seen.values()];
}

/** 같은 통화 확정 행인지 확인한다. 통화가 섞이면 발주서를 하나로 만들 수 없다. */
export function distinctCandidateCurrencies(candidates: PurchaseOrderCandidate[]): string[] {
  return [...new Set(candidates.map((candidate) => candidate.currencyCode || DEFAULT_CURRENCY))].sort();
}

export function validateOrderInput(
  input: {
    orderDt: string;
    supplierId: number | null;
    taxType: string;
    sourceType: PurchaseOrderSourceType | null;
    orderType: string;
    useType: string;
  },
  rows: PurchaseOrderRow[],
): string[] {
  const messages: string[] = [];
  const add = (message: string) => {
    if (!messages.includes(message)) messages.push(message);
  };
  if (!input.orderDt) add('발주일을 입력해 주세요.');
  if (!input.supplierId) add('구매처를 선택해 주세요.');
  if (!input.taxType) add('부가세구분을 선택해 주세요.');
  if (rows.length === 0) add('발주할 품목을 불러오거나 추가해 주세요.');
  if (input.sourceType === 'DIRECT') {
    if (!input.orderType) add('발주구분을 선택해 주세요.');
    if (!input.useType) add('사용용도를 선택해 주세요.');
  }
  for (const row of rows) {
    if (!(Number(row.orderQty) > 0)) add('발주수량은 0보다 커야 합니다.');
    if (!row.deliveryDt) add('납기일을 입력해 주세요.');
    if (!row.warehouseId) add('입고창고를 선택해 주세요.');
    if (row.unitPrice != null && Number(row.unitPrice) < 0) add('단가는 0 이상이어야 합니다.');
    if (row.remark.trim().length > 500) add('비고는 500자 이내로 입력해 주세요.');
  }
  return messages;
}

export function buildOrderPayload(
  input: {
    sourceType: PurchaseOrderSourceType;
    orderDt: string;
    supplierId: number;
    currencyCode: string;
    warehouseId: string;
    taxType: PurchaseOrderTaxType;
    vatIncluded: boolean;
    remark: string;
    orderType: string;
    useType: string;
  },
  rows: PurchaseOrderRow[],
): PurchaseOrderPayload {
  return {
    sourceType: input.sourceType,
    orderDt: input.orderDt,
    supplierId: input.supplierId,
    currencyCode: input.currencyCode || DEFAULT_CURRENCY,
    warehouseId: input.warehouseId ? Number(input.warehouseId) : null,
    taxType: input.taxType,
    vatIncludedAt: isTaxable(input.taxType) && input.vatIncluded ? 'Y' : 'N',
    remark: input.remark.trim() ? input.remark.trim() : null,
    orderType: input.sourceType === 'DIRECT' ? input.orderType : null,
    useType: input.sourceType === 'DIRECT' ? input.useType : null,
    details: rows.map((row) => ({
      purchaseOrderDetailId: row.purchaseOrderDetailId,
      purchaseRequestDetailId: input.sourceType === 'CONFIRM' ? row.purchaseRequestDetailId : null,
      materialId: input.sourceType === 'DIRECT' ? row.materialId : null,
      orderQty: Number(row.orderQty),
      unitPrice: row.unitPrice == null ? null : Number(row.unitPrice),
      deliveryDt: row.deliveryDt,
      warehouseId: Number(row.warehouseId),
      inspectAt: row.inspectAt ? 'Y' : 'N',
      vatAmt: row.vatAmt,
      remark: row.remark.trim() ? row.remark.trim() : null,
    })),
  };
}
