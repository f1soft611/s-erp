export type RevenueClosingStatus = 'CLOSED' | 'OPEN';

export type RevenueClosingDetailRow = {
  rowId: number;
  salesDeliveryId: number;
  deliveryNo: string;
  deliveryDt: string;
  salesOrderId?: number | null;
  orderNo: string;
  customerId: number;
  customerCode: string;
  customerName: string;
  materialCode: string;
  materialName: string;
  closingStatus: RevenueClosingStatus;
  quantity: number | string;
  salesAmount: number | string;
  vatAmount: number | string;
  totalAmount: number | string;
};

export type RevenueClosingCustomerSummaryRow = {
  customerId: number;
  customerCode: string;
  customerName: string;
  totalCount: number;
  closedCount: number;
  openCount: number;
};
