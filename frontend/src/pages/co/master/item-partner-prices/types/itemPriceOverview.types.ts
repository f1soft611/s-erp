import type { ItemPartnerPriceBatchPayload } from './itemPartnerPrice.types';

/** 품목 기준 화면의 단가 상태 필터. 비우면 전체. */
export type ItemPriceOverviewFilter = 'ALL' | 'NO_PURCHASE' | 'NO_SALES' | 'HAS_SPECIAL' | 'NO_DEFAULT_SUPPLIER';

export type ItemPriceOverviewFilters = {
  keyword?: string;
  priceFilter?: ItemPriceOverviewFilter;
  effectiveOn?: string;
};

export type ItemPriceSideKey = 'purchase' | 'sales';

/** 매입(purchase) 또는 매출(sales) 한쪽의 단가 칸. 그리드는 평면 필드(예: purchaseUnitPrice)를 쓴다. */
type SideFields<P extends ItemPriceSideKey> =
  { [K in `${P}PriceId`]: number | null } &
  { [K in `${P}UnitPrice`]: number | null } &
  { [K in `${P}TaxType`]: string } &
  { [K in `${P}VatIncludedAt`]: 'Y' | 'N' } &
  { [K in `${P}ForeignUnitPrice`]: number | null } &
  { [K in `${P}Currency`]: string } &
  { [K in `${P}Moq`]: number | null } &
  { [K in `${P}StartDt`]: string } &
  { [K in `${P}EndDt`]: string | null } &
  { [K in `${P}Status`]: 'current' | 'future' | '' } &
  { [K in `${P}OrderType`]: string } &
  { [K in `${P}OrderTypeName`]: string } &
  { [K in `${P}DefaultSupplier`]: boolean };

export type ItemPriceOverviewRow = {
  rowId: string;
  /** 부모(품목) 행은 null, 자식(거래처 특별단가) 행은 부모 rowId. */
  parentId: string | null;
  materialId: number | null;
  materialCode: string;
  materialName: string;
  materialSpec: string;
  materialUnit: string;
  /** 부모 행과 공통단가는 null. */
  customerId: number | null;
  customerCode: string;
  customerName: string;
  /** 트리 열에 보이는 이름: 부모는 품목, 자식은 거래처. */
  displayName: string;
  specialCount: number;
  specialLabel: string;
  /** 부모(품목) 행의 매입 기본 거래처. 없으면 빈 값. */
  defaultSupplierId: number | null;
  defaultSupplierName: string;
} & SideFields<'purchase'> & SideFields<'sales'>;

export type ItemPriceOverviewBatch = ItemPartnerPriceBatchPayload;
