import type { MenuPermission, ModuleItem, PageContent } from '../../../../dashboard/types/dashboard';
import type { GridDecimalModuleRule } from '../../../../../shared/services/gridDecimalPolicy.service';
import type { DecimalColumn } from '../../../../../shared/services/decimalColumnContract';

export type DeliveryPlanDetailRequest = {
  salesDeliveryPlanDetailId: number | null;
  salesOrderId: number;
  salesOrderDetailId: number;
  planDt: string | null;
  plannedQty: number | string;
};

export type DeliveryPlanRequest = {
  decimalPolicy?: GridDecimalModuleRule;
  decimalColumns?: Readonly<Record<string, DecimalColumn>>;
  details: DeliveryPlanDetailRequest[];
};

export type DeliveryPlanDetail = DeliveryPlanDetailRequest & {
  salesDeliveryPlanDetailId: number;
  salesDeliveryPlanId: number;
  orderNo: string;
  orderDt: string;
  customerId: number;
  customerCode: string;
  customerName: string;
  materialId: number;
  materialCode: string;
  materialName: string;
  unit: string | null;
  lineNo: number;
  deliveredQty: number | string;
  remainingQty: number | string;
  orderQty: number | string;
};

export type PlanRow = DeliveryPlanDetailRequest & {
  rowId: string;
  materialId: number;
  materialCode: string;
  materialName: string;
  unit: string | null;
  orderNo: string;
  customerName: string;
  orderQty: number | string;
  remainingPlanQty?: number | string;
  deliveredQty?: number | string;
};

export type DeliveryPlanItem = {
  salesDeliveryPlanId: number;
  tenantId: number;
  planNo: string;
  createdBy: string | null;
  createdByName?: string | null;
  createdByProfileImage?: string | null;
  createdAt?: string | null;
  details: DeliveryPlanDetail[];
};

export type DeliveryPlanStatusRow = {
  salesDeliveryPlanId: number;
  salesDeliveryPlanDetailId: number;
  planNo: string;
  salesOrderId: number;
  salesOrderDetailId: number;
  orderNo: string;
  orderDt: string;
  customerId: number;
  customerCode: string;
  customerName: string;
  materialId: number;
  materialCode: string;
  materialName: string;
  unit: string | null;
  lineNo: number;
  planDt: string;
  orderQty: number | string;
  plannedQty: number | string;
  deliveredQty: number | string;
  remainingQty: number | string;
  createdBy?: string | null;
  createdByName?: string | null;
  createdByProfileImage?: string | null;
  createdAt?: string | null;
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
  selectionKey?: string;
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
  orderQty: number | string;
  shippedQty: number | string;
  unitPrice: number | string;
  planDt: string | null;
  remainingPlanQty: number | string;
};
