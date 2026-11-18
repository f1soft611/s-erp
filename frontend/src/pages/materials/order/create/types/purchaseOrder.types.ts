export type PurchaseOrderSourceType = 'CONFIRM' | 'DIRECT';

export type PurchaseOrderTaxType = 'TAXABLE' | 'ZERO_RATED' | 'EXEMPT';

export type PurchaseOrderSelectOption = { value: string; label: string };

/** 발주 대상 확정 품목 행(잔량 포함). 재고량은 재고 설계 후 연결하므로 지금은 null이다. */
export type PurchaseOrderCandidate = {
  purchaseRequestDetailId: number;
  requestNo: string;
  confirmNo: string;
  confirmDt: string;
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
  confirmQty: number;
  orderedQty: number;
  remainQty: number;
  requestDeliveryDt: string | null;
  confirmDeliveryDt: string | null;
  warehouseId: number | null;
  warehouseName: string | null;
  unitPrice: number | null;
  currencyCode: string | null;
  /** 확정 시 설정한 부가세구분·포함. 없으면(기존 확정) 과세·미포함으로 본다. */
  taxType?: string | null;
  vatIncludedAt?: string | null;
  orderType: string | null;
  orderTypeName: string | null;
  useType: string | null;
  useTypeName: string | null;
  remark: string | null;
  stockQty: number | null;
};

export type PurchaseOrderMaterialDefault = {
  materialId: number;
  materialTypeCode: string | null;
  inspectAt: 'Y' | 'N';
};

export type PurchaseOrderPayload = {
  sourceType: PurchaseOrderSourceType;
  orderDt: string;
  supplierId: number;
  currencyCode: string;
  warehouseId: number | null;
  taxType: PurchaseOrderTaxType;
  vatIncludedAt: 'Y' | 'N';
  remark: string | null;
  orderType: string | null;
  useType: string | null;
  details: {
    /** 수정 요청에서 기존 발주 행을 가리킨다. 등록 요청은 null */
    purchaseOrderDetailId: number | null;
    purchaseRequestDetailId: number | null;
    materialId: number | null;
    orderQty: number;
    unitPrice: number | null;
    deliveryDt: string;
    warehouseId: number;
    inspectAt: 'Y' | 'N';
    vatAmt: number;
    remark: string | null;
  }[];
};

/** 저장된 발주 상세 행. confirm* 값은 확정 기준값이다(직접 발주는 발주 값과 같다). */
export type PurchaseOrderDetailItem = {
  purchaseOrderDetailId: number;
  lineNo: number;
  purchaseRequestDetailId: number;
  requestNo: string | null;
  confirmNo: string | null;
  materialId: number;
  materialCode: string | null;
  materialName: string | null;
  materialSpec: string | null;
  unit: string | null;
  orderQty: number;
  unitPrice: number | null;
  deliveryDt: string;
  warehouseId: number;
  warehouseName: string | null;
  orderType: string;
  orderTypeName: string | null;
  useType: string;
  useTypeName: string | null;
  inspectAt: 'Y' | 'N';
  supplyAmt: number;
  vatAmt: number;
  totalAmt: number;
  receiptCloseAt: 'Y' | 'N';
  /** 가입고수량(불합격 제외). 0보다 크면 이 행은 수정할 수 없다. 상세 조회에서만 채워진다. */
  arrivedQty?: number | null;
  remark: string | null;
  confirmQty: number | null;
  remainQty: number | null;
  confirmSupplierId: number | null;
  confirmUnitPrice: number | null;
  confirmDeliveryDt: string | null;
  confirmWarehouseId: number | null;
};

export type PurchaseOrderItem = {
  purchaseOrderId: number;
  orderNo: string;
  orderDt: string;
  supplierId?: number;
  supplierCode?: string | null;
  supplierName: string | null;
  ordererName?: string | null;
  currencyCode: string;
  sourceType: PurchaseOrderSourceType;
  taxType?: PurchaseOrderTaxType;
  vatIncludedAt?: 'Y' | 'N';
  supplyAmt: number;
  vatAmt: number;
  totalAmt: number;
  printAt?: 'Y' | 'N';
  remark?: string | null;
  useAt?: 'Y' | 'N';
  details?: PurchaseOrderDetailItem[];
  overOrderedLineNos?: number[] | null;
};

export type PurchaseUnitPrice = { unitPrice: number; currency: string };
