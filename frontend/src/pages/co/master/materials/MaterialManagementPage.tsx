import { useMemo, useRef, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import ClearIcon from '@mui/icons-material/Clear';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/Settings';
import { Box, IconButton, TextField } from '@mui/material';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageLoadBoundary } from '../../../../shared/components/PageLoadBoundary';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { UnsavedChangesConfirmDialog } from '../../../../shared/components/UnsavedChangesConfirmDialog';
import { useUnsavedChangesBeforeUnload } from '../../../../shared/hooks/useUnsavedChangesBeforeUnload';
import { usePageSessionState } from '../../../../shared/hooks/usePageSessionState';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import type { F1GridRef } from '../../../../shared/components/f1-grid';
import {
  isPageSearchValues,
  toPageSearchFields,
  type PageSearchFieldValue,
} from '../../../../shared/components/page-search/searchFields';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { ClassificationSettingsDialog } from '../classification/components/ClassificationSettingsDialog';
import { ClassificationPickerDialog } from '../classification/components/ClassificationPickerDialog';
import { MaterialGrid, createMaterialColumns } from './components/MaterialGrid';
import { useMaterialManagement } from './hooks/useMaterialManagement';
import { materialSearchFields, type MaterialFilters, type MaterialRow } from './types/materialManagement.types';

const MATERIAL_SEARCH_SESSION_KEY = 's-erp:page:material-management';
const MATERIAL_SEARCH_SESSION_VERSION = 1;

type MaterialSearchSession = {
  keyword: string;
  detailValues: Record<string, PageSearchFieldValue>;
};

type PendingMaterialSearch = {
  filters: MaterialFilters;
  session: MaterialSearchSession;
};

function isMaterialSearchSession(value: unknown): value is MaterialSearchSession {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<MaterialSearchSession>;
  return typeof candidate.keyword === 'string' && isPageSearchValues(candidate.detailValues);
}

function toMaterialSearchFilters(
  session: MaterialSearchSession,
): MaterialFilters {
  const filters: MaterialFilters = {
    keyword: session.keyword.trim() || undefined,
  };
  materialSearchFields.forEach((field) => {
    const value = session.detailValues[field];
    if (typeof value === 'string' && value.trim()) {
      filters[field] = value.trim();
    }
  });
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

export function MaterialManagementPage({ selectedModule, currentMenuName, content,
  breadcrumbItems, selectedMenuPermissions, isTenantAdmin = false }: Props) {
  const { state: searchSession, setState: setSearchSession } =
    usePageSessionState<MaterialSearchSession | null>(
      MATERIAL_SEARCH_SESSION_KEY,
      null,
      {
        version: MATERIAL_SEARCH_SESSION_VERSION,
        validate: (value): value is MaterialSearchSession | null =>
          value === null || isMaterialSearchSession(value),
      },
    );
  const management = useMaterialManagement(
    searchSession ? toMaterialSearchFilters(searchSession) : {},
  );
  useUnsavedChangesBeforeUnload(management.hasChanges);
  const gridRef = useRef<F1GridRef<MaterialRow>>(null);
  const [keyword, setKeyword] = useState(searchSession?.keyword ?? '');
  const [detailValues, setDetailValues] = useState<Record<string, PageSearchFieldValue>>(
    searchSession?.detailValues ?? {},
  );
  const [pendingSearch, setPendingSearch] = useState<PendingMaterialSearch | null>(null);
  const [classificationOpen, setClassificationOpen] = useState(false);
  const [classificationPicker, setClassificationPicker] = useState<{
    apply: (patch: Partial<MaterialRow>) => void;
  } | null>(null);
  const canCreateClassification = Boolean(selectedMenuPermissions?.create);
  const canUpdateClassification = Boolean(selectedMenuPermissions?.update);
  const canCreate = Boolean(isTenantAdmin && selectedMenuPermissions?.create);
  const canUpdate = Boolean(isTenantAdmin && selectedMenuPermissions?.update);
  const canWrite = canCreate || canUpdate;
  const columns = useMemo(() => createMaterialColumns(
    (row) => !management.saving && (String(row.materialId).startsWith('new-material-') ? canCreate : canUpdate),
    management.options, management.rows,
    (_row, apply) => { setClassificationPicker({ apply }); return undefined; },
  ), [canCreate, canUpdate, management.saving, management.options, management.rows]);
  const detailFields = useMemo(() => toPageSearchFields(columns), [columns]);
  const search = (filters: MaterialFilters, session: MaterialSearchSession) => {
    if (management.saving) return;
    if (management.hasChanges) { setPendingSearch({ filters, session }); return; }
    management.applyFilters(filters);
    setSearchSession(session);
    setDetailValues(session.detailValues);
  };
  const searchDefault = () => {
    const session = {
      keyword: keyword.trim(),
      detailValues: searchSession?.detailValues ?? {},
    };
    search(toMaterialSearchFilters(session), session);
  };
  const searchDetails = (values: Record<string, PageSearchFieldValue>) => {
    const session = { keyword: keyword.trim(), detailValues: values };
    search(toMaterialSearchFilters(session), session);
  };
  const actions: PermissionActionGroupDefinition[] = [
    { key: 'write', actions: [{ label: '품목분류 설정', icon: SettingsIcon,
      visible: canCreateClassification || canUpdateClassification,
      disabled: management.saving, onClick: () => setClassificationOpen(true) }] },
    { key: 'write', actions: [{ label: '품목 추가', icon: AddIcon, visible: canCreate,
      disabled: management.loading || management.saving, onClick: () => gridRef.current?.addRow() }] },
    { key: 'read', actions: [{ label: '조회', icon: SearchIcon, visible: Boolean(selectedMenuPermissions?.read),
      disabled: management.saving, onClick: searchDefault }] },
    { key: 'write', actions: [{ label: '저장', icon: SaveIcon,
      saving: management.saving, savingAriaLabel: '품목 저장 중',
      visible: canWrite, disabled: !management.hasChanges || management.saving || management.loading,
      onClick: () => {
        const grid = gridRef.current;
        if (!grid) return;
        if (!grid.validate()) { management.setError('필수 입력 항목을 확인해 주세요.'); return; }
        void management.saveChanges(grid.getChanges(), (savedRows) => grid.acceptSavedRows(savedRows));
      } }] },
  ];
  return <Box sx={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0, minWidth: 0, height: '100%' }}>
    <PageHeader breadcrumbItems={breadcrumbItems?.length ? breadcrumbItems : [selectedModule.name, currentMenuName]}
      description={content.description} actionGroups={actions} />
    <PageLoadBoundary {...management.initialLoad} label="품목 목록"
      onRetry={() => management.applyFilters(management.appliedFilters)}>
    <PageSearchArea
      searchField={<TextField size="small" margin="none"
        placeholder="품목코드/품목명/영문명/모델명/검색명칭 검색" value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
        slotProps={{ htmlInput: { 'aria-label': '품목 검색' }, input: {
          endAdornment: keyword ? <IconButton size="small" aria-label="품목 검색어 초기화"
            onClick={() => setKeyword('')}><ClearIcon fontSize="small" /></IconButton> : null,
        } }}
        sx={(theme) => ({ width: '100%', height: 40, '& .MuiOutlinedInput-root': {
          height: '100%', borderRadius: '0 8px 8px 0', backgroundColor: theme.palette.background.paper,
        } })}
      />}
      onDefaultSearch={searchDefault} detailFields={detailFields} detailValues={detailValues}
      appliedDetailValues={searchSession?.detailValues ?? {}}
      onDetailValuesChange={setDetailValues} onDetailSearch={searchDetails} detailLoading={management.loading}
    />
    <PageMessageArea message={management.error} onClose={() => management.setError('')} />
    <Box sx={{ flex: 1, minHeight: 280, minWidth: 0, p: 1 }}>
      <MaterialGrid rows={management.rows} columns={columns}
        canCreate={canCreate && !management.loading && !management.saving}
        canUpdate={canUpdate && !management.loading && !management.saving}
        canExportExcel={Boolean(selectedMenuPermissions?.excel)}
        loading={management.loading} gridKey={management.gridKey}
        gridRef={gridRef} onChangesChange={management.handleChangesChange} />
    </Box>
    <ClassificationSettingsDialog open={classificationOpen} kind="item"
      canCreate={canCreateClassification} canUpdate={canUpdateClassification}
      onClose={() => setClassificationOpen(false)} />
    <ClassificationPickerDialog open={classificationPicker !== null} kind="item"
      onClose={() => setClassificationPicker(null)}
      onSelect={(selection) => {
        classificationPicker?.apply({
          itemClsId: selection?.row.id ?? null, itemClsPath: selection?.path ?? '',
        });
        setClassificationPicker(null);
      }} />
    <UnsavedChangesConfirmDialog open={pendingSearch !== null} title="저장하지 않은 변경사항"
      description="변경사항을 버리고 품목 목록을 다시 불러오시겠습니까?" cancelLabel="취소" continueLabel="계속"
      onCancel={() => {
        setPendingSearch(null);
        setDetailValues(searchSession?.detailValues ?? {});
      }} onContinue={() => {
        if (pendingSearch) {
          management.discardChanges();
          management.applyFilters(pendingSearch.filters);
          setSearchSession(pendingSearch.session);
          setDetailValues(pendingSearch.session.detailValues);
        }
        setPendingSearch(null);
      }} />
    </PageLoadBoundary>
  </Box>;
}
