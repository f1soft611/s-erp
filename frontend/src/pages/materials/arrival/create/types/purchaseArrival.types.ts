import type { PurchaseOrderTaxType } from '../../../order/create/types/purchaseOrder.types';

/** 가입고 대상 발주 품목 행(잔량 포함). */
export type PurchaseArrivalCandidate = {
  purchaseOrderDetailId: number;
  orderNo: string;
  orderDt: string;
  taxType: PurchaseOrderTaxType;
  vatIncludedAt: 'Y' | 'N';
  supplierId: number | null;
  supplierCode: string | null;
  supplierName: string | null;
  materialId: number;
  materialCode: string | null;
  materialName: string | null;
  materialSpec: string | null;
  unit: string | null;
  materialTypeCode: string | null;
  inspectAt: 'Y' | 'N';
  orderQty: number;
  arrivedQty: number;
  remainQty: number;
  deliveryDt: string | null;
  warehouseId: number | null;
  warehouseName: string | null;
  unitPrice: number | null;
  currencyCode: string | null;
  orderTypeName: string | null;
  useTypeName: string | null;
  remark: string | null;
};

export type PurchaseArrivalPayload = {
  arrivalDt: string;
  supplierId: number;
  taxType: PurchaseOrderTaxType;
  vatIncludedAt: 'Y' | 'N';
  remark: string | null;
  details: {
    /** 수정 요청에서 기존 가입고 행을 가리킨다. 등록 요청은 null */
    purchaseArrivalDetailId: number | null;
    purchaseOrderDetailId: number;
    arrivalQty: number;
    unitPrice: number;
    warehouseId: number;
    vatAmt: number;
    manufactureDt: string | null;
    expireDt: string | null;
    remark: string | null;
  }[];
};

/** 저장된 가입고 상세 행. remainQty는 이 행을 제외한 다른 유효 가입고 수량을 뺀 발주 잔량(수량 상한)이다. */
export type PurchaseArrivalDetailItem = {
  purchaseArrivalDetailId: number;
  lineNo: number;
  purchaseOrderDetailId: number;
  orderNo: string | null;
  materialId: number;
  materialCode: string | null;
  materialName: string | null;
  materialSpec: string | null;
  unit: string | null;
  orderQty: number | null;
  remainQty: number | null;
  orderUnitPrice: number | null;
  orderWarehouseId: number | null;
  arrivalQty: number;
  unitPrice: number;
  supplyAmt: number;
  vatAmt: number;
  totalAmt: number;
  warehouseId: number;
  warehouseName: string | null;
  manufactureDt: string | null;
  expireDt: string | null;
  lotNo: string | null;
  inspectAt: 'Y' | 'N';
  remark: string | null;
  /** 이 행과 연결된 유효한 입고. 있으면 가입고에서 수정·삭제할 수 없다. */
  receiptId?: number | null;
  receiptNo?: string | null;
  /** 이 행에 유효한 수입검사가 있으면 가장 최근 검사. 있으면 가입고에서 수정·삭제할 수 없다. */
  inspectionId?: number | null;
  inspectionNo?: string | null;
};

export type PurchaseArrivalItem = {
  purchaseArrivalId: number;
  arrivalNo: string;
  arrivalDt: string;
  supplierId?: number;
  supplierCode?: string | null;
  supplierName: string | null;
  receiverName?: string | null;
  currencyCode: string;
  taxType?: PurchaseOrderTaxType;
  vatIncludedAt?: 'Y' | 'N';
  supplyAmt: number;
  vatAmt: number;
  totalAmt: number;
  remark?: string | null;
  useAt?: 'Y' | 'N';
  createdBy?: string | null;
  createdAt?: string | null;
  updatedBy?: string | null;
  updatedAt?: string | null;
  details?: PurchaseArrivalDetailItem[];
  /** 가입고 저장 직후 무검사 행으로 자동 등록된 입고(저장 응답에만 있다). */
  autoReceiptNo?: string | null;
  autoReceiptCount?: number | null;
};
