import {
  fetchCommonCodeGroups,
  fetchCommonCodeItems,
} from '../../../co/master/common-code/services/commonCodeManagement.service';

export type SalesOrderCodeOption = {
  value: string;
  label: string;
};

export type SalesOrderCommonCodes = {
  orderStatusOptions: SalesOrderCodeOption[];
  progressStatusOptions: SalesOrderCodeOption[];
  deliveryMethodOptions: SalesOrderCodeOption[];
};

const SALES_ORDER_CODE_GROUPS = {
  orderStatus: 'SALES_ORDER_STATUS',
  deliveryMethod: 'SALES_DELIVERY_METHOD',
} as const;

const HEADER_ORDER_STATUS_CODES = new Set([
  '수주등록',
  '생산대기',
  '생산중',
  '출하완료',
  '취소',
]);

function toOptions(
  items: Awaited<ReturnType<typeof fetchCommonCodeItems>>,
): SalesOrderCodeOption[] {
  return items
    .filter((item) => item.useAt === 'Y')
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((item) => ({ value: item.itemCode, label: item.itemNm }));
}

export async function fetchSalesOrderCommonCodes(): Promise<SalesOrderCommonCodes> {
  const groups = await fetchCommonCodeGroups();
  const statusGroup = groups.find(
    (group) => group.groupCode === SALES_ORDER_CODE_GROUPS.orderStatus && group.useAt === 'Y',
  );
  const deliveryMethodGroup = groups.find(
    (group) => group.groupCode === SALES_ORDER_CODE_GROUPS.deliveryMethod && group.useAt === 'Y',
  );
  const [statusItems, deliveryMethodItems] = await Promise.all([
    statusGroup ? fetchCommonCodeItems(statusGroup.id) : Promise.resolve([]),
    deliveryMethodGroup ? fetchCommonCodeItems(deliveryMethodGroup.id) : Promise.resolve([]),
  ]);
  const progressStatusOptions = toOptions(statusItems);

  return {
    orderStatusOptions: progressStatusOptions.filter((option) =>
      HEADER_ORDER_STATUS_CODES.has(option.value),
    ),
    progressStatusOptions,
    deliveryMethodOptions: toOptions(deliveryMethodItems),
  };
}

export function getSalesOrderCodeLabel(
  options: SalesOrderCodeOption[],
  value: string | null | undefined,
): string {
  if (!value) return '';
  return options.find((option) => option.value === value)?.label ?? value;
}
