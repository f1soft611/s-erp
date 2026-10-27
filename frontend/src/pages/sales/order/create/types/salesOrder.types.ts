import type { SalesOrderDetailRow } from '../data/salesOrderDetail';

export type SalesOrderCreateDetailPayload = {
  materialId: number;
  orderQty: number;
  unitPrice: number;
  vatAmt: number;
  deliveryDt: string | null;
};

export type SalesOrderCreatePayload = {
  orderDt: string;
  customerId: number;
  quotNo: string | null;
  deliveryDt: string | null;
  deliveryPlace: string | null;
  deliveryMethod: string | null;
  remark: string | null;
  details: SalesOrderCreateDetailPayload[];
};

export type SalesOrderCreateInput = Omit<
  SalesOrderCreatePayload,
  'customerId' | 'details'
> & {
  customerId: number | null;
  details: SalesOrderDetailRow[];
};

export type SalesOrderValidationErrors = {
  orderDt?: string;
  customerId?: string;
  details?: string;
  detailRows: Record<string, string>;
};

export type SalesOrderCreated = {
  salesOrderId: number;
  orderNo: string;
  orderDt: string;
  customerId: number;
  totalAmt: number;
};

export type SalesOrderCreateResponse = {
  item?: SalesOrderCreated | null;
};
