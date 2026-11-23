import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import AddIcon from '@mui/icons-material/Add';
import DownloadOutlined from '@mui/icons-material/DownloadOutlined';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import { Box, IconButton, TextField, Typography } from '@mui/material';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageLoadBoundary } from '../../../../shared/components/PageLoadBoundary';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import type { F1GridRef } from '../../../../shared/components/f1-grid';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import type { PageSearchField, PageSearchFieldValue } from '../../../../shared/components/page-search/searchFields';
import { useCommonConfirmDialog } from '../../../../shared/hooks/useCommonConfirmDialog';
import { useUnsavedChangesBeforeUnload } from '../../../../shared/hooks/useUnsavedChangesBeforeUnload';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import {
  PRICE_ITEM_TYPE_FIELD,
  priceSearchDefaults,
  priceStatusField,
  searchText,
} from './data/priceSearchFields';
import { ItemPartnerPriceGrid } from './components/ItemPartnerPriceGrid';
import { ItemPartnerPriceImportDialog } from './components/ItemPartnerPriceImportDialog';
import { ItemPriceItemList } from './components/ItemPriceItemList';
import { useItemPartnerPriceCodes } from './hooks/useItemPartnerPriceCodes';
import { useItemPriceOverview } from './hooks/useItemPriceOverview';
import { downloadItemPartnerPriceTemplate } from './services/itemPartnerPriceExcel.service';
import type { ItemPartnerPriceRow, ItemPartnerPriceTradeType } from './types/itemPartnerPrice.types';
import type { ItemPriceOverviewFilter, ItemPriceOverviewFilters, ItemPriceOverviewRow } from './types/itemPriceOverview.types';

function toFilters(keyword: string, values: Record<string, PageSearchFieldValue>): ItemPriceOverviewFilters {
  const filters: ItemPriceOverviewFilters = { keyword: keyword.trim() || undefined };
  const priceFilter = searchText(values, 'priceFilter');
  if (priceFilter && priceFilter !== 'ALL') filters.priceFilter = priceFilter as ItemPriceOverviewFilter;
  filters.itemTypes = searchText(values, 'itemTypes') || undefined;
  return filters;
}

type Props = {
  /** 화면의 거래구분(매입단가등록=매입, 매출단가등록=매출). */
  tradeType: ItemPartnerPriceTradeType;
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
  isTenantAdmin?: boolean;
  tabs?: ReactNode;
  onDirtyChange?: (dirty: boolean) => void;
};

/**
 * 품목 기준 탭: 좌측 품목 목록에서 품목을 고르면 우측에서 그 품목의 거래처별 단가를 조회·입력한다.
 * 단가는 항상 거래처에 붙고, 매입은 거래처가 2곳 이상이면 기본 거래처를 하나 지정해야 한다.
 */
export function ItemPriceOverviewPage({
  tradeType, selectedModule, currentMenuName, content, breadcrumbItems, selectedMenuPermissions,
  isTenantAdmin = false, tabs, onDirtyChange,
}: Props) {
  const codeOptions = useItemPartnerPriceCodes();
  const management = useItemPriceOverview(tradeType);
  const detailFields = useMemo<PageSearchField[]>(
    () => [priceStatusField(tradeType), PRICE_ITEM_TYPE_FIELD],
    [tradeType],
  );
  const defaultValues = useMemo(() => priceSearchDefaults(tradeType, { priceFilter: 'ALL' }), [tradeType]);
  const { confirm, dialog: confirmDialog } = useCommonConfirmDialog();
  useUnsavedChangesBeforeUnload(management.hasChanges);
  useEffect(() => { onDirtyChange?.(management.hasChanges); }, [management.hasChanges, onDirtyChange]);
  const gridRef = useRef<F1GridRef<ItemPartnerPriceRow>>(null);
  const [keyword, setKeyword] = useState('');
  const [detailValues, setDetailValues] = useState<Record<string, PageSearchFieldValue>>(defaultValues);
  const [appliedValues, setAppliedValues] = useState<Record<string, PageSearchFieldValue>>(defaultValues);
  const [revertKey, setRevertKey] = useState(0);
  const [importOpen, setImportOpen] = useState(false);
  const canCreate = Boolean(isTenantAdmin && selectedMenuPermissions?.create);
  const canUpdate = Boolean(isTenantAdmin && selectedMenuPermissions?.update);
  const canDelete = Boolean(isTenantAdmin && selectedMenuPermissions?.delete);
  const canWrite = canCreate || canUpdate || canDelete;
  const selected = management.selected;

  const confirmDiscard = async () => {
    if (!management.hasChanges) return true;
    return confirm({
      title: '저장하지 않은 변경사항',
      description: '변경사항을 버리고 계속하시겠습니까?',
      confirmLabel: '계속',
    });
  };

  const searchItems = async (values: Record<string, PageSearchFieldValue>) => {
    if (management.saving) return;
    if (!(await confirmDiscard())) {
      setDetailValues(appliedValues);
      return;
    }
    management.discardChanges();
    setAppliedValues(values);
    setDetailValues(values);
    management.searchItems(toFilters(keyword, values));
  };

  const selectItem = async (item: ItemPriceOverviewRow | null) => {
    if (item?.materialId === selected?.materialId) return;
    if (!(await confirmDiscard())) {
      setRevertKey((key) => key + 1);
      return;
    }
    management.discardChanges();
    management.selectItem(item);
  };

  const addImportedRows = async (imported: ItemPartnerPriceRow[]) => {
    setImportOpen(false);
    const confirmed = await confirm({
      title: '엑셀 단가 저장',
      description: `엑셀의 단가 ${imported.length}건을 저장합니다. 계속하시겠습니까?`,
      confirmLabel: '저장',
    });
    if (confirmed) await management.saveImportedRows(imported);
  };

  const actions: PermissionActionGroupDefinition[] = [
    { key: 'write', actions: [
      {
        label: '엑셀 양식 다운로드',
        icon: DownloadOutlined,
        visible: canCreate,
        disabled: management.saving,
        onClick: () => {
          void downloadItemPartnerPriceTemplate({ ...codeOptions, tradeType }).catch((cause) =>
            management.setError(cause instanceof Error ? cause.message : '엑셀 양식을 다운로드하지 못했습니다.'));
        },
      },
      {
        label: '엑셀 업로드',
        icon: UploadFileOutlined,
        visible: canCreate,
        disabled: management.saving || management.hasChanges,
        onClick: () => setImportOpen(true),
      },
      {
        label: '단가 추가',
        icon: AddIcon,
        visible: canCreate,
        disabled: !selected || management.rowsLoading || management.saving,
        onClick: () => gridRef.current?.addRow(),
      },
    ] },
    { key: 'read', actions: [{
      label: '조회',
      icon: SearchIcon,
      visible: Boolean(selectedMenuPermissions?.read),
      disabled: management.saving,
      onClick: () => { void searchItems(appliedValues); },
    }] },
    { key: 'write', actions: [{
      label: '저장',
      icon: SaveIcon,
      saving: management.saving,
      savingAriaLabel: '단가 저장 중',
      visible: canWrite,
      disabled: !management.hasChanges || management.saving || management.rowsLoading,
      onClick: () => {
        const grid = gridRef.current;
        if (!grid) return;
        if (!grid.validate()) {
          management.setError('필수 입력 항목과 단가 조건을 확인해 주세요.');
          return;
        }
        void management.saveChanges(grid.getChanges());
      },
    }] },
  ];

  const fixedMaterial = useMemo(
    () => selected
      ? {
          materialId: selected.materialId,
          materialCode: selected.materialCode,
          materialName: selected.materialName,
          materialSpec: selected.materialSpec,
          materialUnit: selected.materialUnit,
        }
      : undefined,
    [selected],
  );

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
        label="품목 목록"
        onRetry={() => management.searchItems(management.itemFilters)}
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
          onDefaultSearch={() => { void searchItems(appliedValues); }}
          detailFields={detailFields}
          detailValues={detailValues}
          appliedDetailValues={appliedValues}
          defaultValues={defaultValues}
          onDetailValuesChange={setDetailValues}
          onDetailSearch={(values) => { void searchItems(values); }}
          detailLoading={management.itemsLoading}
        />
        <PageMessageArea message={management.error} onClose={() => management.setError('')} />
        <Box sx={{
          display: 'flex', flex: 1, minHeight: 280, minWidth: 0, gap: 1, p: 1,
          flexDirection: { xs: 'column', md: 'row' },
        }}>
          <Box sx={{ flex: { md: '0 0 520px' }, minWidth: 0, minHeight: { xs: 260, md: 0 }, height: { xs: 300, md: 'auto' } }}>
            <ItemPriceItemList
              tradeType={tradeType}
              rows={management.items}
              gridKey={management.listKey + revertKey * 100000}
              loading={management.itemsLoading}
              selectedId={selected?.materialId}
              highlightKeyword={management.itemFilters.keyword}
              onSelect={(item) => { void selectItem(item); }}
            />
          </Box>
          <Box sx={{ display: 'flex', flex: 1, flexDirection: 'column', minWidth: 0, minHeight: 280 }}>
            <Box sx={{ px: 0.5, py: 0.75 }}>
              <Typography variant="subtitle2">
                {selected
                  ? `${selected.materialCode} · ${selected.materialName} 단가`
                  : '왼쪽에서 품목을 선택해 주세요.'}
              </Typography>
              {selected && tradeType === '매입' ? (
                <Typography variant="caption" color="text.secondary">
                  거래처가 2곳 이상이면 기본 거래처를 하나 지정해야 합니다.
                </Typography>
              ) : null}
            </Box>
            <Box sx={{ flex: 1, minHeight: 0 }}>
              {selected ? (
                <ItemPartnerPriceGrid
                  rows={management.rows}
                  canCreate={canCreate && !management.saving}
                  canUpdate={canUpdate && !management.saving}
                  canDelete={canDelete && !management.saving}
                  canExportExcel={Boolean(selectedMenuPermissions?.excel)}
                  loading={management.rowsLoading}
                  gridKey={management.gridKey}
                  gridRef={gridRef}
                  codeOptions={codeOptions}
                  tradeType={tradeType}
                  fixedMaterial={fixedMaterial}
                  onChangesChange={management.handleChangesChange}
                />
              ) : null}
            </Box>
          </Box>
        </Box>
        <ItemPartnerPriceImportDialog
          open={importOpen}
          onClose={() => setImportOpen(false)}
          onStage={(rows) => { void addImportedRows(rows); }}
          codeOptions={codeOptions}
          tradeType={tradeType}
          stageLabel="저장"
        />
        {confirmDialog}
      </PageLoadBoundary>
    </Box>
  );
}
