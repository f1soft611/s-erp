import type { MasterPickerOption } from '../../../../../shared/components/master-picker/masterPicker.types';
import type { GridDecimalModuleRule } from '../../../../../shared/services/gridDecimalPolicy.service';
import type { DecimalColumn } from '../../../../../shared/services/decimalColumnContract';
import type { QuotationDetailRow } from '../data/quotationDetail';
import type { SalesOrderDecimalValue } from '../../../order/create/data/salesOrderDetail';

export type QuotationDetailPayload = {
  materialId: number | null;
  materialCode: string | null;
  materialName: string;
  materialSpec: string | null;
  unit: string | null;
  quotationQty: SalesOrderDecimalValue;
  unitPrice: SalesOrderDecimalValue;
  remark: string | null;
};

export type QuotationCreatePayload = {
  decimalPolicy?: GridDecimalModuleRule;
  decimalColumns?: Readonly<Record<string, DecimalColumn>>;
  quotationDt: string;
  submitDt: string | null;
  customerId: number;
  customerReference: string | null;
  incoterms: string | null;
  paymentTerm: string | null;
  validTerm: string | null;
  currencyCode: string | null;
  remark: string | null;
  details: QuotationDetailPayload[];
};

export type QuotationCreateInput = Omit<
  QuotationCreatePayload,
  'customerId' | 'details'
> & {
  customerId: number | null;
  details: QuotationDetailRow[];
};

export type QuotationValidationErrors = {
  quotationDt?: string;
  customerId?: string;
  details?: string;
  detailRows: Record<string, string>;
  detailMessages: string[];
};

export type QuotationDetailItem = {
  quotationDetailId: number;
  lineNo: number;
  materialId: number | null;
  materialCode: string | null;
  materialName: string;
  materialSpec: string | null;
  unit: string | null;
  quotationQty: SalesOrderDecimalValue;
  unitPrice: SalesOrderDecimalValue;
  lineAmt: SalesOrderDecimalValue;
  remark: string | null;
};

export type QuotationItem = {
  quotationId: number;
  quotationNo: string;
  quotationDt: string;
  submitDt: string | null;
  customerId: number;
  customerCode: string | null;
  customerName: string | null;
  customerReference: string | null;
  incoterms: string | null;
  paymentTerm: string | null;
  validTerm: string | null;
  currencyCode: string | null;
  remark: string | null;
  supplyAmt: SalesOrderDecimalValue | null;
  vatAmt: SalesOrderDecimalValue | null;
  totalAmt: SalesOrderDecimalValue | null;
  createdBy?: string | null;
  createdByName?: string | null;
  createdByProfileImage?: string | null;
  createdAt?: string | null;
  writer?: boolean | null;
  details: QuotationDetailItem[];
};

export type QuotationCreateResponse = { item?: QuotationItem | null };
export type QuotationResponse = { item?: QuotationItem | null };

export type QuotationForm = {
  customer: MasterPickerOption;
  header: Omit<QuotationCreatePayload, 'customerId' | 'details'>;
  rows: QuotationDetailRow[];
};
