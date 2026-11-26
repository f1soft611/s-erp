import type { PageSearchFieldValue } from '../../../../../shared/components/page-search/searchFields';

export type QuotationStatusRow = {
  quotationId: number;
  quotationDetailId: number;
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
  supplyAmt: number | string;
  vatAmt: number | string;
  totalAmt: number | string;
  createdBy: string | null;
  lineNo: number;
  materialId: number | null;
  materialCode: string | null;
  materialName: string;
  materialSpec: string | null;
  unit: string | null;
  quotationQty: number | string;
  unitPrice: number | string;
  lineAmt: number | string;
  detailRemark: string | null;
};

export type QuotationStatusFilters = {
  keyword?: string;
  quotationDtFrom: string;
  quotationDtTo: string;
  submitDtFrom?: string;
  submitDtTo?: string;
  quotationNo?: string;
  customerKeyword?: string;
  materialKeyword?: string;
};

export type QuotationStatusSearchValues = Record<string, PageSearchFieldValue>;

export type QuotationStatusSearchSession = {
  keyword?: string;
  detailValues: QuotationStatusSearchValues;
};

export type QuotationStatusListResponse = {
  resultList?: QuotationStatusRow[];
  resultCnt?: number;
};
