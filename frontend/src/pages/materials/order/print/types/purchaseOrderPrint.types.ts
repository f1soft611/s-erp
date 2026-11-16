export type PurchaseOrderPrintDetail = {
  lineNo: number;
  materialCode: string | null;
  materialName: string | null;
  materialSpec: string | null;
  unit: string | null;
  orderQty: number;
  unitPrice: number | null;
  /** 행마다 다를 수 있는 납기일 */
  deliveryDt: string | null;
  supplyAmt: number;
  vatAmt: number;
  totalAmt: number;
  remark: string | null;
};

/** 발주서 출력 데이터. 회사·구매처·발주자는 발주 저장 시 복사한 스냅샷(없는 기존 발주는 현재 정보)이다. */
export type PurchaseOrderPrintData = {
  purchaseOrderId: number;
  orderNo: string;
  orderDt: string;
  currencyCode: string;
  taxType: string;
  vatIncludedAt: 'Y' | 'N';
  supplyAmt: number;
  vatAmt: number;
  totalAmt: number;
  remark: string | null;
  printAt: 'Y' | 'N';
  companyName: string | null;
  companyBusinessNo: string | null;
  companyPresidentName: string | null;
  companyPostCode: string | null;
  companyAddress: string | null;
  companyTelephoneNo: string | null;
  companyFacsimileNo: string | null;
  companyStampImage: string | null;
  companyLogoImage: string | null;
  vendorName: string | null;
  vendorBusinessNo: string | null;
  vendorPresidentName: string | null;
  vendorPostCode: string | null;
  vendorAddress: string | null;
  vendorTelephoneNo: string | null;
  vendorFacsimileNo: string | null;
  vendorCharge: string | null;
  ordererName: string | null;
  ordererMobileNo: string | null;
  details: PurchaseOrderPrintDetail[];
};
