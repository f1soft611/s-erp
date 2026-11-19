export type PermissionGroupDefinition = {
  key: string;
  label: string;
  codes: readonly string[];
};

export const DEFAULT_PERMISSION_GROUPS: PermissionGroupDefinition[] = [
  { key: 'read', label: '읽기', codes: ['READ'] },
  { key: 'write', label: '쓰기', codes: ['CREATE', 'UPDATE'] },
  { key: 'delete', label: '삭제', codes: ['DELETE'] },
  { key: 'excel', label: '엑셀', codes: ['EXCEL'] },
];

export function hasPermissionGroup(
  permissionCodes: string[],
  groupCodes: readonly string[],
): boolean {
  return groupCodes.some((code) => permissionCodes.includes(code));
}

export function togglePermissionGroup(
  permissionCodes: string[],
  groupCodes: readonly string[],
  checked: boolean,
): string[] {
  const next = new Set(permissionCodes);

  if (checked) {
    groupCodes.forEach((code) => next.add(code));
    return [...next];
  }

  groupCodes.forEach((code) => next.delete(code));
  return [...next];
}

export type PermissionActionDefinition = {
  key?: string;
  label: string;
  icon?: import('react').ElementType;
  visible?: boolean;
  disabled?: boolean;
  saving?: boolean;
  savingAriaLabel?: string;
  onClick?: () => void | Promise<void>;
};

export type PermissionActionGroupDefinition = {
  key: string;
  actions: PermissionActionDefinition[];
};

export type PermissionGroupActionBarProps = {
  groups: PermissionActionGroupDefinition[];
};
