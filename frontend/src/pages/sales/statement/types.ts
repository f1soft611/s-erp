import type { DeliveryPageProps } from '../delivery/create/types/salesDelivery.types';

export type StatementPageProps = DeliveryPageProps;

export type StatementDetail = {
  salesStatementDetailId: number;
  lineNo: number;
  materialCode: string | null;
  materialName: string | null;
  materialSpec: string | null;
  unit: string | null;
  deliveryQty: number;
  unitPrice: number;
  supplyAmt: number;
  vatAmt: number;
  totalAmt: number;
};

export type StatementItem = {
  salesStatementId: number;
  salesDeliveryId: number;
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
  totalAmt: number;
  remark?: string | null;
  createdBy?: string | null;
  createdByName?: string | null;
  createdByProfileImage?: string | null;
  createdAt?: string | null;
  details: StatementDetail[];
};

export type StatementSource = {
  salesDeliveryId: number;
  deliveryNo: string;
  deliveryDt: string;
  deliveryType: 'DIRECT' | 'ORDER';
  customerName: string;
  totalAmt: number;
};

export type StatementStatusRow = StatementDetail & {
  salesStatementId: number;
  statementNo: string;
  statementDt: string;
  deliveryNo: string;
  customerCode: string;
  customerName: string;
  lineTotalAmt: number;
};

export type StatementPayload = {
  salesDeliveryId: number;
  statementDt: string;
  remark: string;
};
