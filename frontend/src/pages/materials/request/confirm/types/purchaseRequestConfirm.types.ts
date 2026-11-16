export type PurchaseConfirmStatusFilter = 'ACTIVE' | 'CANCELED' | 'ALL';

/** 확정 대상 품목 행(확정되지 않은 구매요청 상세) */
export type PurchaseRequestConfirmCandidate = {
  purchaseRequestId: number;
  purchaseRequestDetailId: number;
  requestNo: string;
  requestDt: string;
  requesterName: string | null;
  requestStatus: string;
  lineNo: number;
  materialCode: string | null;
  materialName: string | null;
  materialSpec: string | null;
  unit: string | null;
  requestQty: number;
  requestDeliveryDt: string;
  useTypeName: string | null;
  requestRemark: string | null;
};

export type PurchaseRequestConfirmDetail = {
  purchaseRequestId: number;
  requestNo: string;
  requestDt: string;
  requesterName: string | null;
  requestDeptName: string | null;
  purchaseRequestDetailId: number;
  lineNo: number;
  materialId: number;
  materialCode: string | null;
  materialName: string | null;
  materialSpec: string | null;
  unit: string | null;
  requestQty: number;
  requestDeliveryDt: string;
  useType: string;
  useTypeName: string | null;
  requestRemark: string | null;
  confirmQty: number | null;
  confirmDeliveryDt: string | null;
  warehouseId: number | null;
  warehouseName: string | null;
  orderType: string | null;
  orderTypeName: string | null;
  supplierId: number | null;
  supplierCode: string | null;
  supplierName: string | null;
  unitPrice: number | null;
  currencyCode: string | null;
  amount: number | null;
  confirmRemark: string | null;
  orderCloseAt: string | null;
};

export type PurchaseConfirmItem = {
  purchaseConfirmId: number;
  confirmNo: string;
  confirmDt: string;
  confirmerName: string | null;
  currencyCode: string;
  totalAmt: number | null;
  remark: string | null;
  useAt: 'Y' | 'N';
  updatedByName: string | null;
  updatedAt: string | null;
  details: PurchaseRequestConfirmDetail[];
};

export type PurchaseConfirmListItem = {
  purchaseConfirmId: number;
  confirmNo: string;
  confirmDt: string;
  confirmerName: string | null;
  currencyCode: string;
  totalAmt: number | null;
  requestCount: number;
  remark: string | null;
  useAt: 'Y' | 'N';
};

export type PurchaseRequestConfirmPayload = {
  confirmDt: string;
  remark: string | null;
  details: {
    purchaseRequestDetailId: number;
    confirmQty: number;
    confirmDeliveryDt: string;
    warehouseId: number;
    orderType: string;
    supplierId: number;
    unitPrice: number | null;
    currencyCode: string;
    confirmRemark: string | null;
  }[];
};

export type PurchaseRequestOrderClosePayload = {
  details: { purchaseRequestDetailId: number; orderCloseAt: 'Y' | 'N' }[];
};

export type PurchaseUnitPrice = { unitPrice: number; currency: string };

export type ConfirmSelectOption = { value: string; label: string };
