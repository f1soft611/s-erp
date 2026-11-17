import type { PageSearchFieldValue } from '../../../../../shared/components/page-search/searchFields';

export type MaterialArrivalStatusRow = {
  materialArrivalId: number;
  materialArrivalDetailId: number;
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

export type MaterialArrivalStatusFilters = {
  keyword?: string;
  arrivalNo?: string;
  arrivalDtFrom?: string;
  arrivalDtTo?: string;
  supplierKeyword?: string;
  status?: string;
  materialKeyword?: string;
  orderNo?: string;
};

export type MaterialArrivalStatusSearchValues = Record<string, PageSearchFieldValue>;

export type MaterialArrivalStatusSearchSession = {
  keyword: string;
  detailValues: MaterialArrivalStatusSearchValues;
};

export type MaterialArrivalStatusListResponse = {
  resultList?: MaterialArrivalStatusRow[];
  resultCnt?: number;
};
