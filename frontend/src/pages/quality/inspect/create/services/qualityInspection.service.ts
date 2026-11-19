import { apiGet, apiPost, apiPut } from '../../../../../shared/services/apiClient';
import { calculateInspectQty, type QualityInspectionRow } from '../data/qualityInspectionColumns';
import type {
  QualityInspectionCandidate,
  QualityInspectionCandidateResult,
  QualityInspectionDetailItem,
  QualityInspectionItem,
  QualityInspectionPayload,
} from '../types/qualityInspection.types';

const INSPECTION_PATH = '/api/v1/quality/quality-inspections';

export type InspectionCandidateSearch = { fromDt: string; toDt: string; keyword: string };

/** 검사 대기 가입고 행. total은 조회 조건과 무관한 전체 검사 대기 건수다. */
export async function searchInspectionCandidates(
  search: Partial<InspectionCandidateSearch> = {},
): Promise<QualityInspectionCandidateResult> {
  const query = new URLSearchParams();
  if (search.fromDt) query.set('fromDt', search.fromDt);
  if (search.toDt) query.set('toDt', search.toDt);
  if (search.keyword?.trim()) query.set('keyword', search.keyword.trim());
  const suffix = query.toString() ? `?${query}` : '';
  const result = await apiGet<{ resultList?: QualityInspectionCandidate[]; total?: number }>(
    `${INSPECTION_PATH}/candidates${suffix}`,
  );
  const rows = Array.isArray(result.resultList) ? result.resultList : [];
  return { rows, total: typeof result.total === 'number' ? result.total : rows.length };
}

function requireInspection(result: { item?: QualityInspectionItem | null }, label: string): QualityInspectionItem {
  if (!result.item) throw new Error(`검사 ${label} 응답에 검사 정보가 없습니다.`);
  return result.item;
}

export async function createQualityInspection(payload: QualityInspectionPayload): Promise<QualityInspectionItem> {
  return requireInspection(await apiPost<{ item?: QualityInspectionItem | null }>(INSPECTION_PATH, payload), '등록');
}

export async function getQualityInspection(qualityInspectionId: number): Promise<QualityInspectionItem> {
  return requireInspection(
    await apiGet<{ item?: QualityInspectionItem | null }>(`${INSPECTION_PATH}/${qualityInspectionId}`),
    '조회',
  );
}

export async function updateQualityInspection(
  qualityInspectionId: number,
  payload: QualityInspectionPayload,
): Promise<QualityInspectionItem> {
  return requireInspection(
    await apiPut<{ item?: QualityInspectionItem | null }>(`${INSPECTION_PATH}/${qualityInspectionId}`, payload),
    '수정',
  );
}

export async function cancelQualityInspection(qualityInspectionId: number): Promise<QualityInspectionItem> {
  return requireInspection(
    await apiPost<{ item?: QualityInspectionItem | null }>(`${INSPECTION_PATH}/${qualityInspectionId}/cancel`, {}),
    '취소',
  );
}

/** 불러오기 행 → 그리드 행. 합격량은 검사 대기량(전량 합격)을 기본값으로 쓰고 불합격량은 0이다. */
export function candidateToRow(candidate: QualityInspectionCandidate): QualityInspectionRow {
  const waitQty = Number(candidate.waitQty);
  return {
    rowId: `arrival-${candidate.purchaseArrivalDetailId}`,
    qualityInspectionDetailId: null,
    purchaseArrivalDetailId: candidate.purchaseArrivalDetailId,
    arrivalNo: candidate.arrivalNo,
    supplierName: candidate.supplierName ?? '',
    orderNo: candidate.orderNo ?? '',
    materialCode: candidate.materialCode ?? '',
    materialName: candidate.materialName ?? '',
    materialSpec: candidate.materialSpec ?? '',
    unit: candidate.unit ?? '',
    arrivalQty: Number(candidate.arrivalQty),
    otherInspectedQty: Number(candidate.inspectedQty),
    maxQty: waitQty,
    passQty: waitQty,
    failQty: 0,
    inspectQty: waitQty,
    receivedQty: 0,
    receiptNo: '',
    remark: '',
  };
}

/** 저장된 검사 행 → 그리드 행. */
export function detailToRow(detail: QualityInspectionDetailItem): QualityInspectionRow {
  const arrivalQty = Number(detail.arrivalQty ?? 0);
  const otherInspectedQty = Number(detail.otherInspectedQty ?? 0);
  const passQty = Number(detail.passQty);
  const failQty = Number(detail.failQty);
  return {
    rowId: `inspection-${detail.qualityInspectionDetailId}`,
    qualityInspectionDetailId: detail.qualityInspectionDetailId,
    purchaseArrivalDetailId: Number(detail.purchaseArrivalDetailId ?? 0),
    arrivalNo: detail.arrivalNo ?? '',
    supplierName: detail.supplierName ?? '',
    orderNo: detail.orderNo ?? '',
    materialCode: detail.materialCode ?? '',
    materialName: detail.materialName ?? '',
    materialSpec: detail.materialSpec ?? '',
    unit: detail.unit ?? '',
    arrivalQty,
    otherInspectedQty,
    maxQty: Number(detail.maxQty ?? arrivalQty - otherInspectedQty),
    passQty,
    failQty,
    inspectQty: calculateInspectQty(passQty, failQty),
    receivedQty: Number(detail.receivedQty ?? 0),
    receiptNo: detail.receiptNo ?? '',
    remark: detail.remark ?? '',
  };
}

/** 저장된 검사 행 중 현재 그리드에 없는(빠질) 행 수. 빠진 행은 검사 대기량이 복구된다. */
export function countRemovedRows(savedDetails: QualityInspectionDetailItem[], rows: QualityInspectionRow[]): number {
  const kept = new Set(rows.map((row) => row.qualityInspectionDetailId));
  return savedDetails.filter((detail) => !kept.has(detail.qualityInspectionDetailId)).length;
}

export function validateInspectionInput(input: { inspectionDt: string }, rows: QualityInspectionRow[]): string[] {
  const messages: string[] = [];
  const add = (message: string) => {
    if (!messages.includes(message)) messages.push(message);
  };
  if (!input.inspectionDt) add('검사일을 입력해 주세요.');
  if (rows.length === 0) add('검사할 가입고 품목을 불러와 주세요.');
  for (const row of rows) {
    const pass = row.passQty;
    const fail = row.failQty;
    if (pass === null || pass === undefined || String(pass) === '') add('합격량을 입력해 주세요.');
    else if (Number(pass) < 0) add('합격량은 0 이상이어야 합니다.');
    if (fail === null || fail === undefined || String(fail) === '') add('불합격량을 입력해 주세요.');
    else if (Number(fail) < 0) add('불합격량은 0 이상이어야 합니다.');
    const total = calculateInspectQty(pass, fail);
    if (row.receivedQty > 0 && Number(pass) < row.receivedQty) {
      add(`${row.materialName || row.materialCode}(${row.arrivalNo})는 합격분 ${row.receivedQty}이(가) 입고되어 합격량을 줄일 수 없습니다.`);
    }
    if (total <= 0) add('합격량과 불합격량의 합은 0보다 커야 합니다.');
    else if (total > row.maxQty) {
      add(`${row.materialName || row.materialCode}(${row.arrivalNo})의 검사량이 검사 대기량 ${row.maxQty}을(를) 초과했습니다.`);
    }
    if (row.remark.trim().length > 500) add('비고는 500자 이내로 입력해 주세요.');
  }
  return messages;
}

export function buildInspectionPayload(
  input: { inspectionDt: string; remark: string; inspectorId?: number | null },
  rows: QualityInspectionRow[],
): QualityInspectionPayload {
  return {
    inspectionDt: input.inspectionDt,
    ...(input.inspectorId != null ? { inspectorId: input.inspectorId } : {}),
    remark: input.remark.trim() ? input.remark.trim() : null,
    details: rows.map((row) => ({
      ...(row.qualityInspectionDetailId != null
        ? { qualityInspectionDetailId: row.qualityInspectionDetailId }
        : { purchaseArrivalDetailId: row.purchaseArrivalDetailId }),
      passQty: Number(row.passQty),
      failQty: Number(row.failQty),
      remark: row.remark.trim() ? row.remark.trim() : null,
    })),
  };
}
