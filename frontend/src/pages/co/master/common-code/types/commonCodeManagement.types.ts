export type CommonCodeModuleOption = { value: string; label: string };

export const COMMON_CODE_MODULE_COMMON_OPTION: CommonCodeModuleOption = {
  value: '',
  label: '공통',
};

export function normalizeModuleCd(value: unknown): string {
  return String(value ?? '').trim();
}

export type CommonCodeGroupRow = {
  id: string;
  groupCode: string;
  groupNm: string;
  moduleCd: string;
  parentGroupId: string | null;
  groupDc: string;
  sortOrder: number;
  useAt: 'Y' | 'N';
};

export type CommonCodeItemRow = {
  id: string;
  groupId: string;
  itemCode: string;
  itemNm: string;
  parentItemId: string | null;
  parentItemNm: string;
  sortOrder: number;
  useAt: 'Y' | 'N';
  itemDc: string;
};
