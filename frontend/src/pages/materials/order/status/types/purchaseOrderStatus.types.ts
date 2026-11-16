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
