export type ItemPriceCustomerRegisterFilter = 'ALL' | 'REGISTERED' | 'UNREGISTERED';

export type ItemPriceCustomerFilters = {
  /** 화면의 거래구분. 서버가 필수로 요구한다. */
  tradeType?: '매입' | '매출';
  keyword?: string;
  registerFilter?: ItemPriceCustomerRegisterFilter;
  /** 품목 계정분류 코드(쉼표 구분). 비우면 전체. */
  itemTypes?: string;
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
