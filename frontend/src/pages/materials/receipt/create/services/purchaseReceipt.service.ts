import { apiGet, apiPost, apiPut } from '../../../../../shared/services/apiClient';
import { calculateOrderAmounts, isTaxable } from '../../../order/create/data/purchaseOrderAmounts';
import { DEFAULT_CURRENCY } from '../../../order/create/services/purchaseOrder.service';
import type { PurchaseOrderTaxType } from '../../../order/create/types/purchaseOrder.types';
import type { PurchaseReceiptRow } from '../data/purchaseReceiptColumns';
import type {
  PurchaseReceiptCandidate,
  PurchaseReceiptCandidateResult,
  PurchaseReceiptDetailItem,
  PurchaseReceiptItem,
  PurchaseReceiptPayload,
} from '../types/purchaseReceipt.types';

const RECEIPT_PATH = '/api/v1/materials/purchase-receipts';

export type ReceiptCandidateSearch = { fromDt: string; toDt: string; keyword: string };

/** 입고 가능한 수입검사 합격분. total은 조회 조건과 무관한 전체 입고 가능 건수다. */
export async function searchReceiptCandidates(
  search: Partial<ReceiptCandidateSearch> = {},
): Promise<PurchaseReceiptCandidateResult> {
  const query = new URLSearchParams();
  if (search.fromDt) query.set('fromDt', search.fromDt);
  if (search.toDt) query.set('toDt', search.toDt);
  if (search.keyword?.trim()) query.set('keyword', search.keyword.trim());
  const suffix = query.toString() ? `?${query}` : '';
  const result = await apiGet<{ resultList?: PurchaseReceiptCandidate[]; total?: number }>(
    `${RECEIPT_PATH}/candidates${suffix}`,
  );
  const rows = Array.isArray(result.resultList) ? result.resultList : [];
  return { rows, total: typeof result.total === 'number' ? result.total : rows.length };
}

export async function createPurchaseReceipt(payload: PurchaseReceiptPayload): Promise<PurchaseReceiptItem> {
  return requireReceipt(await apiPost<{ item?: PurchaseReceiptItem | null }>(RECEIPT_PATH, payload), '등록');
}

/** 불러온 통화들(중복 제거). 한 입고는 통화 1종이므로 둘 이상이면 담을 수 없다. */
export function distinctReceiptCandidateCurrencies(candidates: PurchaseReceiptCandidate[]): string[] {
  return [...new Set(candidates.map((candidate) => candidate.currencyCode || DEFAULT_CURRENCY))];
}

/**
 * 합격분 불러오기 행 → 그리드 행. 입고수량은 입고 가능량, 단가·창고·제조일·소비기한은 가입고 행 값을 기본값으로 쓴다.
 * 금액은 호출한 쪽이 현재 부가세 설정으로 계산한다(calculateOrderAmounts).
 */
export function candidateToRow(
  candidate: PurchaseReceiptCandidate,
  taxType: PurchaseOrderTaxType,
  vatIncluded: boolean,
): PurchaseReceiptRow {
  const receivableQty = Number(candidate.receivableQty);
  const unitPrice = candidate.unitPrice == null ? null : Number(candidate.unitPrice);
  return {
    rowId: `inspection-${candidate.qualityInspectionDetailId}`,
    purchaseReceiptDetailId: null,
    qualityInspectionDetailId: candidate.qualityInspectionDetailId,
    inspectionNo: candidate.inspectionNo,
    closingMonth: '',
    receivableQty,
    arrivalNo: candidate.arrivalNo ?? '',
    orderNo: candidate.orderNo ?? '',
    materialCode: candidate.materialCode ?? '',
    materialName: candidate.materialName ?? '',
    materialSpec: candidate.materialSpec ?? '',
    unit: candidate.unit ?? '',
    arrivalQty: null,
    remainQty: null,
    receiptQty: receivableQty,
    unitPrice,
    warehouseId: candidate.warehouseId == null ? '' : String(candidate.warehouseId),
    manufactureDt: candidate.manufactureDt ?? '',
    expireDt: candidate.expireDt ?? '',
    lotNo: '',
    linkedNoInspection: false,
    ...calculateOrderAmounts(receivableQty, unitPrice, taxType, vatIncluded),
    remark: '',
  };
}

function requireReceipt(result: { item?: PurchaseReceiptItem | null }, label: string): PurchaseReceiptItem {
  if (!result.item) throw new Error(`입고 ${label} 응답에 입고 정보가 없습니다.`);
  return result.item;
}

export async function getPurchaseReceipt(purchaseReceiptId: number): Promise<PurchaseReceiptItem> {
  return requireReceipt(
    await apiGet<{ item?: PurchaseReceiptItem | null }>(`${RECEIPT_PATH}/${purchaseReceiptId}`),
    '조회',
  );
}

export async function updatePurchaseReceipt(
  purchaseReceiptId: number,
  payload: PurchaseReceiptPayload,
): Promise<PurchaseReceiptItem> {
  return requireReceipt(
    await apiPut<{ item?: PurchaseReceiptItem | null }>(`${RECEIPT_PATH}/${purchaseReceiptId}`, payload),
    '수정',
  );
}

export async function cancelPurchaseReceipt(purchaseReceiptId: number): Promise<PurchaseReceiptItem> {
  return requireReceipt(
    await apiPost<{ item?: PurchaseReceiptItem | null }>(`${RECEIPT_PATH}/${purchaseReceiptId}/cancel`, {}),
    '취소',
  );
}

/** 가입고 행이 남아 있는 무검사 입고 행인지(수정·삭제가 가입고에도 반영되는 행). */
export function isLinkedNoInspection(detail: PurchaseReceiptDetailItem): boolean {
  return detail.purchaseArrivalDetailId != null && detail.inspectAt === 'N' && detail.arrivalActive === 'Y';
}

/** 저장된 입고 행 → 그리드 행. */
export function detailToRow(detail: PurchaseReceiptDetailItem): PurchaseReceiptRow {
  return {
    rowId: `receipt-${detail.purchaseReceiptDetailId}`,
    purchaseReceiptDetailId: detail.purchaseReceiptDetailId,
    qualityInspectionDetailId: detail.qualityInspectionDetailId ?? null,
    inspectionNo: detail.inspectionNo ?? '',
    closingMonth: detail.closingMonth ?? '',
    receivableQty: detail.receivableQty == null ? null : Number(detail.receivableQty),
    arrivalNo: detail.arrivalNo ?? '',
    orderNo: detail.orderNo ?? '',
    materialCode: detail.materialCode ?? '',
    materialName: detail.materialName ?? '',
    materialSpec: detail.materialSpec ?? '',
    unit: detail.unit ?? '',
    arrivalQty: detail.arrivalQty == null ? null : Number(detail.arrivalQty),
    remainQty: detail.qualityInspectionDetailId != null ? null : Number(detail.remainQty ?? detail.orderQty ?? 0),
    receiptQty: Number(detail.receiptQty),
    unitPrice: Number(detail.unitPrice),
    warehouseId: String(detail.warehouseId),
    manufactureDt: detail.manufactureDt ?? '',
    expireDt: detail.expireDt ?? '',
    lotNo: detail.lotNo ?? '',
    linkedNoInspection: isLinkedNoInspection(detail),
    supplyAmt: Number(detail.supplyAmt),
    vatAmt: Number(detail.vatAmt),
    totalAmt: Number(detail.totalAmt),
    remark: detail.remark ?? '',
  };
}

/**
 * 입고수량이 발주 잔량을 넘는 무검사 행 수. 오류가 아니라 저장 전 확인창 대상이다.
 * 검사 연결 행은 발주 잔량이 아니라 입고 가능량이 상한이므로 제외한다(초과는 확인창이 아니라 오류다).
 */
export function countRowsOverRemaining(rows: PurchaseReceiptRow[]): number {
  return rows.filter((row) => row.qualityInspectionDetailId === null && row.remainQty !== null
    && Number(row.receiptQty) > row.remainQty).length;
}

/** 저장된 입고 행 중 현재 그리드에 없는(빠질) 무검사 행 수. 가입고 행도 함께 삭제된다. */
export function countRemovedNoInspectionRows(
  savedDetails: PurchaseReceiptDetailItem[],
  rows: PurchaseReceiptRow[],
): number {
  const kept = new Set(rows.map((row) => row.purchaseReceiptDetailId));
  return savedDetails.filter((detail) => isLinkedNoInspection(detail) && !kept.has(detail.purchaseReceiptDetailId)).length;
}

export function validateReceiptInput(
  input: { receiptDt: string; taxType: string },
  rows: PurchaseReceiptRow[],
  isNew = false,
): string[] {
  const messages: string[] = [];
  const add = (message: string) => {
    if (!messages.includes(message)) messages.push(message);
  };
  if (!input.receiptDt) add('입고일을 입력해 주세요.');
  if (!input.taxType) add('부가세구분을 선택해 주세요.');
  if (rows.length === 0) {
    add(isNew ? '입고할 수입검사 합격분을 불러와 주세요.' : '모든 행을 뺄 수 없습니다. 입고 취소를 사용해 주세요.');
  }
  for (const row of rows) {
    if (!(Number(row.receiptQty) > 0)) add('입고수량은 0보다 커야 합니다.');
    else if (row.qualityInspectionDetailId !== null && row.receivableQty !== null
      && Number(row.receiptQty) > row.receivableQty) {
      add(`${row.materialName || row.materialCode}(검사 ${row.inspectionNo})의 입고수량이 입고 가능량 ${row.receivableQty}을(를) 초과했습니다.`);
    }
    if (row.unitPrice === null || row.unitPrice === undefined || String(row.unitPrice) === '') {
      add('입고단가를 입력해 주세요.');
    } else if (Number(row.unitPrice) < 0) {
      add('입고단가는 0 이상이어야 합니다.');
    }
    if (!row.warehouseId) add('입고창고를 선택해 주세요.');
    if (row.manufactureDt && row.expireDt && row.expireDt < row.manufactureDt) add('소비기한은 제조일 이후여야 합니다.');
    if (row.remark.trim().length > 500) add('비고는 500자 이내로 입력해 주세요.');
  }
  return messages;
}

export function buildReceiptPayload(
  input: {
    receiptDt: string;
    taxType: PurchaseOrderTaxType;
    vatIncluded: boolean;
    remark: string;
  },
  rows: PurchaseReceiptRow[],
): PurchaseReceiptPayload {
  return {
    receiptDt: input.receiptDt,
    taxType: input.taxType,
    vatIncludedAt: isTaxable(input.taxType) && input.vatIncluded ? 'Y' : 'N',
    remark: input.remark.trim() ? input.remark.trim() : null,
    details: rows.map((row) => ({
      // 저장된 행은 입고 행 ID로, 새로 불러온 행은 수입검사 행 ID로 가리킨다.
      ...(row.purchaseReceiptDetailId !== null
        ? { purchaseReceiptDetailId: row.purchaseReceiptDetailId }
        : { qualityInspectionDetailId: row.qualityInspectionDetailId as number }),
      receiptQty: Number(row.receiptQty),
      unitPrice: Number(row.unitPrice),
      warehouseId: Number(row.warehouseId),
      vatAmt: row.vatAmt,
      manufactureDt: row.manufactureDt ? row.manufactureDt : null,
      expireDt: row.expireDt ? row.expireDt : null,
      remark: row.remark.trim() ? row.remark.trim() : null,
    })),
  };
}
