import type { ItemPartnerPriceBatchPayload, ItemPartnerPriceTradeType } from './itemPartnerPrice.types';

/**
 * 품목 기준 화면의 단가 상태 필터. 비우면 전체.
 * NO_PRICE=선택 거래구분의 단가 거래처가 없는 품목, NO_DEFAULT_SUPPLIER=거래처가 2곳 이상인데 기본 거래처가 없는 품목(매입만).
 */
export type ItemPriceOverviewFilter = 'ALL' | 'NO_PRICE' | 'NO_DEFAULT_SUPPLIER';

export type ItemPriceOverviewFilters = {
  /** 화면의 거래구분(매입단가등록=매입, 매출단가등록=매출). 서버가 필수로 요구한다. */
  tradeType?: ItemPartnerPriceTradeType;
  keyword?: string;
  priceFilter?: ItemPriceOverviewFilter;
  /** 품목 계정분류 코드(쉼표 구분). 비우면 전체. */
  itemTypes?: string;
};

/** 품목 기준 화면 왼쪽 목록의 품목 한 줄. 단가는 선택한 품목의 단가 목록 API로 따로 읽는다. */
export type ItemPriceOverviewRow = {
  materialId: number;
  materialCode: string;
  materialName: string;
  materialSpec: string;
  materialUnit: string;
  /** 품목 계정분류 코드(PRODUCT, SEMI, GOODS, RAW, SUB, SUPPLY). */
  materialTypeCode: string;
  /** 선택한 거래구분에서 사용 중 단가가 있는 거래처 수. */
  customerCount: number;
  /** 매입 기본 거래처. 매출이거나 지정하지 않았으면 비어 있다. */
  defaultSupplierId: number | null;
  defaultSupplierName: string;
};

export type ItemPriceOverviewBatch = ItemPartnerPriceBatchPayload;
