import type { MasterPickerOption } from '../../../../../shared/components/master-picker/masterPicker.types';
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
  /** 행 수와 무관하게 중복 제거된 상세 검증 메시지 */
  detailMessages: string[];
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

export type SalesOrderDetailItem = {
  salesOrderDetailId: number;
  lineNo: number;
  materialId: number;
  materialCode: string | null;
  materialName: string | null;
  orderQty: number;
  unitPrice: number;
  supplyAmt: number;
  vatAmt: number | null;
  totalAmt: number;
  deliveryDt: string | null;
  shippedQty: number | null;
  lineStatus: string | null;
};

export type SalesOrderItem = {
  salesOrderId: number;
  orderNo: string;
  orderDt: string;
  customerId: number;
  customerCode: string | null;
  customerName: string | null;
  quotNo: string | null;
  deliveryDt: string | null;
  deliveryPlace: string | null;
  deliveryMethod: string | null;
  status: string;
  totalAmt: number | null;
  remark: string | null;
  createdBy?: string | null;
  createdByName?: string | null;
  createdByProfileImage?: string | null;
  createdAt?: string | null;
  writer?: boolean | null;
  details: SalesOrderDetailItem[];
};

export type SalesOrderResponse = {
  item?: SalesOrderItem | null;
};

export type SalesOrderHeaderValues = {
  orderDt: string;
  quotNo: string;
  deliveryDt: string;
  deliveryPlace: string;
  deliveryMethod: string;
  remark: string;
};

export type SalesOrderForm = {
  customer: MasterPickerOption;
  header: SalesOrderHeaderValues;
  rows: SalesOrderDetailRow[];
};
