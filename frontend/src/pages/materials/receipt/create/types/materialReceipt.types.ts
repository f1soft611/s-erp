import type { PurchaseOrderTaxType } from '../../../order/create/types/purchaseOrder.types';

/** 입고 가능한 수입검사 합격분 행(불러오기 창). receivableQty는 합격량에서 유효 입고 합을 뺀 입고 가능량이다. */
export type MaterialReceiptCandidate = {
  materialInspectionDetailId: number;
  materialInspectionId: number;
  inspectionNo: string;
  inspectionDt: string;
  materialArrivalDetailId: number;
  arrivalNo: string;
  supplierId: number;
  supplierCode: string | null;
  supplierName: string | null;
  currencyCode: string | null;
  taxType: PurchaseOrderTaxType | null;
  vatIncludedAt: 'Y' | 'N' | null;
  purchaseOrderDetailId: number;
  orderNo: string | null;
  materialId: number;
  materialCode: string | null;
  materialName: string | null;
  materialSpec: string | null;
  unit: string | null;
  passQty: number;
  receivedQty: number;
  receivableQty: number;
  unitPrice: number | null;
  warehouseId: number | null;
  warehouseName: string | null;
  manufactureDt: string | null;
  expireDt: string | null;
};

export type MaterialReceiptCandidateResult = {
  rows: MaterialReceiptCandidate[];
  /** 조회 조건과 무관한 전체 입고 가능 건수. */
  total: number;
};

export type MaterialReceiptPayload = {
  receiptDt: string;
  taxType: PurchaseOrderTaxType;
  vatIncludedAt: 'Y' | 'N';
  remark: string | null;
  details: {
    /** 수정 요청에서 기존 입고 행을 가리킨다. 요청에 없는 기존 행은 삭제된다. */
    materialReceiptDetailId?: number;
    /** 등록 요청에서 입고할 수입검사 행을 가리킨다. */
    materialInspectionDetailId?: number;
    receiptQty: number;
    unitPrice: number;
    warehouseId: number;
    vatAmt: number;
    manufactureDt: string | null;
    expireDt: string | null;
    remark: string | null;
  }[];
};

/**
 * 저장된 입고 상세 행. remainQty는 이 행의 가입고 수량을 제외한 다른 유효 가입고 수량을 뺀 발주 잔량(수량 상한 참고값)이다.
 * inspectAt이 'N'이고 arrivalActive가 'Y'인 행(무검사)은 수정·삭제가 연결된 가입고 행에도 반영된다.
 */
export type MaterialReceiptDetailItem = {
  materialReceiptDetailId: number;
  lineNo: number;
  materialArrivalDetailId: number | null;
  materialArrivalId: number | null;
  arrivalActive: 'Y' | 'N' | null;
  inspectAt: 'Y' | 'N' | null;
  arrivalNo: string | null;
  /** 입고한 수입검사 행. 무검사 입고 행이면 null이다. */
  materialInspectionDetailId?: number | null;
  inspectionNo?: string | null;
  purchaseOrderDetailId: number;
  orderNo: string | null;
  materialId: number;
  materialCode: string | null;
  materialName: string | null;
  materialSpec: string | null;
  unit: string | null;
  orderQty: number | null;
  remainQty: number | null;
  arrivalQty: number | null;
  /** 검사 연결 행의 입고수량 상한(합격량 − 이 입고를 제외한 유효 입고 합). 무검사 행은 null이다. */
  receivableQty?: number | null;
  receiptQty: number;
  unitPrice: number;
  supplyAmt: number;
  vatAmt: number;
  totalAmt: number;
  warehouseId: number;
  warehouseName: string | null;
  manufactureDt: string | null;
  expireDt: string | null;
  lotNo: string | null;
  remark: string | null;
  /** 매입마감월 YYYYMM(미마감이면 null). 마감된 행이 있는 입고는 수정·취소할 수 없다. */
  closingMonth?: string | null;
};

export type MaterialReceiptItem = {
  materialReceiptId: number;
  receiptNo: string;
  receiptDt: string;
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
  details?: MaterialReceiptDetailItem[];
};
