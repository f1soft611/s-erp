export type CustomerRow = {
  customerId: number | string;
  tenantId?: number;
  customerCode: string;
  customerName: string;
  custNameAbbr: string;
  presidentName: string;
  businessNo: string;
  juridNo: string;
  businessStatus1: string;
  businessItem1: string;
  postCode: string;
  address: string;
  telephoneNo: string;
  facsimileNo: string;
  custMemo: string;
  useAt: 'Y' | 'N';
  createdBy?: number;
  createdAt?: string;
  updatedBy?: number;
  updatedAt?: string;
};

export type CustomerFilters = {
  keyword?: string;
  presidentName?: string;
  businessNo?: string;
  juridNo?: string;
  businessStatus1?: string;
  businessItem1?: string;
  useAt?: 'Y' | 'N';
};

export type CustomerChange = CustomerPayload & { customerId: string };

export type CustomerBatchPayload = {
  customers: {
    insertedRows: CustomerChange[];
    updatedRows: CustomerChange[];
    deletedRows: CustomerChange[];
  };
};

export type CustomerPayload = Pick<
  CustomerRow,
  | 'customerCode'
  | 'customerName'
  | 'custNameAbbr'
  | 'presidentName'
  | 'businessNo'
  | 'juridNo'
  | 'businessStatus1'
  | 'businessItem1'
  | 'postCode'
  | 'address'
  | 'telephoneNo'
  | 'facsimileNo'
  | 'custMemo'
  | 'useAt'
>;
