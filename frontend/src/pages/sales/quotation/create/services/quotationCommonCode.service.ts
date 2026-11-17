import {
  fetchCommonCodeGroups,
  fetchCommonCodeItems,
} from '../../../../co/master/common-code/services/commonCodeManagement.service';

export type QuotationCodeOption = { value: string; label: string };
export const QUOTATION_CODE_GROUPS = {
  INCOTERMS: 'Incoterms',
  PAYMENT_TERM: '결제조건',
  CURRENCY: '화폐단위',
  ITEM_UNIT: '단위',
} as const;
export type QuotationCodeGroup = keyof typeof QUOTATION_CODE_GROUPS;
export type QuotationCommonCodes = Record<QuotationCodeGroup, QuotationCodeOption[]>;

export async function fetchQuotationCommonCodes(): Promise<QuotationCommonCodes> {
  const groups = await fetchCommonCodeGroups();
  const entries = await Promise.all(
    (Object.keys(QUOTATION_CODE_GROUPS) as QuotationCodeGroup[]).map(async (code) => {
      const group = groups.find((candidate) => candidate.groupCode === code && candidate.useAt === 'Y');
      const items = group ? await fetchCommonCodeItems(group.id) : [];
      return [code, items
        .filter((item) => item.useAt === 'Y')
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((item) => ({ value: item.itemCode, label: item.itemNm }))] as const;
    }),
  );
  return Object.fromEntries(entries) as QuotationCommonCodes;
}
