import type { PageSearchFieldValue } from '../../../../../shared/components/page-search/searchFields';

export type PurchaseOrderStatusRow = {
  purchaseOrderId: number;
  purchaseOrderDetailId: number;
  orderNo: string;
  orderDt: string;
  supplierName: string | null;
  ordererName: string | null;
  status: 'ACTIVE' | 'CANCELED';
  sourceType: 'CONFIRM' | 'DIRECT';
  taxType: string;
  taxTypeName: string | null;
  vatIncludedAt: 'Y' | 'N';
  headerSupplyAmt: number;
  headerVatAmt: number;
  headerTotalAmt: number;
  headerRemark: string | null;
  lineNo: number;
  confirmNo: string | null;
  requestNo: string | null;
  materialCode: string | null;
  materialName: string | null;
  materialSpec: string | null;
  unit: string | null;
  orderQty: number;
  /** 가입고수량: 유효 가입고 합 − 유효 수입검사 불합격 합 */
  arrivedQty: number;
  /** 입고잔량: 발주수량 − 가입고수량(0 미만이면 0) */
  remainQty: number;
  unitPrice: number | null;
  deliveryDt: string | null;
  warehouseName: string | null;
  inspectAt: 'Y' | 'N';
  receiptCloseAt: 'Y' | 'N';
  printAt: 'Y' | 'N';
  supplyAmt: number;
  vatAmt: number;
  totalAmt: number;
  orderTypeName: string | null;
  useTypeName: string | null;
  remark: string | null;
};

export type PurchaseOrderStatusFilters = {
  keyword?: string;
  orderNo?: string;
  orderDtFrom?: string;
  orderDtTo?: string;
  supplierKeyword?: string;
  status?: string;
  sourceType?: string;
  /** OPEN 입고대기 미마감, CLOSED 마감. 없으면 전체 */
  receiptCloseType?: string;
  materialKeyword?: string;
  deliveryDtFrom?: string;
  deliveryDtTo?: string;
};

export type PurchaseOrderStatusSearchValues = Record<string, PageSearchFieldValue>;

export type PurchaseOrderStatusSearchSession = {
  keyword: string;
  detailValues: PurchaseOrderStatusSearchValues;
};

export type PurchaseOrderStatusListResponse = {
  resultList?: PurchaseOrderStatusRow[];
  resultCnt?: number;
};
