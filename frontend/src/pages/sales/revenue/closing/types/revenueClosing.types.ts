export type RevenueClosingStatus = 'CLOSED' | 'OPEN';

export type RevenueClosingDetailRow = {
  rowId: number;
  salesDeliveryId: number;
  deliveryNo: string;
  deliveryDt: string;
  orderNo: string;
  customerId: number;
  customerCode: string;
  customerName: string;
  materialCode: string;
  materialName: string;
  closingStatus: RevenueClosingStatus;
  quantity: number;
  salesAmount: number;
  vatAmount: number;
  totalAmount: number;
};

export type RevenueClosingCustomerSummaryRow = {
  customerId: number;
  customerCode: string;
  customerName: string;
  totalCount: number;
  closedCount: number;
  openCount: number;
};
