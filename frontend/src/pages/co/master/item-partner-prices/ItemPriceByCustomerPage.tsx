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
  PRICE_HISTORY_FIELD,
  PRICE_ITEM_TYPE_FIELD,
  PRICE_REGISTER_FIELD,
  priceSearchDefaults,
  searchText,
} from './data/priceSearchFields';
import { ItemPartnerPriceGrid } from './components/ItemPartnerPriceGrid';
import { ItemPartnerPriceImportDialog } from './components/ItemPartnerPriceImportDialog';
import { ItemPriceCustomerList } from './components/ItemPriceCustomerList';
import { useItemPartnerPriceCodes } from './hooks/useItemPartnerPriceCodes';
import { useItemPriceByCustomer } from './hooks/useItemPriceByCustomer';
import { downloadItemPartnerPriceTemplate } from './services/itemPartnerPriceExcel.service';
import type { ItemPartnerPriceRow, ItemPartnerPriceTradeType } from './types/itemPartnerPrice.types';
import type { ItemPriceCustomerFilters, ItemPriceCustomerRegisterFilter, ItemPriceCustomerRow } from './types/itemPriceCustomer.types';

const DETAIL_FIELDS: PageSearchField[] = [PRICE_REGISTER_FIELD, PRICE_ITEM_TYPE_FIELD, PRICE_HISTORY_FIELD];

function toFilters(keyword: string, values: Record<string, PageSearchFieldValue>): ItemPriceCustomerFilters {
  return {
    keyword: keyword.trim() || undefined,
    registerFilter: (searchText(values, 'registerFilter') || 'ALL') as ItemPriceCustomerRegisterFilter,
    itemTypes: searchText(values, 'itemTypes') || undefined,
  };
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

/** 거래처 기준 탭: 좌측 거래처 목록에서 거래처를 고르면 우측에서 그 거래처의 특별단가를 조회·입력한다. */
export function ItemPriceByCustomerPage({
  tradeType, selectedModule, currentMenuName, content, breadcrumbItems, selectedMenuPermissions,
  isTenantAdmin = false, tabs, onDirtyChange,
}: Props) {
  const codeOptions = useItemPartnerPriceCodes();
  const management = useItemPriceByCustomer(tradeType);
  const { confirm, dialog: confirmDialog } = useCommonConfirmDialog();
  useUnsavedChangesBeforeUnload(management.hasChanges);
  useEffect(() => { onDirtyChange?.(management.hasChanges); }, [management.hasChanges, onDirtyChange]);
  const gridRef = useRef<F1GridRef<ItemPartnerPriceRow>>(null);
  const [keyword, setKeyword] = useState('');
  const defaultValues = useMemo(
    () => priceSearchDefaults(tradeType, { registerFilter: 'ALL', includeHistory: 'N' }),
    [tradeType],
  );
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

  const searchCustomers = async (values: Record<string, PageSearchFieldValue>) => {
    if (management.saving) return;
    if (!(await confirmDiscard())) {
      setDetailValues(appliedValues);
      return;
    }
    management.discardChanges();
    setAppliedValues(values);
    setDetailValues(values);
    management.searchCustomers(toFilters(keyword, values));
    const history = values.includeHistory === 'Y';
    if (history !== management.includeHistory) management.changeIncludeHistory(history);
  };

  const selectCustomer = async (customer: ItemPriceCustomerRow | null) => {
    if (customer?.customerId === selected?.customerId) return;
    if (!(await confirmDiscard())) {
      setRevertKey((key) => key + 1);
      return;
    }
    management.discardChanges();
    management.selectCustomer(customer);
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
      onClick: () => { void searchCustomers(appliedValues); },
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

  const fixedCustomer = useMemo(
    () => selected
      ? { customerId: selected.customerId, customerCode: selected.customerCode, customerName: selected.customerName }
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
        label="거래처 목록"
        onRetry={() => management.searchCustomers(management.customerFilters)}
      >
        <PageSearchArea
          searchField={
            <TextField
              size="small"
              margin="none"
              placeholder="거래처 코드·명·사업자번호 검색"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              slotProps={{
                htmlInput: { 'aria-label': '거래처 검색' },
                input: {
                  endAdornment: keyword
                    ? <IconButton size="small" aria-label="거래처 검색어 초기화" onClick={() => setKeyword('')}>×</IconButton>
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
          onDefaultSearch={() => { void searchCustomers(appliedValues); }}
          detailFields={DETAIL_FIELDS}
          detailValues={detailValues}
          appliedDetailValues={appliedValues}
          defaultValues={defaultValues}
          onDetailValuesChange={setDetailValues}
          onDetailSearch={(values) => { void searchCustomers(values); }}
          detailLoading={management.customersLoading}
        />
        <PageMessageArea message={management.error} onClose={() => management.setError('')} />
        <Box sx={{
          display: 'flex', flex: 1, minHeight: 280, minWidth: 0, gap: 1, p: 1,
          flexDirection: { xs: 'column', md: 'row' },
        }}>
          <Box sx={{ flex: { md: '0 0 500px' }, minWidth: 0, minHeight: { xs: 260, md: 0 }, height: { xs: 300, md: 'auto' } }}>
            <ItemPriceCustomerList
              rows={management.customers}
              gridKey={management.listKey + revertKey * 100000}
              loading={management.customersLoading}
              selectedId={selected?.customerId}
              highlightKeyword={management.customerFilters.keyword}
              onSelect={(customer) => { void selectCustomer(customer); }}
            />
          </Box>
          <Box sx={{ display: 'flex', flex: 1, flexDirection: 'column', minWidth: 0, minHeight: 280 }}>
            <Typography variant="subtitle2" sx={{ px: 0.5, py: 0.75 }}>
              {selected
                ? `${selected.customerCode} · ${selected.customerName} 단가`
                : '왼쪽에서 거래처를 선택해 주세요.'}
            </Typography>
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
                  fixedCustomer={fixedCustomer}
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
