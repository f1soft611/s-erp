import type { PageSearchFieldValue } from '../../../../../shared/components/page-search/searchFields';

export type PurchaseReceiptStatusRow = {
  purchaseReceiptId: number;
  purchaseReceiptDetailId: number;
  receiptNo: string;
  receiptDt: string;
  supplierName: string | null;
  receiverName: string | null;
  status: 'ACTIVE' | 'CANCELED';
  taxType: string;
  taxTypeName: string | null;
  vatIncludedAt: 'Y' | 'N';
  headerSupplyAmt: number;
  headerVatAmt: number;
  headerTotalAmt: number;
  headerRemark: string | null;
  lineNo: number;
  arrivalNo: string | null;
  /** 연결된 가입고 헤더 ID. 가입고 행이 삭제돼 연결이 끊기면 null이다. */
  purchaseArrivalId: number | null;
  /** 연결된 가입고가 정상이면 true. 링크 활성화 기준이다. */
  arrivalLinked: boolean | null;
  /** 입고한 수입검사의 검사번호. 무검사 입고 행은 null이다. */
  inspectionNo: string | null;
  /** 매입마감월 YYYYMM. 미마감이면 null이다. */
  closingMonth: string | null;
  orderNo: string | null;
  materialCode: string | null;
  materialName: string | null;
  materialSpec: string | null;
  unit: string | null;
  receiptQty: number;
  unitPrice: number;
  supplyAmt: number;
  vatAmt: number;
  totalAmt: number;
  warehouseName: string | null;
  manufactureDt: string | null;
  expireDt: string | null;
  lotNo: string | null;
  remark: string | null;
  createdByName: string | null;
};

export type PurchaseReceiptStatusFilters = {
  keyword?: string;
  receiptNo?: string;
  receiptDtFrom?: string;
  receiptDtTo?: string;
  supplierKeyword?: string;
  /** ACTIVE 정상(기본), CANCELED 취소, ALL 전체(취소 포함) */
  status?: string;
  materialKeyword?: string;
  orderNo?: string;
  arrivalNo?: string;
};

export type PurchaseReceiptStatusSearchValues = Record<string, PageSearchFieldValue>;

export type PurchaseReceiptStatusSearchSession = {
  keyword: string;
  detailValues: PurchaseReceiptStatusSearchValues;
};

export type PurchaseReceiptStatusListResponse = {
  resultList?: PurchaseReceiptStatusRow[];
  resultCnt?: number;
};
