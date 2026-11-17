import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import { Box, IconButton, TextField } from '@mui/material';
import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { F1Grid } from '../../../../shared/components/f1-grid';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageLoadBoundary } from '../../../../shared/components/PageLoadBoundary';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { SearchResultMessage } from '../../../../shared/components/SearchResultMessage';
import type { MenuPermission, MenuTreeNode, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { MaterialReceiptEditorDialog } from './components/MaterialReceiptEditorDialog';
import { MaterialReceiptStatusDetailPanel } from './components/MaterialReceiptStatusDetailPanel';
import { createMaterialReceiptStatusColumns } from './data/materialReceiptStatusColumns';
import {
  useMaterialReceiptStatusDetail,
  useMaterialReceiptStatusList,
  useMaterialReceiptStatusSearch,
} from './hooks/useMaterialReceiptStatus';
import type { MaterialReceiptStatusRow } from './types/materialReceiptStatus.types';

const CREATE_PAGE_KEY = 'receipt-create';
/** 가입고현황 화면 경로. 쿼리 arrivalId로 해당 가입고 상세를 바로 연다. */
const ARRIVAL_STATUS_PATH = '/materials/arrival/arrival-status';

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

export function MaterialReceiptStatusPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: Props) {
  const navigate = useNavigate();
  const search = useMaterialReceiptStatusSearch();
  const list = useMaterialReceiptStatusList(search.appliedFilters);
  const detail = useMaterialReceiptStatusDetail();
  // 수정·취소 권한은 입고등록 메뉴의 UPDATE 권한을 쓴다(가입고현황과 같은 방식).
  const createPermissions = findMenuPermissions(selectedModule.tree, CREATE_PAGE_KEY);

  const { openDetail, closeDetail, closeEditor, refreshDetail } = detail;
  const { refreshQuietly } = list;
  const handleOpenReceipt = useCallback(
    (row: MaterialReceiptStatusRow) => openDetail(row.materialReceiptId),
    [openDetail],
  );
  const handleOpenArrival = useCallback(
    (arrivalId: number) => navigate(`${ARRIVAL_STATUS_PATH}?arrivalId=${arrivalId}`),
    [navigate],
  );
  const handleSaved = useCallback(() => {
    refreshDetail();
    refreshQuietly();
  }, [refreshDetail, refreshQuietly]);
  const handleCanceled = useCallback(() => {
    closeEditor();
    refreshDetail();
    refreshQuietly();
  }, [closeEditor, refreshDetail, refreshQuietly]);
  const handleDetailClose = useCallback(() => {
    if (detail.editorMode === null) closeDetail();
  }, [closeDetail, detail.editorMode]);

  const columns = useMemo(
    () => createMaterialReceiptStatusColumns({
      onOpenReceipt: handleOpenReceipt,
      onOpenArrival: (row) => {
        if (row.materialArrivalId != null) handleOpenArrival(row.materialArrivalId);
      },
    }),
    [handleOpenArrival, handleOpenReceipt],
  );

  // 매입마감된 행이 있는 입고는 마감을 해제하기 전에는 수정·취소할 수 없다(서버도 막는다).
  const hasClosedRow = Boolean(detail.item?.details?.some((line) => line.closingMonth));
  const canEdit = Boolean(detail.item && createPermissions?.update && detail.item.useAt !== 'N' && !hasClosedRow);
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
        <PageLoadBoundary {...list.initialLoad} label="입고현황" onRetry={list.retry}>
          <PageSearchArea
            searchField={
              <TextField
                size="small"
                margin="none"
                placeholder="입고번호/구매처/품목/담당자 검색"
                value={search.keyword}
                disabled={!search.defaultsInitialized}
                onChange={(event) => search.setKeyword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && search.defaultsInitialized) {
                    search.applySearch(search.appliedDetailValues);
                  }
                }}
                slotProps={{
                  htmlInput: { 'aria-label': '입고현황 빠른 검색' },
                  input: {
                    endAdornment: search.keyword ? (
                      <IconButton
                        type="button"
                        size="small"
                        edge="end"
                        aria-label="입고현황 검색어 초기화"
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
            detailFields={search.detailFields}
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
                ariaLabel="입고현황 목록"
                columns={columns}
                storageKey="materialsMaterialReceiptStatusGrid"
                rowKey="materialReceiptDetailId"
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
        <MaterialReceiptStatusDetailPanel
          item={detail.item}
          loading={detail.loading}
          error={detail.error}
          canEdit={canEdit}
          onClose={handleDetailClose}
          onView={() => detail.openEditor('view')}
          onEdit={() => detail.openEditor('edit')}
          onOpenArrival={handleOpenArrival}
        />
      ) : null}
      <MaterialReceiptEditorDialog
        mode={detail.editorMode}
        materialReceiptId={detail.selectedId}
        selectedModule={selectedModule}
        permissions={createPermissions}
        onClose={closeEditor}
        onSaved={handleSaved}
        onCanceled={handleCanceled}
      />
    </Box>
  );
}
