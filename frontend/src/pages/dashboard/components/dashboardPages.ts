import { createElement, lazy, useState, type ComponentProps, type ComponentType } from 'react';

// 대시보드 업무 화면 등록부. 화면마다 별도 청크로 메뉴 진입 시 불러온다.
// 모두 정적 import하면 DashboardPage 청크가 1,000 kB 경고 한도를 넘는다(20261126_002 사양).

// React.lazy와 같은 컴포넌트 제약
type AnyComponent = ComponentType<any>;

const preloaders: Array<() => Promise<unknown>> = [];

function lazyPage<M extends Record<K, AnyComponent>, K extends keyof M>(
  load: () => Promise<M>,
  exportName: K,
): M[K] {
  let loaded: M[K] | null = null;
  let pending: Promise<{ default: M[K] }> | null = null;
  const loadPage = () => {
    pending ??= load().then((module) => {
      loaded = module[exportName];
      return { default: loaded };
    });
    return pending;
  };
  const LazyPage = lazy(loadPage);
  preloaders.push(loadPage);

  // 이미 불러온 화면은 바로 렌더링하고, 아직이면 Suspense로 기다린다.
  // 마운트 동안 같은 컴포넌트 타입을 유지해 화면 상태가 다시 마운트되지 않게 한다.
  function DashboardLazyPage(props: ComponentProps<M[K]>) {
    const [Page] = useState<AnyComponent>(() => loaded ?? LazyPage);
    return createElement(Page, props);
  }
  return DashboardLazyPage as unknown as M[K];
}

/** 모든 업무 화면 모듈을 미리 불러온다. 이후 렌더링은 지연 없이 동기로 표시된다. */
export function preloadDashboardPages(): Promise<void> {
  return Promise.all(preloaders.map((preload) => preload())).then(() => undefined);
}

export const OverviewPage = lazyPage(() => import('../../groupware/OverviewPage'), 'OverviewPage');
export const CommunityNoticePage = lazyPage(() => import('../../groupware/community/notice/CommunityNoticePage'), 'CommunityNoticePage');
export const ArchiveBoardPage = lazyPage(() => import('../../groupware/community/archive/ArchiveBoardPage'), 'ArchiveBoardPage');
export const WorkspacePage = lazyPage(() => import('../../groupware/community/workspace/WorkspacePage'), 'WorkspacePage');
export const DocumentWritePage = lazyPage(() => import('../../groupware/documents/write/DocumentWritePage'), 'DocumentWritePage');
export const DocumentStatusPage = lazyPage(() => import('../../groupware/documents/status/DocumentStatusPage'), 'DocumentStatusPage');
export const MenuManagementPage = lazyPage(() => import('../../settings/system/menus/MenuManagementPage'), 'MenuManagementPage');
export const ModuleManagementPage = lazyPage(() => import('../../settings/system/modules/ModuleManagementPage'), 'ModuleManagementPage');
export const AccountManagementPage = lazyPage(() => import('../../settings/system/accounts/AccountManagementPage'), 'AccountManagementPage');
export const RoleManagementPage = lazyPage(() => import('../../settings/system/roles/RoleManagementPage'), 'RoleManagementPage');
export const SystemPolicyPage = lazyPage(() => import('../../settings/system/policies/SystemPolicyPage'), 'SystemPolicyPage');
export const CommonCodeManagementPage = lazyPage(() => import('../../co/master/common-code/CommonCodeManagementPage'), 'CommonCodeManagementPage');
export const CustomerManagementPage = lazyPage(() => import('../../co/master/customers/CustomerManagementPage'), 'CustomerManagementPage');
export const CompanyInfoPage = lazyPage(() => import('../../co/master/company/CompanyInfoPage'), 'CompanyInfoPage');
export const WarehouseManagementPage = lazyPage(() => import('../../co/master/warehouse/WarehouseManagementPage'), 'WarehouseManagementPage');
export const MaterialManagementPage = lazyPage(() => import('../../co/master/materials/MaterialManagementPage'), 'MaterialManagementPage');
export const ItemPartnerPriceManagementPage = lazyPage(() => import('../../co/master/item-partner-prices/ItemPartnerPriceManagementPage'), 'ItemPartnerPriceManagementPage');
export const WorkStandardRecipePage = lazyPage(() => import('../../co/work-standard/recipe/WorkStandardRecipePage'), 'WorkStandardRecipePage');
export const ProcessManagementPage = lazyPage(() => import('../../pr/process/ProcessManagementPage'), 'ProcessManagementPage');
export const SalesOrderCreatePage = lazyPage(() => import('../../sales/order/create/SalesOrderCreatePage'), 'SalesOrderCreatePage');
export const SalesDestinationPage = lazyPage(() => import('../../sales/master/destination/SalesDestinationPage'), 'SalesDestinationPage');
export const SalesOrderStatusPage = lazyPage(() => import('../../sales/order/status/SalesOrderStatusPage'), 'SalesOrderStatusPage');
export const QuotationCreatePage = lazyPage(() => import('../../sales/quotation/create/QuotationCreatePage'), 'QuotationCreatePage');
export const QuotationStatusPage = lazyPage(() => import('../../sales/quotation/status/QuotationStatusPage'), 'QuotationStatusPage');
export const SalesDeliveryCreatePage = lazyPage(() => import('../../sales/shipment/delivery/create/SalesDeliveryCreatePage'), 'SalesDeliveryCreatePage');
export const SalesDeliveryStatusPage = lazyPage(() => import('../../sales/shipment/delivery/status/SalesDeliveryStatusPage'), 'SalesDeliveryStatusPage');
export const SalesDeliveryPlanCreatePage = lazyPage(() => import('../../sales/shipment/deliveryplan/create/SalesDeliveryPlanCreatePage'), 'SalesDeliveryPlanCreatePage');
export const SalesDeliveryPlanStatusPage = lazyPage(() => import('../../sales/shipment/deliveryplan/status/SalesDeliveryPlanStatusPage'), 'SalesDeliveryPlanStatusPage');
export const SalesStatementCreatePage = lazyPage(() => import('../../sales/shipment/statement/create/SalesStatementCreatePage'), 'SalesStatementCreatePage');
export const SalesStatementStatusPage = lazyPage(() => import('../../sales/shipment/statement/status/SalesStatementStatusPage'), 'SalesStatementStatusPage');
export const RevenueClosingPage = lazyPage(() => import('../../sales/revenue/closing/RevenueClosingPage'), 'RevenueClosingPage');
export const PurchaseRequestCreatePage = lazyPage(() => import('../../materials/request/create/PurchaseRequestCreatePage'), 'PurchaseRequestCreatePage');
export const PurchaseRequestStatusPage = lazyPage(() => import('../../materials/request/status/PurchaseRequestStatusPage'), 'PurchaseRequestStatusPage');
export const PurchaseOrderCreatePage = lazyPage(() => import('../../materials/order/create/PurchaseOrderCreatePage'), 'PurchaseOrderCreatePage');
export const PurchaseOrderStatusPage = lazyPage(() => import('../../materials/order/status/PurchaseOrderStatusPage'), 'PurchaseOrderStatusPage');
export const PurchaseArrivalCreatePage = lazyPage(() => import('../../materials/arrival/create/PurchaseArrivalCreatePage'), 'PurchaseArrivalCreatePage');
export const PurchaseArrivalStatusPage = lazyPage(() => import('../../materials/arrival/status/PurchaseArrivalStatusPage'), 'PurchaseArrivalStatusPage');
export const PurchaseReceiptClosingPage = lazyPage(() => import('../../materials/receipt/closing/PurchaseReceiptClosingPage'), 'PurchaseReceiptClosingPage');
export const PurchaseReceiptCreatePage = lazyPage(() => import('../../materials/receipt/create/PurchaseReceiptCreatePage'), 'PurchaseReceiptCreatePage');
export const QualityInspectionCreatePage = lazyPage(() => import('../../quality/inspect/create/QualityInspectionCreatePage'), 'QualityInspectionCreatePage');
export const QualityInspectionStatusPage = lazyPage(() => import('../../quality/inspect/status/QualityInspectionStatusPage'), 'QualityInspectionStatusPage');
export const PurchaseReceiptStatusPage = lazyPage(() => import('../../materials/receipt/status/PurchaseReceiptStatusPage'), 'PurchaseReceiptStatusPage');
export const PurchaseRequestConfirmPage = lazyPage(() => import('../../materials/request/confirm/PurchaseRequestConfirmPage'), 'PurchaseRequestConfirmPage');
export const DraftFormManagementPage = lazyPage(() => import('../../co/workflow/form/DraftFormManagementPage'), 'DraftFormManagementPage');
export const DepartmentManagePage = lazyPage(() => import('../../hr/department/DepartmentManagePage'), 'DepartmentManagePage');
export const EmployeeManagePage = lazyPage(() => import('../../hr/employee/EmployeeManagePage'), 'EmployeeManagePage');
export const OrderManagePage = lazyPage(() => import('../../hr/order/OrderManagePage'), 'OrderManagePage');
export const F1GridTestPage = lazyPage(() => import('../../settings/system/f1-grid-test/F1GridTestPage'), 'F1GridTestPage');
export const F1GridDocsPage = lazyPage(() => import('../../f1-grid-docs/F1GridDocsPage'), 'F1GridDocsPage');
