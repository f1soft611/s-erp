import type {
  F1GridColumn,
} from '../../../../../shared/components/f1-grid';
import type {
  CommonCodeGroupRow,
  CommonCodeItemRow,
  CommonCodeModuleOption,
} from '../types/commonCodeManagement.types';
import { COMMON_CODE_MODULE_COMMON_OPTION } from '../types/commonCodeManagement.types';

export function normalizeRowId(value: unknown): string {
  return String(value ?? '').trim();
}

export function getItemCodeValidationMessage(
  itemCode: unknown,
  canAutoGenerate: boolean,
): string | null {
  if (!String(itemCode ?? '').trim() && !canAutoGenerate) {
    return '상세코드는 필수입니다.';
  }
  return null;
}

export function getGroupDeleteBlockedMessage({
  blockedGroupIds,
  groups,
  itemRows,
  deletedGroupIds = [],
  deletedItemIds = [],
}: {
  blockedGroupIds: Array<string | number>;
  groups: CommonCodeGroupRow[];
  itemRows: CommonCodeItemRow[];
  deletedGroupIds?: Array<string | number>;
  deletedItemIds?: Array<string | number>;
}): string | null {
  const blockedIdSet = new Set(
    blockedGroupIds.map((value) => normalizeRowId(value)),
  );
  const deletedGroupIdSet = new Set(
    deletedGroupIds.map((value) => normalizeRowId(value)),
  );
  const deletedItemIdSet = new Set(
    deletedItemIds.map((value) => normalizeRowId(value)),
  );

  const hasChildGroup = groups.some((group) => {
    const parentGroupId = normalizeRowId(group.parentGroupId);
    const groupId = normalizeRowId(group.id);

    return (
      parentGroupId &&
      blockedIdSet.has(parentGroupId) &&
      !deletedGroupIdSet.has(groupId)
    );
  });

  const hasDetailItems = itemRows.some((item) => {
    const itemGroupId = normalizeRowId(item.groupId);
    const itemId = normalizeRowId(item.id);

    return blockedIdSet.has(itemGroupId) && !deletedItemIdSet.has(itemId);
  });

  if (hasChildGroup || hasDetailItems) {
    return '하위 그룹 또는 상세코드가 있는 그룹은 삭제할 수 없습니다.';
  }

  return null;
}

export function resolveCreatedGroupId(response: unknown): string | null {
  const candidate = (response as { item?: unknown } | null)?.item ?? response;
  if (!candidate || typeof candidate !== 'object') {
    return null;
  }

  const source = candidate as Record<string, unknown>;
  for (const field of ['commonCodeGroupId', 'groupId', 'id']) {
    const value = source[field];
    const normalized = normalizeRowId(value);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

export function resolveCreatedGroupIdMap(
  response: unknown,
  tempGroupIds: Array<string | number | null | undefined>,
): Map<string, string> {
  const candidate = (response as { item?: unknown } | null)?.item ?? response;
  if (!candidate || typeof candidate !== 'object') {
    return new Map();
  }

  const source = candidate as Record<string, unknown>;
  const savedGroups = Array.isArray(source.groups)
    ? (source.groups as Array<Record<string, unknown>>)
    : [];
  const tempIds = tempGroupIds
    .map((value) => normalizeRowId(value))
    .filter((value) => value.startsWith('new-common-group-'));

  const result = new Map<string, string>();
  tempIds.forEach((tempId, index) => {
    const persistedGroup = savedGroups[index];
    const persistedId = persistedGroup
      ? resolveCreatedGroupId(persistedGroup)
      : null;
    if (persistedId) {
      result.set(tempId, persistedId);
    }
  });

  return result;
}

export const buildGroupColumns = (
  moduleOptions: CommonCodeModuleOption[] = [],
): F1GridColumn<CommonCodeGroupRow>[] => [
  {
    field: 'groupCode',
    headerName: '그룹코드',
    editable: true,
    required: true,
    width: 120,
    highlightSearch: true,
  },
  {
    field: 'groupNm',
    headerName: '그룹명',
    editable: true,
    required: true,
    pinned: 'left',
    highlightSearch: true,
    flex: 1,
  },
  {
    field: 'moduleCd',
    headerName: '모듈',
    type: 'select',
    options: [COMMON_CODE_MODULE_COMMON_OPTION, ...moduleOptions],
    editable: true,
    align: 'center',
    width: 90,
    search: { label: '모듈', order: 0 },
  },
  {
    field: 'groupDc',
    headerName: '그룹 설명',
    editable: true,
    search: { span: 2 },
    highlightSearch: true,
    flex: 1,
  },
];
