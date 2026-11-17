import { apiGet, apiPost, apiPut } from '../../../../../shared/services/apiClient';
import { calculateOrderAmounts, isTaxable } from '../../../order/create/data/purchaseOrderAmounts';
import { DEFAULT_CURRENCY } from '../../../order/create/services/purchaseOrder.service';
import type { PurchaseOrderTaxType } from '../../../order/create/types/purchaseOrder.types';
import type { MaterialArrivalRow } from '../data/materialArrivalColumns';
import type {
  MaterialArrivalCandidate,
  MaterialArrivalDetailItem,
  MaterialArrivalItem,
  MaterialArrivalPayload,
} from '../types/materialArrival.types';

const ARRIVAL_PATH = '/api/v1/materials/material-arrivals';

export type ArrivalCandidateSearch = { fromDt: string; toDt: string; keyword: string };

/** 가입고 대상 발주 품목 행(잔량이 남고 입고대기 마감이 아닌 행) */
export async function searchArrivalCandidates(search: ArrivalCandidateSearch): Promise<MaterialArrivalCandidate[]> {
  const query = new URLSearchParams();
  if (search.fromDt) query.set('fromDt', search.fromDt);
  if (search.toDt) query.set('toDt', search.toDt);
  if (search.keyword.trim()) query.set('keyword', search.keyword.trim());
  const suffix = query.toString() ? `?${query}` : '';
  const result = await apiGet<{ resultList?: MaterialArrivalCandidate[] }>(`${ARRIVAL_PATH}/candidates${suffix}`);
  return Array.isArray(result.resultList) ? result.resultList : [];
}

function requireArrival(result: { item?: MaterialArrivalItem | null }, label: string): MaterialArrivalItem {
  if (!result.item) throw new Error(`가입고 ${label} 응답에 가입고 정보가 없습니다.`);
  return result.item;
}

export async function createMaterialArrival(payload: MaterialArrivalPayload): Promise<MaterialArrivalItem> {
  return requireArrival(await apiPost<{ item?: MaterialArrivalItem | null }>(ARRIVAL_PATH, payload), '등록');
}

export async function getMaterialArrival(materialArrivalId: number): Promise<MaterialArrivalItem> {
  return requireArrival(
    await apiGet<{ item?: MaterialArrivalItem | null }>(`${ARRIVAL_PATH}/${materialArrivalId}`),
    '조회',
  );
}

export async function updateMaterialArrival(
  materialArrivalId: number,
  payload: MaterialArrivalPayload,
): Promise<MaterialArrivalItem> {
  return requireArrival(
    await apiPut<{ item?: MaterialArrivalItem | null }>(`${ARRIVAL_PATH}/${materialArrivalId}`, payload),
    '수정',
  );
}

export async function cancelMaterialArrival(materialArrivalId: number): Promise<MaterialArrivalItem> {
  return requireArrival(
    await apiPost<{ item?: MaterialArrivalItem | null }>(`${ARRIVAL_PATH}/${materialArrivalId}/cancel`, {}),
    '취소',
  );
}

/** 발주 불러오기 행 → 그리드 행. 수량은 발주 잔량, 단가·창고는 발주값을 기본값으로 쓴다. */
export function candidateToRow(
  candidate: MaterialArrivalCandidate,
  taxType: PurchaseOrderTaxType,
  vatIncluded: boolean,
): MaterialArrivalRow {
  const unitPrice = candidate.unitPrice == null ? null : Number(candidate.unitPrice);
  const remainQty = Number(candidate.remainQty);
  return {
    rowId: `order-${candidate.purchaseOrderDetailId}`,
    materialArrivalDetailId: null,
    purchaseOrderDetailId: candidate.purchaseOrderDetailId,
    orderNo: candidate.orderNo,
    materialId: candidate.materialId,
    materialCode: candidate.materialCode ?? '',
    materialName: candidate.materialName ?? '',
    materialSpec: candidate.materialSpec ?? '',
    unit: candidate.unit ?? '',
    orderQty: Number(candidate.orderQty),
    remainQty,
    arrivalQty: remainQty,
    unitPrice,
    warehouseId: candidate.warehouseId == null ? '' : String(candidate.warehouseId),
    manufactureDt: '',
    expireDt: '',
    lotNo: '',
    inspectAt: candidate.inspectAt === 'Y',
    receiptNo: '',
    inspectionNo: '',
    ...calculateOrderAmounts(remainQty, unitPrice, taxType, vatIncluded),
    remark: '',
  };
}

/** 저장된 가입고 행 → 그리드 행. 수량 상한은 서버가 계산한 잔량(이 행 제외)이다. */
export function detailToRow(detail: MaterialArrivalDetailItem): MaterialArrivalRow {
  return {
    rowId: `arrival-${detail.materialArrivalDetailId}`,
    materialArrivalDetailId: detail.materialArrivalDetailId,
    purchaseOrderDetailId: detail.purchaseOrderDetailId,
    orderNo: detail.orderNo ?? '',
    materialId: detail.materialId,
    materialCode: detail.materialCode ?? '',
    materialName: detail.materialName ?? '',
    materialSpec: detail.materialSpec ?? '',
    unit: detail.unit ?? '',
    orderQty: detail.orderQty == null ? null : Number(detail.orderQty),
    remainQty: Number(detail.remainQty ?? detail.orderQty ?? 0),
    arrivalQty: Number(detail.arrivalQty),
    unitPrice: Number(detail.unitPrice),
    warehouseId: String(detail.warehouseId),
    manufactureDt: detail.manufactureDt ?? '',
    expireDt: detail.expireDt ?? '',
    lotNo: detail.lotNo ?? '',
    inspectAt: detail.inspectAt === 'Y',
    receiptNo: detail.receiptNo ?? '',
    inspectionNo: detail.inspectionNo ?? '',
    inspectionId: detail.inspectionId ?? null,
    supplyAmt: Number(detail.supplyAmt),
    vatAmt: Number(detail.vatAmt),
    totalAmt: Number(detail.totalAmt),
    remark: detail.remark ?? '',
  };
}

/** 같은 통화 발주 행인지 확인한다. 통화가 섞이면 가입고를 하나로 만들 수 없다. */
export function distinctCandidateCurrencies(candidates: MaterialArrivalCandidate[]): string[] {
  return [...new Set(candidates.map((candidate) => candidate.currencyCode || DEFAULT_CURRENCY))].sort();
}

/** 가입고수량이 발주 잔량을 넘는 행 수. 오류가 아니라 저장 전 확인창 대상이다. */
export function countRowsOverRemaining(rows: MaterialArrivalRow[]): number {
  return rows.filter((row) => Number(row.arrivalQty) > row.remainQty).length;
}

export function validateArrivalInput(
  input: { arrivalDt: string; supplierId: number | null; taxType: string },
  rows: MaterialArrivalRow[],
): string[] {
  const messages: string[] = [];
  const add = (message: string) => {
    if (!messages.includes(message)) messages.push(message);
  };
  if (!input.arrivalDt) add('가입고일을 입력해 주세요.');
  if (!input.supplierId) add('구매처를 확인해 주세요.');
  if (!input.taxType) add('부가세구분을 선택해 주세요.');
  if (rows.length === 0) add('가입고할 발주 품목을 불러와 주세요.');
  for (const row of rows) {
    if (!(Number(row.arrivalQty) > 0)) add('가입고수량은 0보다 커야 합니다.');
    if (row.unitPrice === null || row.unitPrice === undefined || String(row.unitPrice) === '') {
      add('가입고단가를 입력해 주세요.');
    } else if (Number(row.unitPrice) < 0) {
      add('가입고단가는 0 이상이어야 합니다.');
    }
    if (!row.warehouseId) add('입고창고를 선택해 주세요.');
    if (row.manufactureDt && row.expireDt && row.expireDt < row.manufactureDt) add('소비기한은 제조일 이후여야 합니다.');
    if (row.remark.trim().length > 500) add('비고는 500자 이내로 입력해 주세요.');
  }
  return messages;
}

export function buildArrivalPayload(
  input: {
    arrivalDt: string;
    supplierId: number;
    taxType: PurchaseOrderTaxType;
    vatIncluded: boolean;
    remark: string;
  },
  rows: MaterialArrivalRow[],
): MaterialArrivalPayload {
  return {
    arrivalDt: input.arrivalDt,
    supplierId: input.supplierId,
    taxType: input.taxType,
    vatIncludedAt: isTaxable(input.taxType) && input.vatIncluded ? 'Y' : 'N',
    remark: input.remark.trim() ? input.remark.trim() : null,
    details: rows.map((row) => ({
      materialArrivalDetailId: row.materialArrivalDetailId,
      purchaseOrderDetailId: row.purchaseOrderDetailId,
      arrivalQty: Number(row.arrivalQty),
      unitPrice: Number(row.unitPrice),
      warehouseId: Number(row.warehouseId),
      vatAmt: row.vatAmt,
      manufactureDt: row.manufactureDt ? row.manufactureDt : null,
      expireDt: row.expireDt ? row.expireDt : null,
      remark: row.remark.trim() ? row.remark.trim() : null,
    })),
  };
}
