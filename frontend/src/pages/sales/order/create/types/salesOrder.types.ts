import type { MasterPickerOption } from '../../../../../shared/components/master-picker/masterPicker.types';
import type { GridDecimalModuleRule } from '../../../../../shared/services/gridDecimalPolicy.service';
import type { DecimalColumn } from '../../../../../shared/services/decimalColumnContract';
import type { SalesOrderDecimalValue, SalesOrderDetailRow } from '../data/salesOrderDetail';

export type SalesOrderCreateDetailPayload = {
  materialId: number;
  orderQty: SalesOrderDecimalValue;
  unitPrice: SalesOrderDecimalValue;
  vatAmt: SalesOrderDecimalValue;
  deliveryDt: string | null;
};

export type SalesOrderCreatePayload = {
  decimalPolicy?: GridDecimalModuleRule;
  decimalColumns?: Readonly<Record<string, DecimalColumn>>;
  orderDt: string;
  customerId: number;
  salesDestinationId: number;
  billingCustomerId: number;
  quotNo: string | null;
  deliveryDt: string | null;
  deliveryPlace: string | null;
  deliveryMethod: string | null;
  remark: string | null;
  details: SalesOrderCreateDetailPayload[];
};

export type SalesOrderCreateInput = Omit<
  SalesOrderCreatePayload,
  'customerId' | 'salesDestinationId' | 'billingCustomerId' | 'details'
> & {
  customerId: number | null;
  salesDestinationId: number | null;
  billingCustomerId: number | null;
  details: SalesOrderDetailRow[];
};

export type SalesOrderValidationErrors = {
  orderDt?: string;
  deliveryDt?: string;
  customerId?: string;
  salesDestinationId?: string;
  billingCustomerId?: string;
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
  totalAmt: SalesOrderDecimalValue;
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
  orderQty: SalesOrderDecimalValue;
  unitPrice: SalesOrderDecimalValue;
  supplyAmt: SalesOrderDecimalValue;
  vatAmt: SalesOrderDecimalValue | null;
  totalAmt: SalesOrderDecimalValue;
  deliveryDt: string | null;
  shippedQty: SalesOrderDecimalValue | null;
  lineStatus: string | null;
};

export type SalesOrderItem = {
  salesOrderId: number;
  orderNo: string;
  orderDt: string;
  customerId: number;
  customerCode: string | null;
  customerName: string | null;
  salesDestinationId: number | null;
  destinationCode: string | null;
  destinationName: string | null;
  billingCustomerId: number | null;
  billingCustomerCode: string | null;
  billingCustomerName: string | null;
  quotNo: string | null;
  deliveryDt: string | null;
  deliveryPlace: string | null;
  deliveryMethod: string | null;
  status: string;
  totalAmt: SalesOrderDecimalValue | null;
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
  destination: MasterPickerOption | null;
  billingCustomer: MasterPickerOption | null;
  header: SalesOrderHeaderValues;
  rows: SalesOrderDetailRow[];
};
