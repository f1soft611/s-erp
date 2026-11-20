import { useEffect, useState } from 'react';
import {
  fetchCommonCodeGroups,
  fetchCommonCodeItems,
} from '../../common-code/services/commonCodeManagement.service';
import type { ItemPartnerPriceCodeOptions } from '../components/itemPartnerPriceGridModel';

const TAX_TYPE_GROUP = 'PURCHASE_TAX_TYPE';
const CURRENCY_GROUP = 'CURRENCY';
const ORDER_TYPE_GROUP = 'PURCHASE_ORDER_TYPE';

async function loadOptions(groupCode: string) {
  const groups = await fetchCommonCodeGroups();
  const group = groups.find((candidate) => candidate.groupCode === groupCode);
  if (!group) return [];
  const items = await fetchCommonCodeItems(group.id);
  return items
    .filter((item) => item.useAt === 'Y')
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((item) => ({ value: item.itemCode, label: item.itemNm }));
}

/** 부가세구분·통화·발주구분 공통코드 항목을 불러온다. 실패하면 빈 목록으로 두고 서버 검증에 맡긴다. */
export function useItemPartnerPriceCodes(): ItemPartnerPriceCodeOptions {
  const [options, setOptions] = useState<ItemPartnerPriceCodeOptions>({});
  useEffect(() => {
    let cancelled = false;
    void Promise.all([loadOptions(TAX_TYPE_GROUP), loadOptions(CURRENCY_GROUP), loadOptions(ORDER_TYPE_GROUP)])
      .then(([taxTypes, currencies, orderTypes]) => {
        if (!cancelled) setOptions({ taxTypes, currencies, orderTypes });
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);
  return options;
}
