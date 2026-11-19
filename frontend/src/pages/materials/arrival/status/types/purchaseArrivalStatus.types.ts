import type { PageSearchFieldValue } from '../../../../../shared/components/page-search/searchFields';

export type PurchaseArrivalStatusRow = {
  purchaseArrivalId: number;
  purchaseArrivalDetailId: number;
  arrivalNo: string;
  arrivalDt: string;
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
  orderNo: string | null;
  materialCode: string | null;
  materialName: string | null;
  materialSpec: string | null;
  unit: string | null;
  orderQty: number;
  arrivalQty: number;
  unitPrice: number;
  supplyAmt: number;
  vatAmt: number;
  totalAmt: number;
  warehouseName: string | null;
  manufactureDt: string | null;
  expireDt: string | null;
  lotNo: string | null;
  inspectAt: 'Y' | 'N';
  remark: string | null;
};

export type PurchaseArrivalStatusFilters = {
  keyword?: string;
  arrivalNo?: string;
  arrivalDtFrom?: string;
  arrivalDtTo?: string;
  supplierKeyword?: string;
  status?: string;
  materialKeyword?: string;
  orderNo?: string;
};

export type PurchaseArrivalStatusSearchValues = Record<string, PageSearchFieldValue>;

export type PurchaseArrivalStatusSearchSession = {
  keyword: string;
  detailValues: PurchaseArrivalStatusSearchValues;
};

export type PurchaseArrivalStatusListResponse = {
  resultList?: PurchaseArrivalStatusRow[];
  resultCnt?: number;
};
