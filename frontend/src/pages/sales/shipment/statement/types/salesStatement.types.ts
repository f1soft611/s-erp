import type { DeliveryPageProps } from '../../delivery/create/types/salesDelivery.types';

export type StatementPageProps = DeliveryPageProps;

export type StatementDetail = {
  salesStatementDetailId: number;
  salesDeliveryDetailId: number | null;
  sourceDeliveryNo?: string | null;
  sourceDeliveryDt?: string | null;
  lineNo: number;
  materialCode: string | null;
  materialName: string | null;
  materialSpec: string | null;
  unit: string | null;
  deliveryQty: number | string;
  unitPrice: number | string;
  supplyAmt: number | string;
  vatAmt: number | string;
  totalAmt: number | string;
};

export type StatementItem = {
  salesStatementId: number;
  salesDeliveryId: number;
  customerId: number;
  statementNo: string;
  statementDt: string;
  deliveryNo: string;
  deliveryDt: string;
  deliveryType: 'DIRECT' | 'ORDER';
  orderNo: string | null;
  supplierName: string;
  supplierBusinessNo?: string | null;
  supplierPresidentName?: string | null;
  supplierBusinessType?: string | null;
  supplierBusinessCategory?: string | null;
  supplierPostCode?: string | null;
  supplierAddress?: string | null;
  supplierTelephoneNo?: string | null;
  supplierFacsimileNo?: string | null;
  supplierStampImage?: string | null;
  customerCode?: string | null;
  customerName?: string | null;
  customerBusinessNo?: string | null;
  customerPresidentName?: string | null;
  customerBusinessType?: string | null;
  customerBusinessCategory?: string | null;
  customerPostCode?: string | null;
  customerAddress?: string | null;
  customerTelephoneNo?: string | null;
  customerFacsimileNo?: string | null;
  totalAmt: number | string;
  remark?: string | null;
  createdBy?: string | null;
  createdByName?: string | null;
  createdByProfileImage?: string | null;
  createdAt?: string | null;
  details: StatementDetail[];
};

export type StatementSource = {
  salesDeliveryId: number;
  customerId: number;
  deliveryNo: string;
  deliveryDt: string;
  deliveryType: 'DIRECT' | 'ORDER';
  customerName: string;
  totalAmt: number | string;
  salesDeliveryDetailIds: number[];
};

export type StatementStatusRow = StatementDetail & {
  salesStatementId: number;
  statementNo: string;
  statementDt: string;
  deliveryNo: string;
  sourceDeliveryNo?: string | null;
  sourceDeliveryDt?: string | null;
  customerCode: string;
  customerName: string;
  lineTotalAmt: number | string;
};

export type StatementPayload = {
  salesDeliveryId: number;
  salesDeliveryDetailIds: number[];
  statementDt: string;
  remark: string;
};
