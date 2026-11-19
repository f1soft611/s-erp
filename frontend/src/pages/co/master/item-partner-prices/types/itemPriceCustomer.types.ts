export type ItemPriceCustomerRegisterFilter = 'ALL' | 'REGISTERED' | 'UNREGISTERED';

export type ItemPriceCustomerFilters = {
  keyword?: string;
  registerFilter?: ItemPriceCustomerRegisterFilter;
  effectiveOn?: string;
};

/** 거래처 기준 화면의 거래처 행. priceCount는 기준일에 적용 중·예정인 (품목, 거래구분) 수. */
export type ItemPriceCustomerRow = {
  customerId: number;
  customerCode: string;
  customerName: string;
  businessNo: string;
  priceCount: number;
};
