import { Box, Alert } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useCallback } from 'react';
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
import type { QuotationItem } from '../create/types/quotation.types';
import { QuotationEditorDialog } from './components/QuotationEditorDialog';
import { QuotationStatusDetailPanel } from './components/QuotationStatusDetailPanel';
import { QuotationStatusGrid } from './components/QuotationStatusGrid';
import { QuotationStatusSearchArea } from './components/QuotationStatusSearchArea';
import { useQuotationStatusDetail } from './hooks/useQuotationStatusDetail';
import { useQuotationStatusList } from './hooks/useQuotationStatusList';
import { useQuotationStatusSearch } from './hooks/useQuotationStatusSearch';
import type { QuotationStatusRow } from './types/quotationStatus.types';

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

function canEditQuotation(
  quotation: QuotationItem | null,
  permissions?: MenuPermission,
) {
  return Boolean(quotation?.writer && permissions?.update);
}

type Props = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems: string[];
  selectedMenuPermissions?: MenuPermission;
};

export function QuotationStatusPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: Props) {
  const search = useQuotationStatusSearch();
  const list = useQuotationStatusList(search.appliedFilters);
  const detail = useQuotationStatusDetail();
  const createPermissions = findMenuPermissions(selectedModule.tree, 'quotation-create');
  const {
    openDetail, closeDetail, closeEditor, refreshDetail,
  } = detail;
  const { refreshQuietly: refreshListQuietly } = list;

  const handleOpenQuotation = useCallback(
    (row: QuotationStatusRow) => openDetail(row.quotationId),
    [openDetail],
  );
  const handleQuotationSaved = useCallback(() => {
    closeEditor();
    refreshDetail();
    refreshListQuietly();
  }, [closeEditor, refreshDetail, refreshListQuietly]);
  const handleQuotationDeleted = useCallback(() => {
    closeEditor();
    closeDetail();
    refreshListQuietly();
  }, [closeDetail, closeEditor, refreshListQuietly]);
  const handleDetailClose = useCallback(() => {
    if (detail.editorMode === null) closeDetail();
  }, [closeDetail, detail.editorMode]);
  const showSearchResultMessage = list.hasLoaded && !list.loading
    && !list.initialLoad.loading && !search.defaultsError && !list.error;
  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [{
        label: '조회',
        icon: SearchIcon,
        visible: selectedMenuPermissions?.read ?? false,
        disabled: !search.defaultsInitialized || list.loading,
        onClick: () => { search.applySearch(search.appliedDetailValues); },
      }],
    },
  ];

  return (
    <Box sx={{
      flex: 1, position: 'relative', display: 'flex', flexDirection: 'column',
      minHeight: 0, minWidth: 0, overflow: 'hidden',
    }}>
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
        <PageLoadBoundary {...list.initialLoad} label="견적현황" onRetry={list.retry}>
          <QuotationStatusSearchArea
            keyword={search.keyword}
            onKeywordChange={search.setKeyword}
            detailFields={search.detailFields}
            detailValues={search.detailValues}
            appliedDetailValues={search.appliedDetailValues}
            defaultValues={search.defaultValues}
            onDetailValuesChange={search.setDetailValues}
            onSearch={search.applySearch}
            onReset={search.resetSearch}
            initialized={search.defaultsInitialized}
            loading={search.defaultsLoading || list.loading}
          />
          {search.searchError ? (
            <Alert severity="error" onClose={search.clearSearchError}>{search.searchError}</Alert>
          ) : null}
          <PageMessageArea
            message={search.defaultsError ?? list.error}
            onClose={list.clearError}
            horizontalPadding="grid"
            salesSpacing="outer"
          />
          {showSearchResultMessage ? (
            <SearchResultMessage resultCount={list.rows.length} horizontalPadding="grid" salesSpacing="outer" />
          ) : null}
          <Box data-testid="sales-status-content" sx={{
            px: 2,
            pt: 2,
            pb: 2,
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 360,
            minWidth: 0,
          }}>
            <Box sx={{ flex: 1, minHeight: 320, minWidth: 0, overflow: 'hidden' }}>
              <QuotationStatusGrid
                rows={list.rows}
                loading={list.loading}
                canExportExcel={selectedMenuPermissions?.excel ?? false}
                onOpenQuotation={handleOpenQuotation}
                highlightKeyword={search.appliedFilters?.keyword}
              />
            </Box>
          </Box>
        </PageLoadBoundary>
      </PageLoadBoundary>
      {detail.selectedQuotationId !== null ? (
        <QuotationStatusDetailPanel
          quotation={detail.quotation}
          loading={detail.loading}
          error={detail.error}
          canEdit={canEditQuotation(detail.quotation, createPermissions)}
          onClose={handleDetailClose}
          onView={() => detail.openEditor('view')}
          onEdit={() => detail.openEditor('edit')}
        />
      ) : null}
      <QuotationEditorDialog
        mode={detail.editorMode}
        quotationId={detail.selectedQuotationId}
        selectedModule={selectedModule}
        permissions={createPermissions}
        onClose={closeEditor}
        onSaved={handleQuotationSaved}
        onDeleted={handleQuotationDeleted}
      />
    </Box>
  );
}
