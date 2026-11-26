import type { PageSearchFieldValue } from '../../../../../shared/components/page-search/searchFields';

export type SalesOrderStatusRow = {
  salesOrderId: number;
  salesOrderDetailId: number;
  orderNo: string;
  orderDt: string;
  customerCode: string;
  customerName: string;
  quotNo: string | null;
  status: string;
  headerDeliveryDt: string | null;
  deliveryPlace: string | null;
  deliveryMethod: string | null;
  remark: string | null;
  lineNo: number;
  materialCode: string;
  materialName: string;
  unit: string | null;
  orderQty: number | string;
  unitPrice: number | string;
  supplyAmt: number | string;
  vatAmt: number | string;
  totalAmt: number | string;
  deliveryDt: string | null;
  shippedQty: number | string;
  lineStatus: string;
};

export type SalesOrderStatusFilters = {
  keyword?: string;
  orderNo?: string;
  orderDtFrom?: string;
  orderDtTo?: string;
  customerKeyword?: string;
  quotNo?: string;
  status?: string;
  deliveryDtFrom?: string;
  deliveryDtTo?: string;
  materialKeyword?: string;
  lineStatus?: string;
};

export type SalesOrderStatusSearchValues = Record<string, PageSearchFieldValue>;

export type SalesOrderStatusSearchSession = {
  keyword: string;
  detailValues: SalesOrderStatusSearchValues;
};

export type SalesOrderStatusListResponse = {
  resultList?: SalesOrderStatusRow[];
  resultCnt?: number;
};
