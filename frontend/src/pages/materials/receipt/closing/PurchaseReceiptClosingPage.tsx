import ClearIcon from '@mui/icons-material/Clear';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import SearchIcon from '@mui/icons-material/Search';
import { Box, Chip, IconButton, Paper, TextField, Typography } from '@mui/material';
import { useCallback, useMemo, useRef, useState } from 'react';
import { F1Grid } from '../../../../shared/components/f1-grid';
import type { F1GridChanges, F1GridRef, F1GridRowId } from '../../../../shared/components/f1-grid';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageLoadBoundary } from '../../../../shared/components/PageLoadBoundary';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { SearchResultMessage } from '../../../../shared/components/SearchResultMessage';
import Splitter from '../../../../shared/components/Splitter';
import { useCommonConfirmDialog } from '../../../../shared/hooks/useCommonConfirmDialog';
import { usePageSessionState } from '../../../../shared/hooks/usePageSessionState';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import {
  createClosingRowColumns,
  createClosingSupplierColumns,
} from './data/purchaseReceiptClosingColumns';
import { usePurchaseReceiptClosingData, usePurchaseReceiptClosingSearch } from './hooks/usePurchaseReceiptClosing';
import { closeReceiptRows, formatClosingMonth, releaseReceiptRows } from './services/purchaseReceiptClosing.service';
import type { PurchaseReceiptClosingRow } from './types/purchaseReceiptClosing.types';

const SPLITTER_SESSION_KEY = 's-erp:page:materials-purchase-receipt-closing-splitter';
const DEFAULT_SPLITTER_SIZE = 420;

type Props = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems: string[];
  selectedMenuPermissions?: MenuPermission;
};

const won = (value: number) => `${Math.round(value).toLocaleString('ko-KR')}원`;

export function PurchaseReceiptClosingPage({
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: Props) {
  const search = usePurchaseReceiptClosingSearch();
  const list = usePurchaseReceiptClosingData(search.appliedFilters);
  const { confirm, dialog } = useCommonConfirmDialog();
  const rowGridRef = useRef<F1GridRef<PurchaseReceiptClosingRow>>(null);
  const { state: splitterSize, setState: setSplitterSize } = usePageSessionState<number>(
    SPLITTER_SESSION_KEY,
    DEFAULT_SPLITTER_SIZE,
    { version: 1, validate: (value): value is number => typeof value === 'number' && Number.isFinite(value) },
  );

  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [supplierGridKey, setSupplierGridKey] = useState(0);
  const [selectedRowIds, setSelectedRowIds] = useState<F1GridRowId[]>([]);
  // 구매처를 바꿔도 고친 단가·세금 구분이 사라지지 않도록 편집값을 페이지에서 들고 있다.
  const [edits, setEdits] = useState<Record<number, PurchaseReceiptClosingRow>>({});
  const [rowsEpoch, setRowsEpoch] = useState(0);
  const [notice, setNotice] = useState('');
  const [working, setWorking] = useState(false);
  const [previousData, setPreviousData] = useState<{
    rows: typeof list.rows;
    suppliers: typeof list.suppliers;
  } | null>(null);

  const canEdit = selectedMenuPermissions?.update ?? false;
  const closingMonth = search.appliedFilters?.closingMonth ?? '';

  // 새로 조회하면 편집·선택·구매처 선택을 초기화한다.
  if (
    previousData === null ||
    previousData.rows !== list.rows ||
    previousData.suppliers !== list.suppliers
  ) {
    setPreviousData({ rows: list.rows, suppliers: list.suppliers });
    setEdits({});
    setSelectedRowIds([]);
    setSelectedSupplierId(null);
    setSupplierGridKey((key) => key + 1);
    setRowsEpoch((epoch) => epoch + 1);
  }

  const visibleRows = useMemo(() => {
    const base = selectedSupplierId === null
      ? list.rows
      : list.rows.filter((row) => row.supplierId === selectedSupplierId);
    return base.map((row) => edits[row.purchaseReceiptDetailId] ?? row);
  }, [edits, list.rows, selectedSupplierId]);

  const rowsKey = `${rowsEpoch}:${selectedSupplierId ?? 'all'}`;
  const selectedSupplier = list.suppliers.find((supplier) => supplier.supplierId === selectedSupplierId);
  const selectedRows = useMemo(() => {
    const ids = new Set(selectedRowIds.map(String));
    return visibleRows.filter((row) => ids.has(String(row.purchaseReceiptDetailId)));
  }, [selectedRowIds, visibleRows]);
  const selectedOpen = selectedRows.filter((row) => !row.closed);
  const selectedClosed = selectedRows.filter((row) => row.closed);

  const supplierColumns = useMemo(() => createClosingSupplierColumns(), []);
  const rowColumns = useMemo(() => createClosingRowColumns({ canEdit }), [canEdit]);

  const handleChangesChange = useCallback((changes: F1GridChanges<PurchaseReceiptClosingRow>) => {
    if (changes.updatedRows.length === 0) return;
    setEdits((current) => {
      const next = { ...current };
      changes.updatedRows.forEach((row) => {
        next[row.purchaseReceiptDetailId] = row;
      });
      return next;
    });
  }, []);

  const clearSupplier = useCallback(() => {
    setSelectedSupplierId(null);
    setSupplierGridKey((key) => key + 1);
  }, []);

  const runSearch = useCallback(() => {
    if (search.defaultsInitialized) search.applySearch(search.appliedDetailValues);
  }, [search]);

  const handleClose = useCallback(async () => {
    if (!canEdit || working || selectedOpen.length === 0 || selectedClosed.length > 0) return;
    if (!(rowGridRef.current?.validate() ?? true)) {
      list.setError('입력값을 확인해 주세요. 단가는 0 이상이어야 합니다.');
      return;
    }
    const total = selectedOpen.reduce((sum, row) => sum + row.totalAmt, 0);
    const confirmed = await confirm({
      title: '매입마감',
      description: `선택한 ${selectedOpen.length}건을 ${formatClosingMonth(closingMonth)} 마감월로 마감합니다. 합계금액 ${won(total)}. 마감한 입고 행은 입고등록에서 수정·취소할 수 없고, 마감을 해제하면 다시 가능합니다.`,
      confirmLabel: '마감',
    });
    if (!confirmed) return;
    setWorking(true);
    try {
      const count = await closeReceiptRows(
        closingMonth,
        selectedOpen.map((row) => ({
          receiptDetailId: row.purchaseReceiptDetailId,
          unitPrice: row.unitPrice,
          taxType: row.taxType,
          vatIncludedAt: row.vatIncludedAt,
        })),
      );
      setNotice(`${count}건을 ${formatClosingMonth(closingMonth)}로 마감했습니다.`);
      list.refreshQuietly();
    } catch (error: unknown) {
      list.setError(error instanceof Error ? error.message : '매입마감을 처리하지 못했습니다.');
    } finally {
      setWorking(false);
    }
  }, [canEdit, closingMonth, confirm, list, selectedClosed.length, selectedOpen, working]);

  const handleRelease = useCallback(async () => {
    if (!canEdit || working || selectedClosed.length === 0 || selectedOpen.length > 0) return;
    const confirmed = await confirm({
      title: '매입마감 해제',
      description: `선택한 ${selectedClosed.length}건의 매입마감을 해제합니다. 마감 단가와 금액은 비워지고 입고의 원래 값으로 돌아갑니다.`,
      confirmLabel: '해제',
    });
    if (!confirmed) return;
    setWorking(true);
    try {
      const count = await releaseReceiptRows(selectedClosed.map((row) => row.purchaseReceiptDetailId));
      setNotice(`${count}건의 매입마감을 해제했습니다.`);
      list.refreshQuietly();
    } catch (error: unknown) {
      list.setError(error instanceof Error ? error.message : '매입마감을 해제하지 못했습니다.');
    } finally {
      setWorking(false);
    }
  }, [canEdit, confirm, list, selectedClosed, selectedOpen.length, working]);

  const showSearchResultMessage =
    list.hasLoaded && !list.loading && !list.initialLoad.loading && !search.defaultsError && !list.error;
  const mixedSelection = selectedOpen.length > 0 && selectedClosed.length > 0;
  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        {
          label: '조회',
          icon: SearchIcon,
          visible: selectedMenuPermissions?.read ?? false,
          disabled: !search.defaultsInitialized || list.loading,
          onClick: runSearch,
        },
      ],
    },
    {
      key: 'closing',
      actions: [
        {
          label: '마감',
          icon: LockIcon,
          visible: canEdit,
          disabled: working || list.loading || selectedOpen.length === 0 || mixedSelection,
          onClick: () => void handleClose(),
        },
        {
          label: '해제',
          icon: LockOpenIcon,
          visible: canEdit,
          disabled: working || list.loading || selectedClosed.length === 0 || mixedSelection,
          onClick: () => void handleRelease(),
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
        <PageLoadBoundary {...list.initialLoad} label="매입마감" onRetry={list.retry}>
          <PageSearchArea
            searchField={
              <TextField
                size="small"
                margin="none"
                placeholder="품목코드/품목명 검색"
                value={search.keyword}
                disabled={!search.defaultsInitialized}
                onChange={(event) => search.setKeyword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') runSearch();
                }}
                slotProps={{
                  htmlInput: { 'aria-label': '매입마감 빠른 검색' },
                  input: {
                    endAdornment: search.keyword ? (
                      <IconButton
                        type="button"
                        size="small"
                        edge="end"
                        aria-label="매입마감 검색어 초기화"
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
            onDefaultSearch={runSearch}
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
          <PageMessageArea
            message={notice}
            onClose={() => setNotice('')}
            severity="success"
            role="status"
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
              minHeight: 420,
              minWidth: 0,
            }}
          >
            <Splitter
              direction="horizontal"
              mobileMode="stacked"
              mobileBreakpoint={768}
              minSize={300}
              maxSize={720}
              initialSize={splitterSize}
              onSizeChange={setSplitterSize}
              ariaLabel="구매처 요약과 입고 행 분리기"
            >
              <Paper variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <Box sx={{ p: 1.5, pb: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>구매처별 요약</Typography>
                  <Typography variant="caption" color="text.secondary">
                    구매처를 선택하면 오른쪽에 그 구매처의 입고 행만 표시됩니다.
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, minHeight: 280, minWidth: 0, overflow: 'hidden', px: 1, pb: 1 }}>
                  <F1Grid
                    key={supplierGridKey}
                    ariaLabel="구매처별 매입마감 요약"
                    storageKey="materials-purchase-closing-supplier-grid-v2"
                    columns={supplierColumns}
                    rowKey="supplierId"
                    rows={list.suppliers}
                    loading={list.loading}
                    showCheckbox={false}
                    selectionMode="row"
                    features={[{ ftype: 'summary', dock: 'bottom' }]}
                    onSelectionChange={(ids) => setSelectedSupplierId(ids.length ? Number(ids[0]) : null)}
                    selectRowOnContextMenu={false}
                    allowAddRowInContextMenu={false}
                    allowDuplicateRowInContextMenu={false}
                    allowDeleteRowInContextMenu={false}
                    canExportExcel={false}
                    height="100%"
                    minHeight={280}
                  />
                </Box>
              </Paper>
              <Paper variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <Box
                  sx={{
                    p: 1.5,
                    pb: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 1,
                  }}
                >
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      입고 행 · 마감월 {formatClosingMonth(closingMonth)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {canEdit
                        ? '미마감 행을 체크해 마감하세요. 마감 전에 단가·부가세구분·포함 여부를 고칠 수 있고 금액은 서버가 계산합니다. 마감 행은 체크해 해제할 수 있습니다.'
                        : '마감 처리 권한이 없어 조회만 할 수 있습니다.'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    {selectedSupplier ? (
                      <Chip
                        size="small"
                        label={`구매처: ${selectedSupplier.supplierName ?? ''}`}
                        onDelete={clearSupplier}
                        deleteIcon={<ClearIcon aria-label="구매처 선택 해제" />}
                      />
                    ) : null}
                    {selectedRows.length > 0 ? (
                      <Chip
                        size="small"
                        color={mixedSelection ? 'warning' : 'primary'}
                        variant="outlined"
                        label={mixedSelection
                          ? '마감 행과 미마감 행을 함께 선택할 수 없습니다'
                          : `선택 ${selectedRows.length}건 · ${won(selectedRows.reduce((sum, row) => sum + row.totalAmt, 0))}`}
                      />
                    ) : null}
                  </Box>
                </Box>
                <Box sx={{ flex: 1, minHeight: 280, minWidth: 0, overflow: 'hidden', px: 1, pb: 1 }}>
                  <F1Grid
                    key={rowsKey}
                    highlightKeyword={search.appliedFilters?.keyword}
                    ref={rowGridRef}
                    ariaLabel="매입마감 입고 행"
                    storageKey="materials-purchase-closing-row-grid-v2"
                    columns={rowColumns}
                    rowKey="purchaseReceiptDetailId"
                    rows={visibleRows}
                    loading={list.loading}
                    showCheckbox={canEdit}
                    multiSelect
                    features={[{ ftype: 'summary', dock: 'bottom' }]}
                    onChangesChange={handleChangesChange}
                    onSelectionChange={setSelectedRowIds}
                    allowAddRowInContextMenu={false}
                    allowDuplicateRowInContextMenu={false}
                    allowDeleteRowInContextMenu={false}
                    canExportExcel={selectedMenuPermissions?.excel ?? false}
                    excelFileName="매입마감"
                    height="100%"
                    minHeight={280}
                  />
                </Box>
              </Paper>
            </Splitter>
          </Box>
        </PageLoadBoundary>
      </PageLoadBoundary>
      {dialog}
    </Box>
  );
}
