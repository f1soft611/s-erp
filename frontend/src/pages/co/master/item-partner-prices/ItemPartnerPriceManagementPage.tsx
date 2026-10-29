import { useMemo, useRef, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import DownloadOutlined from '@mui/icons-material/DownloadOutlined';
import SearchIcon from '@mui/icons-material/Search';
import SaveIcon from '@mui/icons-material/Save';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import { Box, IconButton, TextField } from '@mui/material';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageLoadBoundary } from '../../../../shared/components/PageLoadBoundary';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { UnsavedChangesConfirmDialog } from '../../../../shared/components/UnsavedChangesConfirmDialog';
import type { F1GridRef } from '../../../../shared/components/f1-grid';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { useUnsavedChangesBeforeUnload } from '../../../../shared/hooks/useUnsavedChangesBeforeUnload';
import { usePageSessionState } from '../../../../shared/hooks/usePageSessionState';
import {
  isPageSearchValues,
  toPageSearchFields,
  type PageSearchFieldValue,
} from '../../../../shared/components/page-search/searchFields';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { ItemPartnerPriceGrid } from './components/ItemPartnerPriceGrid';
import { createItemPartnerPriceColumns } from './components/itemPartnerPriceGridModel';
import { ItemPartnerPriceImportDialog } from './components/ItemPartnerPriceImportDialog';
import { downloadItemPartnerPriceTemplate } from './services/itemPartnerPriceExcel.service';
import { useItemPartnerPriceManagement } from './hooks/useItemPartnerPriceManagement';
import type {
  ItemPartnerPriceFilters,
  ItemPartnerPriceRow,
} from './types/itemPartnerPrice.types';

const SESSION_KEY = 's-erp:page:item-partner-prices';
const SESSION_VERSION = 1;

type SearchSession = {
  keyword: string;
  detailValues: Record<string, PageSearchFieldValue>;
};

type PendingSearch = {
  filters: ItemPartnerPriceFilters;
  session: SearchSession;
};

function isSearchSession(value: unknown): value is SearchSession {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SearchSession>;
  return typeof candidate.keyword === 'string' && isPageSearchValues(candidate.detailValues);
}

function toFilters(session: SearchSession): ItemPartnerPriceFilters {
  const filters: ItemPartnerPriceFilters = {
    keyword: session.keyword.trim() || undefined,
  };
  const tradeType = session.detailValues.tradeType;
  const effectiveOn = session.detailValues.startDt;
  const useAt = session.detailValues.useAt;
  if (typeof tradeType === 'string' && tradeType.trim()) {
    filters.tradeType = tradeType.trim() as ItemPartnerPriceFilters['tradeType'];
  }
  if (typeof effectiveOn === 'string' && effectiveOn.trim()) {
    filters.effectiveOn = effectiveOn.trim();
  }
  if (typeof useAt === 'string' && useAt.trim()) {
    filters.useAt = useAt.trim() as ItemPartnerPriceFilters['useAt'];
  }
  return filters;
}

type Props = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
  isTenantAdmin?: boolean;
};

export function ItemPartnerPriceManagementPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
  isTenantAdmin = false,
}: Props) {
  const { state: searchSession, setState: setSearchSession } =
    usePageSessionState<SearchSession | null>(SESSION_KEY, null, {
      version: SESSION_VERSION,
      validate: (value): value is SearchSession | null =>
        value === null || isSearchSession(value),
    });
  const management = useItemPartnerPriceManagement(
    searchSession ? toFilters(searchSession) : {},
  );
  useUnsavedChangesBeforeUnload(management.hasChanges);
  const gridRef = useRef<F1GridRef<ItemPartnerPriceRow>>(null);
  const [keyword, setKeyword] = useState(searchSession?.keyword ?? '');
  const [detailValues, setDetailValues] = useState<Record<string, PageSearchFieldValue>>(
    searchSession?.detailValues ?? {},
  );
  const [pendingSearch, setPendingSearch] = useState<PendingSearch | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const canCreate = Boolean(isTenantAdmin && selectedMenuPermissions?.create);
  const canUpdate = Boolean(isTenantAdmin && selectedMenuPermissions?.update);
  const canWrite = canCreate || canUpdate;
  const detailFields = useMemo(
    () => toPageSearchFields(createItemPartnerPriceColumns(false))
      .filter((field) => ['tradeType', 'startDt', 'useAt'].includes(field.field)),
    [],
  );

  const search = (filters: ItemPartnerPriceFilters, session: SearchSession) => {
    if (management.saving) return;
    if (management.hasChanges) {
      setPendingSearch({ filters, session });
      return;
    }
    management.applyFilters(filters);
    setSearchSession(session);
    setDetailValues(session.detailValues);
  };
  const searchDefault = () => {
    const session = {
      keyword: keyword.trim(),
      detailValues: searchSession?.detailValues ?? {},
    };
    search(toFilters(session), session);
  };
  const searchDetails = (values: Record<string, PageSearchFieldValue>) => {
    const session = { keyword: keyword.trim(), detailValues: values };
    search(toFilters(session), session);
  };
  const addImportedRows = (rows: ItemPartnerPriceRow[]) => {
    const grid = gridRef.current;
    if (!grid) {
      management.setError('단가 그리드를 준비하지 못했습니다.');
      return;
    }
    rows.forEach((row) => grid.addRow(row));
    setImportOpen(false);
  };

  const actions: PermissionActionGroupDefinition[] = [
    { key: 'write', actions: [
      {
        label: '엑셀 양식 다운로드',
        icon: DownloadOutlined,
        visible: canCreate,
        disabled: management.loading || management.saving,
        onClick: () => {
          void downloadItemPartnerPriceTemplate().catch((cause) =>
            management.setError(cause instanceof Error
              ? cause.message : '엑셀 양식을 다운로드하지 못했습니다.'),
          );
        },
      },
      {
        label: '엑셀 업로드',
        icon: UploadFileOutlined,
        visible: canCreate,
        disabled: management.loading || management.saving,
        onClick: () => setImportOpen(true),
      },
      {
        label: '단가 추가',
        icon: AddIcon,
        visible: canCreate,
        disabled: management.loading || management.saving,
        onClick: () => gridRef.current?.addRow(),
      },
    ] },
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
        const grid = gridRef.current;
        if (!grid) return;
        if (!grid.validate()) {
          management.setError('필수 입력 항목과 단가 조건을 확인해 주세요.');
          return;
        }
        void management.saveChanges(
          grid.getChanges(),
          (savedRows) => grid.acceptSavedRows(savedRows),
        );
      },
    }] },
  ];

  return (
    <Box sx={{
      display: 'flex', flex: 1, flexDirection: 'column',
      minHeight: 0, minWidth: 0, height: '100%',
    }}>
      <PageHeader
        breadcrumbItems={breadcrumbItems?.length
          ? breadcrumbItems : [selectedModule.name, currentMenuName]}
        description={content.description}
        actionGroups={actions}
      />
      <PageLoadBoundary
        {...management.initialLoad}
        label="단가 목록"
        onRetry={() => management.applyFilters(management.appliedFilters)}
      >
        <PageSearchArea
          searchField={
            <TextField
              size="small"
              margin="none"
              placeholder="품목/거래처 코드 또는 명 검색"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              slotProps={{
                htmlInput: { 'aria-label': '단가 검색' },
                input: {
                  endAdornment: keyword
                    ? <IconButton
                        size="small"
                        aria-label="단가 검색어 초기화"
                        onClick={() => setKeyword('')}
                      >×</IconButton>
                    : null,
                },
              }}
              sx={(theme) => ({
                width: '100%', height: 40,
                '& .MuiOutlinedInput-root': {
                  height: '100%', borderRadius: '0 8px 8px 0',
                  backgroundColor: theme.palette.background.paper,
                },
              })}
            />
          }
          onDefaultSearch={searchDefault}
          detailFields={detailFields}
          detailValues={detailValues}
          appliedDetailValues={searchSession?.detailValues ?? {}}
          onDetailValuesChange={setDetailValues}
          onDetailSearch={searchDetails}
          detailLoading={management.loading}
        />
        <PageMessageArea
          message={management.error}
          onClose={() => management.setError('')}
        />
        <Box sx={{ flex: 1, minHeight: 280, minWidth: 0, p: 1 }}>
          <ItemPartnerPriceGrid
            rows={management.rows}
            canCreate={canCreate && !management.loading && !management.saving}
            canUpdate={canUpdate && !management.loading && !management.saving}
            canExportExcel={Boolean(selectedMenuPermissions?.excel)}
            loading={management.loading}
            gridKey={management.gridKey}
            gridRef={gridRef}
            onChangesChange={management.handleChangesChange}
          />
        </Box>
        <ItemPartnerPriceImportDialog
          open={importOpen}
          onClose={() => setImportOpen(false)}
          onStage={addImportedRows}
        />
        <UnsavedChangesConfirmDialog
          open={pendingSearch !== null}
          title="저장하지 않은 변경사항"
          description="변경사항을 버리고 단가 목록을 다시 불러오시겠습니까?"
          cancelLabel="취소"
          continueLabel="계속"
          onCancel={() => {
            setPendingSearch(null);
            setDetailValues(searchSession?.detailValues ?? {});
          }}
          onContinue={() => {
            if (pendingSearch) {
              management.discardChanges();
              management.applyFilters(pendingSearch.filters);
              setSearchSession(pendingSearch.session);
              setDetailValues(pendingSearch.session.detailValues);
            }
            setPendingSearch(null);
          }}
        />
      </PageLoadBoundary>
    </Box>
  );
}
