import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
} from '../../../../../shared/services/apiClient';
import type { MasterPickerSearch } from '../../../../../shared/components/master-picker/masterPicker.types';
import {
  fetchCommonCodeGroups,
  fetchCommonCodeItems,
} from '../../../../co/master/common-code/services/commonCodeManagement.service';
import { fetchMaterials } from '../../../../co/master/materials/services/materialManagement.service';
import type {
  PurchaseMaterialOption,
  PurchaseRequestDetailRow,
} from '../data/purchaseRequestDetail';
import type {
  PurchaseRequestItem,
  PurchaseRequestPayload,
  PurchaseRequestResponse,
  PurchaseRequestUseTypeOption,
} from '../types/purchaseRequest.types';

const PURCHASE_REQUEST_PATH = '/api/v1/materials/purchase-requests';
const USE_TYPE_GROUP_CODE = 'PURCHASE_USE_TYPE';
const MAX_NUMERIC_15_2 = 9_999_999_999_999.99;

export const PURCHASE_REQUEST_STATUS_OPTIONS = [
  { value: 'REQUESTED', label: '요청' },
  { value: 'PARTIALLY_CONFIRMED', label: '부분확정' },
  { value: 'CONFIRMED', label: '확정' },
];

export function purchaseRequestStatusLabel(status: string | null | undefined): string {
  return PURCHASE_REQUEST_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? (status ?? '');
}

export type PurchaseRequestInput = {
  requestDt: string;
  remark?: string;
  details: PurchaseRequestDetailRow[];
};

export function validatePurchaseRequestInput(
  input: Pick<PurchaseRequestInput, 'requestDt' | 'details'>,
): { messages: string[] } {
  const messages: string[] = [];
  const add = (message: string) => {
    if (!messages.includes(message)) messages.push(message);
  };
  if (!input.requestDt.trim()) add('요청일을 입력해 주세요.');
  if (input.details.length === 0) add('품목 상세를 1건 이상 입력해 주세요.');
  for (const row of input.details) {
    if (row.materialId == null || !Number.isSafeInteger(row.materialId) || row.materialId < 1) {
      add('품목을 선택해 주세요.');
    }
    const qty = Number(row.requestQty);
    if (!Number.isFinite(qty) || qty <= 0 || qty > MAX_NUMERIC_15_2) {
      add('요청수량은 0보다 커야 합니다.');
    }
    if (!row.requestDeliveryDt) add('요청납기일을 입력해 주세요.');
    if (!row.useType) add('사용용도를 선택해 주세요.');
    if ((row.requestRemark ?? '').trim().length > 500) add('비고는 500자 이내로 입력해 주세요.');
  }
  return { messages };
}

export function buildPurchaseRequestPayload(input: PurchaseRequestInput): PurchaseRequestPayload {
  return {
    requestDt: input.requestDt,
    remark: toNullableText(input.remark),
    details: input.details.map((row) => {
      if (row.materialId == null) {
        throw new Error('모든 상세 행의 품목을 선택해 주세요.');
      }
      return {
        purchaseRequestDetailId: row.purchaseRequestDetailId,
        materialId: row.materialId,
        requestQty: Number(row.requestQty),
        requestDeliveryDt: row.requestDeliveryDt,
        useType: row.useType,
        requestRemark: toNullableText(row.requestRemark),
      };
    }),
  };
}

function requireItem(response: PurchaseRequestResponse, action: string): PurchaseRequestItem {
  if (response.item == null) {
    throw new Error(`구매요청 ${action} 응답에 구매요청 정보가 없습니다.`);
  }
  return response.item;
}

export async function createPurchaseRequest(payload: PurchaseRequestPayload): Promise<PurchaseRequestItem> {
  return requireItem(await apiPost<PurchaseRequestResponse>(PURCHASE_REQUEST_PATH, payload), '저장');
}

export async function getPurchaseRequest(purchaseRequestId: number): Promise<PurchaseRequestItem> {
  return requireItem(
    await apiGet<PurchaseRequestResponse>(`${PURCHASE_REQUEST_PATH}/${purchaseRequestId}`),
    '조회',
  );
}

export async function updatePurchaseRequest(
  purchaseRequestId: number,
  payload: PurchaseRequestPayload,
): Promise<PurchaseRequestItem> {
  return requireItem(
    await apiPut<PurchaseRequestResponse>(`${PURCHASE_REQUEST_PATH}/${purchaseRequestId}`, payload),
    '수정',
  );
}

export async function deletePurchaseRequest(purchaseRequestId: number): Promise<void> {
  await apiDelete<unknown>(`${PURCHASE_REQUEST_PATH}/${purchaseRequestId}`);
}

export function toPurchaseRequestRows(item: PurchaseRequestItem): PurchaseRequestDetailRow[] {
  return item.details.map((detail) => ({
    rowId: `purchase-request-line-${detail.purchaseRequestDetailId}`,
    purchaseRequestDetailId: detail.purchaseRequestDetailId,
    materialId: detail.materialId,
    materialCode: detail.materialCode ?? '',
    materialName: detail.materialName ?? '',
    materialSpec: detail.materialSpec ?? '',
    unit: detail.unit ?? '',
    requestQty: Number(detail.requestQty),
    requestDeliveryDt: detail.requestDeliveryDt ?? '',
    useType: detail.useType ?? '',
    requestRemark: detail.requestRemark ?? '',
    confirmQty: detail.confirmQty == null ? null : Number(detail.confirmQty),
  }));
}

/** 사용용도 공통코드(PURCHASE_USE_TYPE) 중 사용 중인 항목을 정렬 순서대로 조회한다. */
export async function fetchPurchaseUseTypeOptions(): Promise<PurchaseRequestUseTypeOption[]> {
  const groups = await fetchCommonCodeGroups();
  const group = groups.find((candidate) => candidate.groupCode === USE_TYPE_GROUP_CODE);
  if (!group) return [];
  const items = await fetchCommonCodeItems(group.id);
  return items
    .filter((codeItem) => codeItem.useAt === 'Y')
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((codeItem) => ({ value: codeItem.itemCode, label: codeItem.itemNm }));
}

/** 구매요청 가능 품목계정(ITEM_TYPE): 원재료, 부재료, 소모품. 서버 저장 검증과 같은 기준이다. */
export const PURCHASABLE_MATERIAL_TYPES: Record<string, string> = {
  RAW: '원재료',
  SUB: '부재료',
  SUPPLY: '소모품',
};

export const searchPurchaseMaterials: MasterPickerSearch = async (keyword) => {
  const materials = await fetchMaterials({ keyword });
  const purchasable = materials.filter((material) =>
    Object.prototype.hasOwnProperty.call(PURCHASABLE_MATERIAL_TYPES, String(material.materialTypeCode ?? '').trim()));
  return purchasable.map((material): PurchaseMaterialOption => {
    const id = Number(material.materialId);
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error('품목 ID 응답을 확인할 수 없습니다.');
    }
    const details = [
      ['품목계정', PURCHASABLE_MATERIAL_TYPES[String(material.materialTypeCode).trim()]],
      ['품목규격', material.materialSpec],
      ['단위', material.unit],
    ]
      .filter(([, value]) => typeof value === 'string' && value.trim())
      .map(([label, value]) => ({ label: String(label), value: String(value).trim() }));
    return {
      id,
      code: String(material.materialCode ?? ''),
      name: String(material.materialName ?? ''),
      spec: material.materialSpec ?? '',
      unit: material.unit ?? '',
      ...(details.length ? { details } : {}),
    };
  });
};

function toNullableText(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? '';
  return normalized || null;
}
