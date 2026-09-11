import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
} from '../../../../../shared/services/apiClient';
import type {
  CommonCodeGroupRow,
  CommonCodeItemRow,
} from '../types/commonCodeManagement.types';

interface CommonCodeGroupApiRow {
  commonCodeGroupId?: number | string | null;
  tenantId?: number | string | null;
  groupCode?: string | null;
  groupNm?: string | null;
  groupDc?: string | null;
  parentGroupId?: number | string | null;
  sortOrder?: number | string | null;
  useAt?: string | null;
}

interface CommonCodeItemApiRow {
  commonCodeItemId?: number | string | null;
  tenantId?: number | string | null;
  groupId?: number | string | null;
  itemCode?: string | null;
  itemNm?: string | null;
  itemDc?: string | null;
  parentItemId?: number | string | null;
  parentItemNm?: string | null;
  sortOrder?: number | string | null;
  useAt?: string | null;
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toGroupRow(row: CommonCodeGroupApiRow): CommonCodeGroupRow {
  return {
    id: String(row.commonCodeGroupId ?? ''),
    groupCode: String(row.groupCode ?? ''),
    groupNm: String(row.groupNm ?? ''),
    parentGroupId:
      row.parentGroupId == null || row.parentGroupId === ''
        ? null
        : String(row.parentGroupId),
    groupDc: String(row.groupDc ?? ''),
    sortOrder: toNumber(row.sortOrder),
    useAt: String(row.useAt ?? 'Y') === 'N' ? 'N' : 'Y',
  };
}

function toItemRow(row: CommonCodeItemApiRow): CommonCodeItemRow {
  return {
    id: String(row.commonCodeItemId ?? ''),
    groupId: String(row.groupId ?? ''),
    itemCode: String(row.itemCode ?? ''),
    itemNm: String(row.itemNm ?? ''),
    parentItemId:
      row.parentItemId == null || row.parentItemId === ''
        ? null
        : String(row.parentItemId),
    parentItemNm: String(row.parentItemNm ?? ''),
    sortOrder: toNumber(row.sortOrder),
    useAt: String(row.useAt ?? 'Y') === 'N' ? 'N' : 'Y',
    itemDc: String(row.itemDc ?? ''),
  };
}

export async function fetchCommonCodeGroups(): Promise<CommonCodeGroupRow[]> {
  const result = await apiGet<{ resultList: CommonCodeGroupApiRow[] }>(
    '/api/v1/co/master/common-code/groups',
  );
  return (result.resultList ?? []).map(toGroupRow);
}

export async function fetchCommonCodeItems(
  groupId: string,
): Promise<CommonCodeItemRow[]> {
  const result = await apiGet<{ resultList: CommonCodeItemApiRow[] }>(
    `/api/v1/co/master/common-code/groups/${groupId}/items`,
  );
  return (result.resultList ?? []).map(toItemRow);
}

export async function fetchParentItems(
  groupId: string,
): Promise<CommonCodeItemRow[]> {
  const result = await apiGet<{ resultList: CommonCodeItemApiRow[] }>(
    `/api/v1/co/master/common-code/groups/${groupId}/parent-items`,
  );
  return (result.resultList ?? []).map(toItemRow);
}

export async function createCommonCodeGroup(
  payload: Partial<CommonCodeGroupRow>,
) {
  return apiPost('/api/v1/co/master/common-code/groups', payload);
}

export async function updateCommonCodeGroup(
  groupId: string,
  payload: Partial<CommonCodeGroupRow>,
) {
  return apiPut(`/api/v1/co/master/common-code/groups/${groupId}`, payload);
}

export async function deleteCommonCodeGroup(groupId: string) {
  return apiDelete(`/api/v1/co/master/common-code/groups/${groupId}`);
}

export async function createCommonCodeItem(
  groupId: string,
  payload: Partial<CommonCodeItemRow>,
) {
  return apiPost(
    `/api/v1/co/master/common-code/groups/${groupId}/items`,
    payload,
  );
}

export async function updateCommonCodeItem(
  groupId: string,
  itemId: string,
  payload: Partial<CommonCodeItemRow>,
) {
  return apiPut(
    `/api/v1/co/master/common-code/groups/${groupId}/items/${itemId}`,
    payload,
  );
}

export async function deleteCommonCodeItem(groupId: string, itemId: string) {
  return apiDelete(
    `/api/v1/co/master/common-code/groups/${groupId}/items/${itemId}`,
  );
}
