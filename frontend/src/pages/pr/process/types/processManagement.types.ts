export type ProcessRow = {
  id: string;
  parentId: string | null;
  code: string;
  name: string;
  description: string;
  image: string;
  inactive: boolean;
  productionOutsource: boolean;
  purchaseOutsource: boolean;
  inspection: boolean;
  packing: boolean;
  stockManagement: boolean;
  previousStockOut: boolean;
  finalProcess: boolean;
  plannedEquipment: boolean;
  actualEquipmentRequired: boolean;
};
