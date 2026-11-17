import { useCallback, useMemo, useRef, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import ClearIcon from '@mui/icons-material/Clear';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import { Box, IconButton, TextField } from '@mui/material';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageLoadBoundary } from '../../../../shared/components/PageLoadBoundary';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { UnsavedChangesConfirmDialog } from '../../../../shared/components/UnsavedChangesConfirmDialog';
import { useUnsavedChangesBeforeUnload } from '../../../../shared/hooks/useUnsavedChangesBeforeUnload';
import { usePageSessionState } from '../../../../shared/hooks/usePageSessionState';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import {
  type F1GridRef,
  type F1GridValidationError,
} from '../../../../shared/components/f1-grid';
import {
  isPageSearchValues,
  toPageSearchFields,
  type PageSearchFieldValue,
} from '../../../../shared/components/page-search/searchFields';
import type {
  MenuPermission,
  ModuleItem,
  PageContent,
} from '../../../dashboard/types/dashboard';
import { WarehouseGrid, createWarehouseColumns } from './components/WarehouseGrid';
import { useWarehouseManagement } from './hooks/useWarehouseManagement';
import type {
  WarehouseFilters,
  WarehouseRow,
} from './types/warehouseManagement.types';

const WAREHOUSE_SEARCH_SESSION_KEY = 's-erp:page:warehouse-management';
const WAREHOUSE_SEARCH_SESSION_VERSION = 1;

type WarehouseSearchSession = {
  keyword: string;
  detailValues: Record<string, PageSearchFieldValue>;
};

type PendingWarehouseSearch = {
  filters: WarehouseFilters;
  session: WarehouseSearchSession;
};

function isWarehouseSearchSession(value: unknown): value is WarehouseSearchSession {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<WarehouseSearchSession>;
  return typeof candidate.keyword === 'string' && isPageSearchValues(candidate.detailValues);
}

function toWarehouseSearchFilters(session: WarehouseSearchSession): WarehouseFilters {
  const selected = (value: PageSearchFieldValue | undefined) =>
    value == null || typeof value === 'object' ? '' : String(value).trim();
  const warehouseType = selected(session.detailValues.warehouseType);
  return {
    keyword: session.keyword.trim() || undefined,
    warehouseType: warehouseType || undefined,
  };
}

type WarehouseManagementPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
  isTenantAdmin?: boolean;
};

export function WarehouseManagementPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
  isTenantAdmin = false,
}: WarehouseManagementPageProps) {
  const { state: searchSession, setState: setSearchSession } =
    usePageSessionState<WarehouseSearchSession | null>(
      WAREHOUSE_SEARCH_SESSION_KEY,
      null,
      {
        version: WAREHOUSE_SEARCH_SESSION_VERSION,
        validate: (value): value is WarehouseSearchSession | null =>
          value === null || isWarehouseSearchSession(value),
      },
    );
  const management = useWarehouseManagement(
    searchSession ? toWarehouseSearchFilters(searchSession) : {},
  );
  useUnsavedChangesBeforeUnload(management.hasChanges);
  const gridRef = useRef<F1GridRef<WarehouseRow>>(null);
  const [searchQuery, setSearchQuery] = useState(searchSession?.keyword ?? '');
  const [detailValues, setDetailValues] = useState<
    Record<string, PageSearchFieldValue>
  >(searchSession?.detailValues ?? {});
  const [refreshConfirmOpen, setRefreshConfirmOpen] = useState(false);
  const [pendingSearch, setPendingSearch] =
    useState<PendingWarehouseSearch | null>(null);

  const pagePermissions = {
    read: Boolean(selectedMenuPermissions?.read),
    create: Boolean(isTenantAdmin && selectedMenuPermissions?.create),
    update: Boolean(isTenantAdmin && selectedMenuPermissions?.update),
    excel: Boolean(selectedMenuPermissions?.excel),
  };
  const canWrite = pagePermissions.create || pagePermissions.update;
  const columns = useMemo(
    () =>
      createWarehouseColumns(
        canWrite && !management.saving,
        management.userOptions,
        management.warehouseTypeItems,
      ),
    [canWrite, management.saving, management.userOptions, management.warehouseTypeItems],
  );
  const detailFields = useMemo(() => toPageSearchFields(columns), [columns]);

  const requestSearch = useCallback(
    (filters: WarehouseFilters, session: WarehouseSearchSession) => {
      if (management.saving) return;
      if (management.hasChanges) {
        setPendingSearch({ filters, session });
        setRefreshConfirmOpen(true);
        return;
      }
      management.applyFilters(filters);
      setSearchSession(session);
      setDetailValues(session.detailValues);
    },
    [management, setSearchSession],
  );

  const handleDetailSearch = (values: Record<string, PageSearchFieldValue>) => {
    const session = { keyword: searchQuery.trim(), detailValues: values };
    requestSearch(toWarehouseSearchFilters(session), session);
  };

  const handleDefaultSearch = () => {
    const session = {
      keyword: searchQuery.trim(),
      detailValues: searchSession?.detailValues ?? {},
    };
    requestSearch(toWarehouseSearchFilters(session), session);
  };

  const handleGridSave = () => {
    const grid = gridRef.current;
    if (!grid) return;
    if (!grid.validate()) return;
    void management.saveChanges(grid.getChanges(), (savedRows) => grid.acceptSavedRows(savedRows));
  };

  const handleValidationErrors = (errors: F1GridValidationError[]) => {
    management.setError(
      [...new Set(errors.map((error) => error.message))].join('\n'),
    );
  };

  const cancelPendingSearch = () => {
    setRefreshConfirmOpen(false);
    setPendingSearch(null);
    setDetailValues(searchSession?.detailValues ?? {});
  };

  const confirmPendingSearch = () => {
    const pending = pendingSearch;
    setRefreshConfirmOpen(false);
    setPendingSearch(null);
    if (!pending) return;
    management.discardChanges();
    management.applyFilters(pending.filters);
    setSearchSession(pending.session);
    setDetailValues(pending.session.detailValues);
  };

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'write',
      actions: [
        {
          label: '창고 추가',
          icon: AddIcon,
          visible: pagePermissions.create,
          disabled: management.loading || management.saving,
          onClick: () => gridRef.current?.addRow(),
        },
      ],
    },
    {
      key: 'read',
      actions: [
        {
          label: '조회',
          icon: SearchIcon,
          visible: pagePermissions.read,
          disabled: management.saving,
          onClick: handleDefaultSearch,
        },
      ],
    },
    {
      key: 'write',
      actions: [
        {
          label: '저장',
          icon: SaveIcon,
          saving: management.saving,
          savingAriaLabel: '창고 저장 중',
          visible: canWrite,
          disabled: !management.hasChanges || management.saving,
          onClick: handleGridSave,
        },
      ],
    },
  ];

  return (
    <Box
      sx={{
        display: 'flex',
        flex: 1,
        flexDirection: 'column',
        minHeight: 0,
        height: '100%',
      }}
    >
      <PageHeader
        breadcrumbItems={
          breadcrumbItems?.length
            ? breadcrumbItems
            : [selectedModule.name, currentMenuName]
        }
        description={content.description}
        actionGroups={pageActionGroups}
      />
      <PageLoadBoundary {...management.initialLoad} label="창고 목록"
        onRetry={() => management.applyFilters(management.appliedFilters)}>
      <PageSearchArea
        searchField={
          <TextField
            size="small"
            margin="none"
            placeholder="창고코드/창고명 검색"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            slotProps={{
              htmlInput: { 'aria-label': '창고 검색' },
              input: {
                endAdornment: searchQuery ? (
                  <IconButton
                    type="button"
                    size="small"
                    edge="end"
                    aria-label="창고 검색어 초기화"
                    onClick={() => setSearchQuery('')}
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
                backgroundColor:
                  theme.palette.mode === 'dark'
                    ? 'rgba(15, 23, 42, 0.72)'
                    : 'rgba(255,255,255,0.72)',
              },
            })}
          />
        }
        onDefaultSearch={handleDefaultSearch}
        detailFields={detailFields}
        detailValues={detailValues}
        appliedDetailValues={searchSession?.detailValues ?? {}}
        onDetailValuesChange={setDetailValues}
        onDetailSearch={handleDetailSearch}
        detailLoading={management.loading}
      />
      <PageMessageArea
        message={management.error}
        onClose={() => management.setError('')}
      />
      <Box sx={{ flex: 1, minHeight: 280, minWidth: 0, p: 1 }}>
        <WarehouseGrid
          rows={management.rows}
          columns={columns}
          canCreate={pagePermissions.create && !management.saving}
          canUpdate={pagePermissions.update && !management.saving}
          canExportExcel={pagePermissions.excel}
          loading={management.loading}
          gridKey={management.gridKey}
          gridRef={gridRef}
          onChangesChange={management.handleChangesChange}
          onValidationErrors={handleValidationErrors}
        />
      </Box>
      <UnsavedChangesConfirmDialog
        open={refreshConfirmOpen}
        title="저장하지 않은 변경사항"
        description="변경사항을 버리고 창고 목록을 다시 불러오시겠습니까?"
        cancelLabel="취소"
        continueLabel="계속"
        onCancel={cancelPendingSearch}
        onContinue={confirmPendingSearch}
      />
      </PageLoadBoundary>
    </Box>
  );
}
