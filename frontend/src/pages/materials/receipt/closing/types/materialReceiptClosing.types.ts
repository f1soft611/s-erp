import type { PageSearchFieldValue } from '../../../../../shared/components/page-search/searchFields';

export type ClosingTaxType = 'TAXABLE' | 'ZERO_RATED' | 'EXEMPT';

/** 구매처별 요약(왼쪽 그리드). */
export type MaterialReceiptClosingSupplier = {
  supplierId: number;
  supplierCode: string | null;
  supplierName: string | null;
  businessNo: string | null;
  receiptCount: number;
  receiptAmount: number;
  monthClosedCount: number;
  monthClosedAmount: number;
  openCount: number;
};

/** 입고 행(오른쪽 그리드). 마감 행은 마감 값, 미마감 행은 입고 값이다. */
export type MaterialReceiptClosingRow = {
  materialReceiptId: number;
  materialReceiptDetailId: number;
  receiptNo: string;
  receiptDt: string;
  supplierId: number;
  supplierName: string | null;
  materialCode: string | null;
  materialName: string | null;
  materialSpec: string | null;
  unit: string | null;
  orderNo: string | null;
  inspectionNo: string | null;
  receiptQty: number;
  unitPrice: number;
  taxType: ClosingTaxType;
  vatIncludedAt: 'Y' | 'N';
  supplyAmt: number;
  vatAmt: number;
  totalAmt: number;
  warehouseName: string | null;
  remark: string | null;
  closingMonth: string | null;
  closedAt: string | null;
  closedBy: string | null;
  closed: boolean;
};

export type MaterialReceiptClosingFilters = {
  keyword?: string;
  receiptFrom?: string;
  receiptTo?: string;
  /** YYYYMM */
  closingMonth: string;
  /** ALL 기간 내 전체(기본), OPEN 미마감, CLOSED 선택 마감월로 마감된 행 */
  closeType: string;
  orderNo?: string;
};

export type MaterialReceiptClosingSearchValues = Record<string, PageSearchFieldValue>;

export type MaterialReceiptClosingSearchSession = {
  keyword: string;
  detailValues: MaterialReceiptClosingSearchValues;
};

/** 마감 요청 한 행. 금액은 서버가 계산하므로 보내지 않는다. */
export type MaterialReceiptClosingRequestRow = {
  receiptDetailId: number;
  unitPrice: number;
  taxType: ClosingTaxType;
  vatIncludedAt: 'Y' | 'N';
};

/** 검색 영역 정의용 모델(상세검색 필드만 쓴다). */
export type MaterialReceiptClosingSearchModel = {
  receiptDt: string;
  closingMonth: string;
  closeType: string;
  orderNo: string;
};
