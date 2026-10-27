import { Box } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useCallback } from 'react';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageLoadBoundary } from '../../../../shared/components/PageLoadBoundary';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import type {
  MenuPermission,
  MenuTreeNode,
  ModuleItem,
  PageContent,
} from '../../../dashboard/types/dashboard';
import type { SalesOrderItem } from '../create/types/salesOrder.types';
import { SalesOrderEditorDialog } from './components/SalesOrderEditorDialog';
import { SalesOrderStatusDetailPanel } from './components/SalesOrderStatusDetailPanel';
import { SalesOrderStatusGrid } from './components/SalesOrderStatusGrid';
import { SalesOrderStatusSearchArea } from './components/SalesOrderStatusSearchArea';
import { useSalesOrderStatusDetail } from './hooks/useSalesOrderStatusDetail';
import { useSalesOrderStatusList } from './hooks/useSalesOrderStatusList';
import { useSalesOrderStatusSearch } from './hooks/useSalesOrderStatusSearch';
import type { SalesOrderStatusRow } from './types/salesOrderStatus.types';

const SALES_ORDER_CREATE_PAGE_KEY = 'create';
const EDITABLE_ORDER_STATUS = '수주등록';

function findMenuPermissions(
  nodes: MenuTreeNode[],
  pageKey: string,
): MenuPermission | undefined {
  for (const node of nodes) {
    if (!node.children?.length && node.pageKey === pageKey) return node.permissions;
    const found = node.children ? findMenuPermissions(node.children, pageKey) : undefined;
    if (found) return found;
  }
  return undefined;
}

function canEditOrder(order: SalesOrderItem | null, permissions?: MenuPermission) {
  return Boolean(
    order?.writer &&
      permissions?.update &&
      order.status === EDITABLE_ORDER_STATUS &&
      order.details.every((detail) => Number(detail.shippedQty ?? 0) <= 0),
  );
}

type SalesOrderStatusPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems: string[];
  selectedMenuPermissions?: MenuPermission;
};

export function SalesOrderStatusPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: SalesOrderStatusPageProps) {
  const search = useSalesOrderStatusSearch();
  const list = useSalesOrderStatusList(search.appliedFilters);
  const detail = useSalesOrderStatusDetail();
  const createPermissions = findMenuPermissions(
    selectedModule.tree,
    SALES_ORDER_CREATE_PAGE_KEY,
  );
  const { openDetail, closeDetail, closeEditor, refreshDetail } = detail;
  const { refreshQuietly: refreshListQuietly } = list;
  const handleOpenOrder = useCallback(
    (row: SalesOrderStatusRow) => openDetail(row.salesOrderId),
    [openDetail],
  );
  const handleOrderSaved = useCallback(() => {
    closeEditor();
    refreshDetail();
    refreshListQuietly();
  }, [closeEditor, refreshDetail, refreshListQuietly]);
  const handleOrderDeleted = useCallback(() => {
    closeEditor();
    closeDetail();
    refreshListQuietly();
  }, [closeDetail, closeEditor, refreshListQuietly]);
  const handleDetailClose = useCallback(() => {
    if (detail.editorMode === null) closeDetail();
  }, [closeDetail, detail.editorMode]);
  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        {
          label: '조회',
          icon: SearchIcon,
          visible: selectedMenuPermissions?.read ?? false,
          disabled: !search.defaultsInitialized || list.loading,
          onClick: () => search.applySearch(),
        },
      ],
    },
  ];

  return (
    <Box
      sx={{
        flex: 1,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      <PageHeader
        breadcrumbItems={breadcrumbItems.length ? breadcrumbItems : [currentMenuName]}
        description={content.description}
        actionGroups={pageActionGroups}
      />
      <PageLoadBoundary
        {...search.defaultsInitialLoad}
        label="검색 기본값"
        onRetry={search.retryDefaults}
      >
        <PageLoadBoundary {...list.initialLoad} label="수주현황" onRetry={list.retry}>
        <SalesOrderStatusSearchArea
          keyword={search.keyword}
          onKeywordChange={search.setKeyword}
          detailFields={search.detailFields}
          detailValues={search.detailValues}
          defaultValues={search.searchAreaDefaultValues}
          onDetailValuesChange={search.setDetailValues}
          onSearch={search.applySearch}
          onReset={search.resetSearch}
          initialized={search.defaultsInitialized}
          loading={search.defaultsLoading || list.loading}
        />
        <PageMessageArea
          message={search.defaultsError ?? list.error}
          onClose={list.clearError}
        />
        <Box
          sx={{
            px: { xs: 1, sm: 2 },
            pb: 2,
            pt: 1,
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 360,
            minWidth: 0,
          }}
        >
          <Box sx={{ flex: 1, minHeight: 320, minWidth: 0, overflow: 'hidden' }}>
            <SalesOrderStatusGrid
              rows={list.rows}
              loading={list.loading}
              canExportExcel={selectedMenuPermissions?.excel ?? false}
              onOpenOrder={handleOpenOrder}
            />
          </Box>
        </Box>
        </PageLoadBoundary>
      </PageLoadBoundary>
      {detail.selectedOrderId !== null ? (
        <SalesOrderStatusDetailPanel
          order={detail.order}
          loading={detail.loading}
          error={detail.error}
          canEdit={canEditOrder(detail.order, createPermissions)}
          onClose={handleDetailClose}
          onView={() => detail.openEditor('view')}
          onEdit={() => detail.openEditor('edit')}
        />
      ) : null}
      <SalesOrderEditorDialog
        mode={detail.editorMode}
        salesOrderId={detail.selectedOrderId}
        selectedModule={selectedModule}
        permissions={createPermissions}
        onClose={closeEditor}
        onSaved={handleOrderSaved}
        onDeleted={handleOrderDeleted}
      />
    </Box>
  );
}
