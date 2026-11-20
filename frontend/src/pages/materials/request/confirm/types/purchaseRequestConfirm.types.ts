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
  taxType?: string | null;
  vatIncludedAt?: string | null;
  /** 요청 불러오기 때 기본 거래처 단가에서 채운 외화단가·통화. */
  foreignUnitPrice?: number | null;
  foreignCurrency?: string | null;
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
    taxType: string;
    vatIncludedAt: 'Y' | 'N';
    confirmRemark: string | null;
  }[];
};

export type PurchaseRequestOrderClosePayload = {
  details: { purchaseRequestDetailId: number; orderCloseAt: 'Y' | 'N' }[];
};

/** 단가관리에서 가져온 구매 단가. currency·unitPrice는 서버가 기본 설정(원화 우선, 외화단가만 있으면 외화)을 정해 내려준다. */
export type PurchaseUnitPrice = {
  unitPrice: number;
  currency: string;
  taxType?: string | null;
  vatIncludedAt?: string | null;
  foreignUnitPrice?: number | null;
  foreignCurrency?: string | null;
  /** 선택된 단가 행의 발주구분 코드. 없으면 null. */
  orderType?: string | null;
};

export type ConfirmSelectOption = { value: string; label: string };
