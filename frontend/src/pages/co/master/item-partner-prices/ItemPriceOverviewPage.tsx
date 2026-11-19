import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined';
import DownloadOutlined from '@mui/icons-material/DownloadOutlined';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import SearchIcon from '@mui/icons-material/Search';
import SaveIcon from '@mui/icons-material/Save';
import { Box, IconButton, TextField } from '@mui/material';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageLoadBoundary } from '../../../../shared/components/PageLoadBoundary';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { UnsavedChangesConfirmDialog } from '../../../../shared/components/UnsavedChangesConfirmDialog';
import type { F1TreeRef } from '../../../../shared/components/f1-grid';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import type { PageSearchField, PageSearchFieldValue } from '../../../../shared/components/page-search/searchFields';
import { useCommonConfirmDialog } from '../../../../shared/hooks/useCommonConfirmDialog';
import { useUnsavedChangesBeforeUnload } from '../../../../shared/hooks/useUnsavedChangesBeforeUnload';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import {
  downloadItemPriceOverviewTemplate,
  parseItemPriceOverviewWorkbook,
} from './services/itemPriceOverviewExcel.service';
import { PRICE_STATUS_FIELD, searchText } from './data/priceSearchFields';
import { createItemPriceChildRow } from './components/itemPriceOverviewGridModel';
import { ItemPriceOverviewTree } from './components/ItemPriceOverviewTree';
import { ItemPriceRemoveDialog } from './components/ItemPriceRemoveDialog';
import { useItemPartnerPriceCodes } from './hooks/useItemPartnerPriceCodes';
import { useItemPriceOverview } from './hooks/useItemPriceOverview';
import type {
  ItemPriceOverviewFilter,
  ItemPriceOverviewFilters,
  ItemPriceOverviewRow,
} from './types/itemPriceOverview.types';

const DETAIL_FIELDS: PageSearchField[] = [PRICE_STATUS_FIELD];

function toFilters(keyword: string, values: Record<string, PageSearchFieldValue>): ItemPriceOverviewFilters {
  const filters: ItemPriceOverviewFilters = { keyword: keyword.trim() || undefined };
  const priceFilter = searchText(values, 'priceFilter');
  if (priceFilter && priceFilter !== 'ALL') filters.priceFilter = priceFilter as ItemPriceOverviewFilter;
  return filters;
}

type PendingSearch = { filters: ItemPriceOverviewFilters; keyword: string; values: Record<string, PageSearchFieldValue> };

type Props = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
  isTenantAdmin?: boolean;
  tabs?: ReactNode;
  onDirtyChange?: (dirty: boolean) => void;
};

export function ItemPriceOverviewPage({
  selectedModule, currentMenuName, content, breadcrumbItems, selectedMenuPermissions,
  isTenantAdmin = false, tabs, onDirtyChange,
}: Props) {
  const codeOptions = useItemPartnerPriceCodes();
  const management = useItemPriceOverview();
  useUnsavedChangesBeforeUnload(management.hasChanges);
  useEffect(() => { onDirtyChange?.(management.hasChanges); }, [management.hasChanges, onDirtyChange]);
  const treeRef = useRef<F1TreeRef<ItemPriceOverviewRow>>(null);
  const [keyword, setKeyword] = useState('');
  const [detailValues, setDetailValues] = useState<Record<string, PageSearchFieldValue>>({ priceFilter: 'ALL' });
  const [appliedValues, setAppliedValues] = useState<Record<string, PageSearchFieldValue>>({ priceFilter: 'ALL' });
  const [selectedRowId, setSelectedRowId] = useState<string | number | undefined>(undefined);
  const [pending, setPending] = useState<PendingSearch | null>(null);
  const [removeTarget, setRemoveTarget] = useState<ItemPriceOverviewRow | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const { confirm, dialog: confirmDialog } = useCommonConfirmDialog();
  const canCreate = Boolean(isTenantAdmin && selectedMenuPermissions?.create);
  const canUpdate = Boolean(isTenantAdmin && selectedMenuPermissions?.update);
  const canDelete = Boolean(isTenantAdmin && selectedMenuPermissions?.delete);
  const canWrite = canCreate || canUpdate;
  const selectedRow = management.rows.find((row) => row.rowId === selectedRowId) ?? null;

  const search = (next: PendingSearch) => {
    if (management.saving) return;
    if (management.hasChanges) {
      setPending(next);
      return;
    }
    management.applyFilters(next.filters);
    setAppliedValues(next.values);
  };
  const searchDefault = () => search({ filters: toFilters(keyword, appliedValues), keyword, values: appliedValues });
  const searchDetails = (values: Record<string, PageSearchFieldValue>) =>
    search({ filters: toFilters(keyword, values), keyword, values });

  const addSpecialPrice = () => {
    const tree = treeRef.current;
    if (!tree || selectedRowId === undefined) {
      management.setError('특별단가를 추가할 품목 행을 먼저 선택해 주세요.');
      return;
    }
    const active = tree.getActiveRows();
    const selected = active.find((row) => row.rowId === selectedRowId);
    const parent = selected?.parentId ? active.find((row) => row.rowId === selected.parentId) : selected;
    if (!parent) return;
    tree.addChildRow(parent.rowId, createItemPriceChildRow(parent));
    tree.expandRow(parent.rowId);
  };

  const readImportFile = async (file?: File) => {
    if (!file) return;
    management.setError('');
    try {
      const result = await parseItemPriceOverviewWorkbook(file, management.rows, codeOptions);
      if (result.errors.length) {
        const shown = result.errors.slice(0, 8).join('\n');
        const more = result.errors.length > 8 ? `\n외 ${result.errors.length - 8}건` : '';
        management.setError(`${shown}${more}`);
        return;
      }
      if (!result.updatedRows.length) {
        management.setError('엑셀에서 변경된 단가가 없습니다.');
        return;
      }
      const confirmed = await confirm({
        title: '엑셀 단가 반영',
        description: `엑셀에서 ${result.updatedRows.length}개 품목의 단가가 변경됩니다. 반영하시겠습니까?`,
        confirmLabel: '반영',
      });
      if (confirmed) await management.applyImport(result.updatedRows);
    } catch (cause) {
      management.setError(cause instanceof Error ? cause.message : '엑셀 파일을 읽지 못했습니다.');
    }
  };

  const actions: PermissionActionGroupDefinition[] = [
    { key: 'write', actions: [
      {
        label: '엑셀 양식 다운로드',
        icon: DownloadOutlined,
        visible: canCreate,
        disabled: management.loading || management.saving,
        onClick: () => {
          void downloadItemPriceOverviewTemplate(management.rows, codeOptions).catch((cause) =>
            management.setError(cause instanceof Error ? cause.message : '엑셀 양식을 다운로드하지 못했습니다.'));
        },
      },
      {
        label: '엑셀 업로드',
        icon: UploadFileOutlined,
        visible: canCreate,
        disabled: management.loading || management.saving,
        onClick: () => {
          if (management.hasChanges) {
            management.setError('저장하지 않은 변경사항이 있습니다. 저장하거나 다시 조회한 뒤 업로드해 주세요.');
            return;
          }
          fileInput.current?.click();
        },
      },
    ] },
    { key: 'write', actions: [{
      label: '특별단가 추가',
      icon: AddIcon,
      visible: canCreate,
      disabled: management.loading || management.saving || selectedRowId === undefined,
      onClick: addSpecialPrice,
    }] },
    { key: 'delete', actions: [{
      label: '단가 삭제',
      icon: DeleteOutlineOutlined,
      visible: canDelete,
      disabled: !selectedRow || management.hasChanges || management.loading || management.saving,
      onClick: () => setRemoveTarget(selectedRow),
    }] },
    { key: 'read', actions: [{
      label: '조회',
      icon: SearchIcon,
      visible: Boolean(selectedMenuPermissions?.read),
      disabled: management.saving,
      onClick: searchDefault,
    }] },
    { key: 'write', actions: [{
      label: '저장',
      icon: SaveIcon,
      saving: management.saving,
      savingAriaLabel: '단가 저장 중',
      visible: canWrite,
      disabled: !management.hasChanges || management.saving || management.loading,
      onClick: () => {
        const tree = treeRef.current;
        if (!tree) return;
        if (!tree.validate()) {
          management.setError('입력 값을 확인해 주세요.');
          return;
        }
        void management.saveChanges(tree.getChanges());
      },
    }] },
  ];

  const rowSummary = useMemo(() => management.rows.filter((row) => row.parentId === null).length, [management.rows]);

  return (
    <Box sx={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0, minWidth: 0, height: '100%' }}>
      <PageHeader
        breadcrumbItems={breadcrumbItems?.length ? breadcrumbItems : [selectedModule.name, currentMenuName]}
        description={content.description}
        actionGroups={actions}
      />
      {tabs}
      <PageLoadBoundary
        {...management.initialLoad}
        label="품목 기준 단가"
        onRetry={() => management.applyFilters(management.appliedFilters)}
      >
        <PageSearchArea
          searchField={
            <TextField
              size="small"
              margin="none"
              placeholder="품목코드·품목명·규격 검색"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              slotProps={{
                htmlInput: { 'aria-label': '품목 검색' },
                input: {
                  endAdornment: keyword
                    ? <IconButton size="small" aria-label="품목 검색어 초기화" onClick={() => setKeyword('')}>×</IconButton>
                    : null,
                },
              }}
              sx={(theme) => ({
                width: '100%', height: 40,
                '& .MuiOutlinedInput-root': {
                  height: '100%', borderRadius: '0 6px 6px 0', backgroundColor: theme.palette.background.paper,
                },
              })}
            />
          }
          onDefaultSearch={searchDefault}
          detailFields={DETAIL_FIELDS}
          detailValues={detailValues}
          appliedDetailValues={appliedValues}
          onDetailValuesChange={setDetailValues}
          onDetailSearch={searchDetails}
          detailLoading={management.loading}
        />
        <PageMessageArea message={management.error} onClose={() => management.setError('')} />
        <Box sx={{ flex: 1, minHeight: 280, minWidth: 0, p: 1 }} data-item-count={rowSummary}>
          <ItemPriceOverviewTree
            rows={management.rows}
            treeRef={treeRef}
            gridKey={management.gridKey}
            loading={management.loading}
            canCreate={canCreate && !management.saving}
            canUpdate={canUpdate && !management.saving}
            canExportExcel={Boolean(selectedMenuPermissions?.excel)}
            today={management.today}
            highlightKeyword={management.appliedFilters.keyword}
            codeOptions={codeOptions}
            onChangesChange={management.handleChangesChange}
            onSelectionChange={(ids) => setSelectedRowId(ids[0])}
          />
        </Box>
        <input
          ref={fileInput}
          hidden
          type="file"
          accept=".xlsx"
          aria-label="품목 기준 단가 엑셀 파일 선택"
          onChange={(event) => {
            void readImportFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
        {confirmDialog}
        <ItemPriceRemoveDialog
          row={removeTarget}
          onClose={() => setRemoveTarget(null)}
          onConfirm={(sides, mode) => {
            const target = removeTarget;
            setRemoveTarget(null);
            if (target) void management.removePrices(target, sides, mode);
          }}
        />
        <UnsavedChangesConfirmDialog
          open={pending !== null}
          title="저장하지 않은 변경사항"
          description="변경사항을 버리고 단가 목록을 다시 불러오시겠습니까?"
          cancelLabel="취소"
          continueLabel="계속"
          onCancel={() => {
            setPending(null);
            setDetailValues(appliedValues);
          }}
          onContinue={() => {
            if (pending) {
              management.discardChanges();
              management.applyFilters(pending.filters);
              setAppliedValues(pending.values);
              setDetailValues(pending.values);
            }
            setPending(null);
          }}
        />
      </PageLoadBoundary>
    </Box>
  );
}
