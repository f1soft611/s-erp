import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';

export type DeliveryPlanDetailRequest = {
  salesDeliveryPlanDetailId: number | null;
  salesOrderDetailId: number;
  planDt: string | null;
  plannedQty: number;
};

export type DeliveryPlanRequest = {
  salesOrderId: number;
  details: DeliveryPlanDetailRequest[];
};

export type DeliveryPlanDetail = DeliveryPlanDetailRequest & {
  salesDeliveryPlanDetailId: number;
  salesDeliveryPlanId: number;
  salesOrderId: number;
  materialId: number;
  materialCode: string;
  materialName: string;
  unit: string | null;
  lineNo: number;
  deliveredQty: number;
  remainingQty: number;
  orderQty: number;
};

export type DeliveryPlanItem = {
  salesDeliveryPlanId: number;
  tenantId: number;
  planNo: string;
  salesOrderId: number;
  orderNo: string;
  orderDt: string;
  customerId: number;
  customerCode: string;
  customerName: string;
  createdBy: string | null;
  details: DeliveryPlanDetail[];
};

export type DeliveryPlanStatusRow = Omit<DeliveryPlanItem, 'details'> & {
  plannedCount?: number;
  deliveredCount?: number;
};

export type DeliveryPlanFilters = {
  planDtFrom: string;
  planDtTo: string;
  keyword: string;
};

export type DeliveryPlanPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems: string[];
  selectedMenuPermissions?: MenuPermission;
  deliveryPlanMode?: 'AUTO' | 'MANUAL';
};

export type PlanSourceOrderRow = {
  salesOrderId: number;
  salesOrderDetailId: number;
  orderNo: string;
  orderDt: string;
  customerId: number;
  customerCode: string;
  customerName: string;
  deliveryPlace: string | null;
  deliveryMethod: string | null;
  lineNo: number;
  materialId: number;
  materialCode: string;
  materialName: string;
  unit: string | null;
  orderQty: number;
  shippedQty: number;
  unitPrice: number;
  planDt: string | null;
};
