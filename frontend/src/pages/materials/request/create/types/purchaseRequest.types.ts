export type PurchaseRequestStatus = 'REQUESTED' | 'CONFIRMED';

export type PurchaseRequestDetailItem = {
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
};

export type PurchaseRequestItem = {
  purchaseRequestId: number;
  requestNo: string;
  requestDt: string;
  requesterName: string | null;
  requestDeptName: string | null;
  status: PurchaseRequestStatus | string;
  remark: string | null;
  createdByName: string | null;
  createdAt: string | null;
  updatedByName: string | null;
  updatedAt: string | null;
  details: PurchaseRequestDetailItem[];
};

export type PurchaseRequestDetailPayload = {
  purchaseRequestDetailId: number | null;
  materialId: number;
  requestQty: number;
  requestDeliveryDt: string;
  useType: string;
  requestRemark: string | null;
};

export type PurchaseRequestPayload = {
  requestDt: string;
  remark: string | null;
  details: PurchaseRequestDetailPayload[];
};

export type PurchaseRequestResponse = {
  item?: PurchaseRequestItem | null;
};

export type PurchaseRequestUseTypeOption = {
  value: string;
  label: string;
};
