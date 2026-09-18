import { apiGet, apiPost } from '../../../../../shared/services/apiClient';
import type {
  CommonCodeGroupRow,
  CommonCodeItemRow,
} from '../types/commonCodeManagement.types';

export type CommonCodeBatchChangeSet<T> = {
  insertedRows: Partial<T>[];
  updatedRows: Partial<T>[];
  deletedRows: Partial<T>[];
};

export type CommonCodeBatchPayload = {
  groups: CommonCodeBatchChangeSet<CommonCodeGroupRow>;
  items: CommonCodeBatchChangeSet<CommonCodeItemRow>;
};

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

export function toGroupRow(row: CommonCodeGroupApiRow): CommonCodeGroupRow {
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

export function toItemRow(row: CommonCodeItemApiRow): CommonCodeItemRow {
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

export function normalizeBatchSaveResponse(response: unknown): {
  groups: CommonCodeGroupRow[];
  items: CommonCodeItemRow[];
} {
  const payload = (response as { item?: unknown } | null)?.item ?? response;
  const savedGroups = Array.isArray((payload as { groups?: unknown })?.groups)
    ? ((payload as { groups?: CommonCodeGroupApiRow[] }).groups ?? [])
    : [];
  const savedItems = Array.isArray((payload as { items?: unknown })?.items)
    ? ((payload as { items?: CommonCodeItemApiRow[] }).items ?? [])
    : [];

  return {
    groups: savedGroups.map(toGroupRow),
    items: savedItems.map(toItemRow),
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

export function buildCommonCodeBatchPayload(payload: {
  groups: CommonCodeBatchChangeSet<CommonCodeGroupRow>;
  items: CommonCodeBatchChangeSet<CommonCodeItemRow>;
}): CommonCodeBatchPayload {
  return {
    groups: {
      insertedRows: payload.groups.insertedRows,
      updatedRows: payload.groups.updatedRows,
      deletedRows: payload.groups.deletedRows,
    },
    items: {
      insertedRows: payload.items.insertedRows,
      updatedRows: payload.items.updatedRows,
      deletedRows: payload.items.deletedRows,
    },
  };
}

export async function saveCommonCodeBatch(payload: CommonCodeBatchPayload) {
  return apiPost('/api/v1/co/master/common-code/save-batch', payload);
}
