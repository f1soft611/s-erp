import type { PageSearchFieldValue } from '../../../../../shared/components/page-search/searchFields';

export type PurchaseRequestStatusRow = {
  purchaseRequestId: number;
  purchaseRequestDetailId: number;
  requestNo: string;
  requestDt: string;
  requesterName: string | null;
  requestDeptName: string | null;
  status: string;
  remark: string | null;
  lineNo: number;
  materialCode: string | null;
  materialName: string | null;
  materialSpec: string | null;
  unit: string | null;
  requestQty: number;
  requestDeliveryDt: string | null;
  useType: string | null;
  useTypeName: string | null;
  requestRemark: string | null;
  confirmQty: number | null;
};

export type PurchaseRequestStatusFilters = {
  keyword?: string;
  requestNo?: string;
  requestDtFrom?: string;
  requestDtTo?: string;
  requesterKeyword?: string;
  status?: string;
  materialKeyword?: string;
  requestDeliveryDtFrom?: string;
  requestDeliveryDtTo?: string;
  useType?: string;
};

export type PurchaseRequestStatusSearchValues = Record<string, PageSearchFieldValue>;

export type PurchaseRequestStatusSearchSession = {
  keyword: string;
  detailValues: PurchaseRequestStatusSearchValues;
};

export type PurchaseRequestStatusListResponse = {
  resultList?: PurchaseRequestStatusRow[];
  resultCnt?: number;
};
