import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import { Box, IconButton, TextField } from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { F1Grid } from '../../../../shared/components/f1-grid';
import type { F1GridOption } from '../../../../shared/components/f1-grid/types/grid.types';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageLoadBoundary } from '../../../../shared/components/PageLoadBoundary';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { SearchResultMessage } from '../../../../shared/components/SearchResultMessage';
import type { MenuPermission, MenuTreeNode, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { fetchPurchaseUseTypeOptions } from '../create/services/purchaseRequest.service';
import { PurchaseRequestEditorDialog } from './components/PurchaseRequestEditorDialog';
import { PurchaseRequestStatusDetailPanel } from './components/PurchaseRequestStatusDetailPanel';
import { createPurchaseRequestStatusColumns } from './data/purchaseRequestStatusColumns';
import {
  usePurchaseRequestStatusDetail,
  usePurchaseRequestStatusList,
  usePurchaseRequestStatusSearch,
} from './hooks/usePurchaseRequestStatus';
import type { PurchaseRequestStatusRow } from './types/purchaseRequestStatus.types';

const CREATE_PAGE_KEY = 'request-create';
const EDITABLE_STATUS = 'REQUESTED';

function findMenuPermissions(nodes: MenuTreeNode[], pageKey: string): MenuPermission | undefined {
  for (const node of nodes) {
    if (!node.children?.length && node.pageKey === pageKey) return node.permissions;
    const found = node.children ? findMenuPermissions(node.children, pageKey) : undefined;
    if (found) return found;
  }
  return undefined;
}

type Props = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems: string[];
  selectedMenuPermissions?: MenuPermission;
};

export function PurchaseRequestStatusPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: Props) {
  const search = usePurchaseRequestStatusSearch();
  const list = usePurchaseRequestStatusList(search.appliedFilters);
  const detail = usePurchaseRequestStatusDetail();
  const createPermissions = findMenuPermissions(selectedModule.tree, CREATE_PAGE_KEY);
  const [useTypeOptions, setUseTypeOptions] = useState<F1GridOption[]>([]);

  useEffect(() => {
    let active = true;
    fetchPurchaseUseTypeOptions()
      .then((options) => {
        if (active) setUseTypeOptions(options);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const { openDetail, closeDetail, closeEditor, refreshDetail } = detail;
  const { refreshQuietly } = list;
  const handleOpenRequest = useCallback(
    (row: PurchaseRequestStatusRow) => openDetail(row.purchaseRequestId),
    [openDetail],
  );
  const handleSaved = useCallback(() => {
    closeEditor();
    refreshDetail();
    refreshQuietly();
  }, [closeEditor, refreshDetail, refreshQuietly]);
  const handleDeleted = useCallback(() => {
    closeEditor();
    closeDetail();
    refreshQuietly();
  }, [closeDetail, closeEditor, refreshQuietly]);
  const handleDetailClose = useCallback(() => {
    if (detail.editorMode === null) closeDetail();
  }, [closeDetail, detail.editorMode]);

  const columns = useMemo(
    () => createPurchaseRequestStatusColumns({ onOpenRequest: handleOpenRequest, useTypeOptions }),
    [handleOpenRequest, useTypeOptions],
  );
  // 검색 기본값 계산은 고정 필드로 하고, 화면에 보이는 사용용도 선택지만 불러온 옵션으로 채운다.
  const displayDetailFields = useMemo(
    () => search.detailFields.map((field) =>
      field.field === 'useTypeName' ? { ...field, options: useTypeOptions } : field),
    [search.detailFields, useTypeOptions],
  );

  const canEdit = Boolean(
    detail.item && createPermissions?.update && detail.item.status === EDITABLE_STATUS,
  );
  const showSearchResultMessage =
    list.hasLoaded && !list.loading && !list.initialLoad.loading && !search.defaultsError && !list.error;
  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        {
          label: '조회',
          icon: SearchIcon,
          visible: selectedMenuPermissions?.read ?? false,
          disabled: !search.defaultsInitialized || list.loading,
          onClick: () => search.applySearch(search.appliedDetailValues),
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
      <PageLoadBoundary {...search.defaultsInitialLoad} label="검색 기본값" onRetry={search.retryDefaults}>
        <PageLoadBoundary {...list.initialLoad} label="구매요청현황" onRetry={list.retry}>
          <PageSearchArea
            searchField={
              <TextField
                size="small"
                margin="none"
                placeholder="구매요청번호/품목/요청자 검색"
                value={search.keyword}
                disabled={!search.defaultsInitialized}
                onChange={(event) => search.setKeyword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && search.defaultsInitialized) {
                    search.applySearch(search.appliedDetailValues);
                  }
                }}
                slotProps={{
                  htmlInput: { 'aria-label': '구매요청현황 빠른 검색' },
                  input: {
                    endAdornment: search.keyword ? (
                      <IconButton
                        type="button"
                        size="small"
                        edge="end"
                        aria-label="구매요청현황 검색어 초기화"
                        onClick={() => search.setKeyword('')}
                        sx={{ p: 0.25 }}
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    ) : null,
                  },
                }}
                sx={(theme) => ({
                  width: '100%',
                  height: 40,
                  '& .MuiOutlinedInput-root': {
                    height: '100%',
                    borderRadius: '0 6px 6px 0',
                    backgroundColor: theme.palette.background.paper,
                  },
                })}
              />
            }
            onDefaultSearch={() => {
              if (search.defaultsInitialized) search.applySearch(search.appliedDetailValues);
            }}
            detailFields={displayDetailFields}
            detailValues={search.detailValues}
            appliedDetailValues={search.appliedDetailValues}
            defaultValues={search.searchAreaDefaultValues}
            onDetailValuesChange={search.setDetailValues}
            onDetailSearch={search.applySearch}
            onDetailReset={(values) => {
              search.setDetailValues(values);
              search.resetSearch();
            }}
            detailLoading={search.defaultsLoading || list.loading || !search.defaultsInitialized}
          />
          <PageMessageArea
            message={search.defaultsError ?? list.error}
            onClose={list.clearError}
            horizontalPadding="grid"
          />
          {showSearchResultMessage ? (
            <SearchResultMessage resultCount={list.rows.length} horizontalPadding="grid" />
          ) : null}
          <Box
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
              <F1Grid
                highlightKeyword={search.appliedFilters?.keyword}
                ariaLabel="구매요청현황 목록"
                columns={columns}
                storageKey="materialsPurchaseRequestStatusGrid"
                rowKey="purchaseRequestDetailId"
                rows={list.rows}
                loading={list.loading}
                showCheckbox={false}
                selectionMode="row"
                selectRowOnContextMenu={false}
                allowAddRowInContextMenu={false}
                allowDuplicateRowInContextMenu={false}
                allowDeleteRowInContextMenu={false}
                canExportExcel={selectedMenuPermissions?.excel ?? false}
                height="100%"
                minHeight={320}
              />
            </Box>
          </Box>
        </PageLoadBoundary>
      </PageLoadBoundary>
      {detail.selectedId !== null ? (
        <PurchaseRequestStatusDetailPanel
          item={detail.item}
          loading={detail.loading}
          error={detail.error}
          canEdit={canEdit}
          onClose={handleDetailClose}
          onView={() => detail.openEditor('view')}
          onEdit={() => detail.openEditor('edit')}
        />
      ) : null}
      <PurchaseRequestEditorDialog
        mode={detail.editorMode}
        purchaseRequestId={detail.selectedId}
        selectedModule={selectedModule}
        permissions={createPermissions}
        onClose={closeEditor}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />
    </Box>
  );
}
