import { Alert, Box, Button } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useCallback, useState } from 'react';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageLoadBoundary } from '../../../../shared/components/PageLoadBoundary';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { SearchResultMessage } from '../../../../shared/components/SearchResultMessage';
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
  const [searchResultMessageDismissed, setSearchResultMessageDismissed] = useState(false);
  const createPermissions = findMenuPermissions(
    selectedModule.tree,
    SALES_ORDER_CREATE_PAGE_KEY,
  );
  const { openDetail, closeDetail, closeEditor, refreshDetail } = detail;
  const { applySearch: submitSearch, appliedDetailValues } = search;
  const { refreshQuietly: refreshList, retry: retryListRequest } = list;
  const refreshListQuietly = useCallback(() => {
    setSearchResultMessageDismissed(false);
    refreshList();
  }, [refreshList]);
  const retryList = useCallback(() => {
    setSearchResultMessageDismissed(false);
    retryListRequest();
  }, [retryListRequest]);
  const applySearch = useCallback(
    (values: Parameters<typeof submitSearch>[0]) => {
      setSearchResultMessageDismissed(false);
      submitSearch(values);
    },
    [submitSearch],
  );
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
  const showSearchResultMessage =
    list.hasLoaded &&
    !list.loading &&
    !list.initialLoad.loading &&
    !search.defaultsError &&
    !list.error &&
    !searchResultMessageDismissed;
  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        {
          label: '조회',
          icon: SearchIcon,
          visible: selectedMenuPermissions?.read ?? false,
          disabled: !search.defaultsInitialized || list.loading,
          onClick: () => applySearch(appliedDetailValues),
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
        <PageLoadBoundary {...list.initialLoad} label="수주현황" onRetry={retryList}>
        {search.commonCodesError || search.codeMissingError ? (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={search.retryDefaults}>
                공통코드 다시 불러오기
              </Button>
            }
          >
            {search.commonCodesError ?? search.codeMissingError}
          </Alert>
        ) : null}
        <SalesOrderStatusSearchArea
          keyword={search.keyword}
          onKeywordChange={search.setKeyword}
          detailFields={search.detailFields}
          detailValues={search.detailValues}
          appliedDetailValues={search.appliedDetailValues}
          defaultValues={search.searchAreaDefaultValues}
          onDetailValuesChange={search.setDetailValues}
          onSearch={applySearch}
          onReset={search.resetSearch}
          initialized={search.defaultsInitialized}
          loading={search.defaultsLoading || list.loading}
        />
        <PageMessageArea
          message={
            search.commonCodesError || search.codeMissingError
              ? ''
              : list.error || search.defaultsError || ''
          }
          onClose={list.clearError}
          horizontalPadding="grid"
        />
        {showSearchResultMessage ? (
          <SearchResultMessage
            resultCount={list.rows.length}
            horizontalPadding="grid"
            onDismiss={() => setSearchResultMessageDismissed(true)}
          />
        ) : null}
        <Box
          data-testid="sales-status-content"
          sx={{
            px: { xs: 1, sm: 2 },
            pt: showSearchResultMessage ? 0 : 1,
            pb: 2,
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
              orderStatusOptions={search.commonCodes.orderStatusOptions}
              progressStatusOptions={search.commonCodes.progressStatusOptions}
              deliveryMethodOptions={search.commonCodes.deliveryMethodOptions}
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
          orderStatusOptions={search.commonCodes.orderStatusOptions}
          progressStatusOptions={search.commonCodes.progressStatusOptions}
          deliveryMethodOptions={search.commonCodes.deliveryMethodOptions}
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
