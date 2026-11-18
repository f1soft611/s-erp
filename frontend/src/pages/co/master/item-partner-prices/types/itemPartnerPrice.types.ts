export type ItemPartnerPriceTradeType = '매입' | '매출';
export type ItemPartnerPriceUseAt = 'Y' | 'N';

export type ItemPartnerPriceFilters = {
  keyword?: string;
  tradeType?: ItemPartnerPriceTradeType | '';
  effectiveOn?: string;
  useAt?: ItemPartnerPriceUseAt | '';
  /** true면 종료된 과거 단가도 조회한다. 기본은 현재 적용·예정 단가만. */
  includeHistory?: boolean;
  /** 지정하면 그 거래처의 단가만(기본단가 제외) 조회한다. */
  customerId?: number;
};

/** 현재(적용 중)·예정·과거(종료). 과거 행은 수정할 수 없다. */
export type ItemPartnerPriceStatus = 'past' | 'current' | 'future';

export type ItemPartnerPriceRow = {
  priceId: number | string;
  tenantId?: number;
  materialId: number | null;
  materialCode: string;
  materialName: string;
  /** null이면 품목 기본단가(거래처 공통). */
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

export type ItemPartnerPricePayload = Pick<
  ItemPartnerPriceRow,
  'materialId' | 'customerId' | 'tradeType' | 'unitPrice' | 'currency'
  | 'taxType' | 'vatIncludedAt' | 'foreignUnitPrice' | 'startDt' | 'endDt' | 'moq' | 'useAt'
>;

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
    startDt: '',
    endDt: null,
    moq: null,
    useAt: 'Y',
  };
}
