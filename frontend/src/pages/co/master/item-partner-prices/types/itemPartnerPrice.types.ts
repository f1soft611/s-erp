export type ItemPartnerPriceTradeType = '매입' | '매출';
export type ItemPartnerPriceUseAt = 'Y' | 'N';

export type ItemPartnerPriceFilters = {
  keyword?: string;
  tradeType?: ItemPartnerPriceTradeType | '';
  effectiveOn?: string;
  useAt?: ItemPartnerPriceUseAt | '';
  /** true면 종료된 과거 단가도 조회한다. 기본은 현재 적용·예정 단가만. */
  includeHistory?: boolean;
  /** 지정하면 그 거래처의 단가만 조회한다. */
  customerId?: number;
  /** 지정하면 그 품목의 단가만 조회한다. */
  materialId?: number;
  /** 품목 계정분류 코드(쉼표 구분). 비우면 전체. */
  itemTypes?: string;
};

/** 현재(적용 중)·예정·과거(종료). 과거 행은 수정할 수 없다. */
export type ItemPartnerPriceStatus = 'past' | 'current' | 'future';

export type ItemPartnerPriceRow = {
  priceId: number | string;
  tenantId?: number;
  materialId: number | null;
  materialCode: string;
  materialName: string;
  /** 저장된 단가는 항상 거래처가 있다. 새 행은 거래처를 고르기 전까지 null이다. */
  customerId: number | null;
  customerCode: string;
  customerName: string;
  tradeType: ItemPartnerPriceTradeType | '';
  unitPrice: number | null;
  taxType: string;
  vatIncludedAt: 'Y' | 'N';
  foreignUnitPrice: number | null;
  /** 외화단가의 통화. 외화단가가 없으면 빈 값. */
  currency: string;
  /** 발주구분 코드(매입 단가만, 없으면 빈 값). */
  orderType: string;
  orderTypeName?: string;
  /** 이 거래처가 품목의 매입 기본 거래처인지(매입·거래처 단가만 의미가 있다). */
  defaultSupplier: boolean;
  materialUnit?: string;
  materialSpec?: string;
  priceStatus?: ItemPartnerPriceStatus;
  startDt: string;
  endDt: string | null;
  moq: number | null;
  useAt: ItemPartnerPriceUseAt;
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
};

/** defaultSupplier: true=기본 거래처로 지정, false=해제 요청(현재 기본일 때만), 생략=변경 없음. */
export type ItemPartnerPricePayload = Pick<
  ItemPartnerPriceRow,
  'materialId' | 'customerId' | 'tradeType' | 'unitPrice' | 'currency'
  | 'taxType' | 'vatIncludedAt' | 'foreignUnitPrice' | 'startDt' | 'endDt' | 'moq' | 'useAt'
  | 'orderType'
> & { defaultSupplier?: boolean };

export type ItemPartnerPriceBatchSaveInfo = {
  /** 서버가 매입 단가가 없어져 기본 거래처를 자동 해제한 품목 ID. */
  clearedDefaultMaterialIds: number[];
};

export type ItemPartnerPriceBatchPayload = {
  prices: {
    insertedRows: (ItemPartnerPricePayload & { priceId: string })[];
    updatedRows: (ItemPartnerPricePayload & { priceId: string })[];
    /** 삭제할 단가 ID. 적용 중·예정 단가만 서버가 삭제한다. */
    deletedRows: { priceId: string }[];
  };
};

export type ItemPartnerPriceImportRow = {
  sourceRowNumber: number;
  tradeType: string;
  materialCode: string;
  customerCode: string;
  unitPrice: string;
  taxType: string;
  vatIncludedAt: string;
  foreignUnitPrice: string;
  currency: string;
  orderType: string;
  /** Y 또는 N. 비우면 기본 거래처를 바꾸지 않는다. */
  defaultSupplier: string;
  startDt: string;
  endDt: string | null;
  moq: string | null;
  useAt: string;
  errors: string[];
  materialId?: number;
  materialName?: string;
  customerId?: number;
  customerName?: string;
};

export type ItemPartnerPriceImportRequestRow = Omit<ItemPartnerPriceImportRow, 'errors'
  | 'materialId' | 'materialName' | 'customerId' | 'customerName'>;

export type ItemPartnerPriceImportError = {
  code: string;
  message: string;
};

export type ItemPartnerPriceImportValidationRow = {
  sourceRowNumber: number;
  materialId?: number;
  materialCode?: string;
  materialName?: string;
  customerId?: number;
  customerCode?: string;
  customerName?: string;
  /** 서버가 공통코드로 확인한 발주구분 코드. */
  orderType?: string;
  errors: ItemPartnerPriceImportError[];
};

export type ItemPartnerPriceImportValidation = {
  rows: ItemPartnerPriceImportValidationRow[];
};

export const itemPartnerPriceHeaders = [
  '거래구분',
  '품목코드',
  '거래처코드',
  '단가',
  '부가세구분',
  '부가세포함',
  '외화단가',
  '통화',
  '적용시작일',
  '적용종료일',
  '최소주문수량',
  '사용여부',
  '발주구분',
  '기본거래처',
] as const;

export function emptyItemPartnerPricePayload(): ItemPartnerPricePayload {
  return {
    materialId: null,
    customerId: null,
    tradeType: '',
    unitPrice: null,
    taxType: 'TAXABLE',
    vatIncludedAt: 'N',
    foreignUnitPrice: null,
    currency: '',
    orderType: '',
    defaultSupplier: false,
    startDt: '',
    endDt: null,
    moq: null,
    useAt: 'Y',
  };
}
