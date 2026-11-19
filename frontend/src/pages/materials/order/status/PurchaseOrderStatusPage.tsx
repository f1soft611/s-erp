import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import { Box, IconButton, TextField } from '@mui/material';
import { useCallback, useMemo, useState } from 'react';
import { F1Grid } from '../../../../shared/components/f1-grid';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageLoadBoundary } from '../../../../shared/components/PageLoadBoundary';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { SearchResultMessage } from '../../../../shared/components/SearchResultMessage';
import type { MenuPermission, MenuTreeNode, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { PurchaseOrderPrint } from '../print/PurchaseOrderPrint';
import { getPurchaseOrderPrint, markPurchaseOrderPrinted } from '../print/services/purchaseOrderPrint.service';
import type { PurchaseOrderPrintData } from '../print/types/purchaseOrderPrint.types';
import { PurchaseOrderEditorDialog } from './components/PurchaseOrderEditorDialog';
import { PurchaseOrderStatusDetailPanel } from './components/PurchaseOrderStatusDetailPanel';
import { createPurchaseOrderStatusColumns } from './data/purchaseOrderStatusColumns';
import {
  usePurchaseOrderStatusDetail,
  usePurchaseOrderStatusList,
  usePurchaseOrderStatusSearch,
} from './hooks/usePurchaseOrderStatus';
import type { PurchaseOrderStatusRow } from './types/purchaseOrderStatus.types';

const CREATE_PAGE_KEY = 'order-create';

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

export function PurchaseOrderStatusPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: Props) {
  const search = usePurchaseOrderStatusSearch();
  const list = usePurchaseOrderStatusList(search.appliedFilters);
  const detail = usePurchaseOrderStatusDetail();
  // 수정·취소 권한은 발주등록 메뉴의 UPDATE 권한을 쓴다(구매요청현황과 같은 방식).
  const createPermissions = findMenuPermissions(selectedModule.tree, CREATE_PAGE_KEY);
  const [printData, setPrintData] = useState<PurchaseOrderPrintData | null>(null);
  const [actionError, setActionError] = useState('');

  const { openDetail, closeDetail, closeEditor, refreshDetail } = detail;
  const { refreshQuietly } = list;
  const handleOpenOrder = useCallback(
    (row: PurchaseOrderStatusRow) => openDetail(row.purchaseOrderId),
    [openDetail],
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
    if (detail.editorMode === null && printData === null) closeDetail();
  }, [closeDetail, detail.editorMode, printData]);

  /** 출력 데이터를 불러와 미리보기를 연다. 취소된 발주는 서버가 거부한다(409). */
  const handleOpenPrint = useCallback(async () => {
    if (detail.selectedId === null) return;
    setActionError('');
    try {
      setPrintData(await getPurchaseOrderPrint(detail.selectedId));
    } catch (printError) {
      setActionError(printError instanceof Error ? printError.message : '발주서 출력 데이터를 불러오지 못했습니다.');
    }
  }, [detail.selectedId]);

  /** 인쇄 버튼을 누르면 출력했다고 기록한다. 기록에 실패해도 인쇄는 막지 않고 안내만 한다. */
  const handlePrinted = useCallback(async () => {
    if (!printData) return;
    try {
      await markPurchaseOrderPrinted(printData.purchaseOrderId);
      refreshDetail();
      refreshQuietly();
    } catch (markError) {
      setActionError(markError instanceof Error ? markError.message : '출력 기록에 실패했습니다.');
    }
  }, [printData, refreshDetail, refreshQuietly]);

  const columns = useMemo(() => createPurchaseOrderStatusColumns({ onOpenOrder: handleOpenOrder }), [handleOpenOrder]);

  const canEdit = Boolean(detail.item && createPermissions?.update && detail.item.useAt !== 'N');
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
        <PageLoadBoundary {...list.initialLoad} label="발주현황" onRetry={list.retry}>
          <PageSearchArea
            searchField={
              <TextField
                size="small"
                margin="none"
                placeholder="발주번호/구매처/품목/발주자 검색"
                value={search.keyword}
                disabled={!search.defaultsInitialized}
                onChange={(event) => search.setKeyword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && search.defaultsInitialized) {
                    search.applySearch(search.appliedDetailValues);
                  }
                }}
                slotProps={{
                  htmlInput: { 'aria-label': '발주현황 빠른 검색' },
                  input: {
                    endAdornment: search.keyword ? (
                      <IconButton
                        type="button"
                        size="small"
                        edge="end"
                        aria-label="발주현황 검색어 초기화"
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
          <PageMessageArea message={actionError} onClose={() => setActionError('')} horizontalPadding="grid" />
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
                ariaLabel="발주현황 목록"
                columns={columns}
                storageKey="materialsPurchaseOrderStatusGrid-v2"
                rowKey="purchaseOrderDetailId"
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
        <PurchaseOrderStatusDetailPanel
          item={detail.item}
          loading={detail.loading}
          error={detail.error}
          canEdit={canEdit}
          onClose={handleDetailClose}
          onView={() => detail.openEditor('view')}
          onEdit={() => detail.openEditor('edit')}
          onReceiptClose={() => detail.openEditor('close')}
          canPrint={detail.item?.useAt !== 'N'}
          onPrint={() => void handleOpenPrint()}
        />
      ) : null}
      <PurchaseOrderEditorDialog
        mode={detail.editorMode}
        purchaseOrderId={detail.selectedId}
        selectedModule={selectedModule}
        permissions={createPermissions}
        onClose={closeEditor}
        onSaved={handleSaved}
        onCanceled={handleCanceled}
        canPrint={detail.item?.useAt !== 'N'}
        onPrint={() => void handleOpenPrint()}
      />
      {printData ? (
        <PurchaseOrderPrint
          data={printData}
          onClose={() => setPrintData(null)}
          onPrint={() => void handlePrinted()}
        />
      ) : null}
    </Box>
  );
}
