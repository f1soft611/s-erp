export type WarehouseRow = {
  warehouseId: number | string;
  tenantId?: number;
  warehouseCode: string;
  warehouseName: string;
  warehouseType: string;
  deleteLockAt: 'Y' | 'N';
  disuseAt: 'Y' | 'N';
  useAt: 'Y' | 'N';
  stockQtyDispAt: 'Y' | 'N';
  stockIoAt: 'Y' | 'N';
  safetyStockAlertAt: 'Y' | 'N';
  stockDefaultAt: 'Y' | 'N';
  plantId: number | null;
  customerId: number | null;
  managerUserId: number | null;
  managerUserName?: string;
  departmentId: number | null;
  departmentName?: string;
  telNo: string;
  faxNo: string;
  address: string;
  remark: string;
  createdBy?: number;
  createdAt?: string;
  updatedBy?: number;
  updatedAt?: string;
};

export type WarehouseFilters = {
  keyword?: string;
  warehouseType?: string;
  disuseAt?: 'Y' | 'N';
  useAt?: 'Y' | 'N';
};

export type WarehouseChange = WarehousePayload & { warehouseId: string };

export type WarehouseBatchPayload = {
  warehouses: {
    insertedRows: WarehouseChange[];
    updatedRows: WarehouseChange[];
    deletedRows: WarehouseChange[];
  };
};

export type WarehousePayload = Pick<
  WarehouseRow,
  | 'warehouseCode'
  | 'warehouseName'
  | 'warehouseType'
  | 'deleteLockAt'
  | 'disuseAt'
  | 'useAt'
  | 'stockQtyDispAt'
  | 'stockIoAt'
  | 'safetyStockAlertAt'
  | 'stockDefaultAt'
  | 'plantId'
  | 'customerId'
  | 'managerUserId'
  | 'departmentId'
  | 'telNo'
  | 'faxNo'
  | 'address'
  | 'remark'
>;
