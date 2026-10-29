export type ItemPartnerPriceTradeType = '매입' | '매출';
export type ItemPartnerPriceUseAt = 'Y' | 'N';

export type ItemPartnerPriceFilters = {
  keyword?: string;
  tradeType?: ItemPartnerPriceTradeType | '';
  effectiveOn?: string;
  useAt?: ItemPartnerPriceUseAt | '';
};

export type ItemPartnerPriceRow = {
  priceId: number | string;
  tenantId?: number;
  materialId: number | null;
  materialCode: string;
  materialName: string;
  customerId: number | null;
  customerCode: string;
  customerName: string;
  tradeType: ItemPartnerPriceTradeType | '';
  unitPrice: number | null;
  currency: string;
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
  | 'startDt' | 'endDt' | 'moq' | 'useAt'
>;

export type ItemPartnerPriceBatchPayload = {
  prices: {
    insertedRows: (ItemPartnerPricePayload & { priceId: string })[];
    updatedRows: (ItemPartnerPricePayload & { priceId: string })[];
    deletedRows: (ItemPartnerPricePayload & { priceId: string })[];
  };
};

export type ItemPartnerPriceImportRow = {
  sourceRowNumber: number;
  tradeType: string;
  materialCode: string;
  customerCode: string;
  unitPrice: string;
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
    currency: 'KRW',
    startDt: '',
    endDt: null,
    moq: null,
    useAt: 'Y',
  };
}
