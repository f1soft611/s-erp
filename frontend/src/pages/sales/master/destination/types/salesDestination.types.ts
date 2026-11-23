export type SalesDestination = {
  salesDestinationId: number;
  customerId: number;
  destinationCode: string;
  destinationName: string;
  businessNo: string | null;
  address: string | null;
  contactName: string | null;
  mobileNo: string | null;
  telephoneNo: string | null;
  facsimileNo: string | null;
  remark: string | null;
};

export type SalesDestinationInput = Omit<SalesDestination, 'salesDestinationId' | 'destinationCode'>;
export type SalesDestinationGridRow = Omit<SalesDestination, 'salesDestinationId'> & {
  salesDestinationId: number | string;
};

export type DestinationCustomer = {
  customerId: number;
  customerCode: string;
  customerName: string | null;
  hasDestination: boolean;
};
