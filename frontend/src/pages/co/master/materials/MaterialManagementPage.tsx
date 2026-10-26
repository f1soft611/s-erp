import { useMemo, useRef, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import ClearIcon from '@mui/icons-material/Clear';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import { Box, CircularProgress, IconButton, TextField } from '@mui/material';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { UnsavedChangesConfirmDialog } from '../../../../shared/components/UnsavedChangesConfirmDialog';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import type { F1GridRef } from '../../../../shared/components/f1-grid';
import { toPageSearchFields, type PageSearchFieldValue } from '../../../../shared/components/page-search/searchFields';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { MaterialGrid, createMaterialColumns } from './components/MaterialGrid';
import { useMaterialManagement } from './hooks/useMaterialManagement';
import { materialSearchFields, type MaterialFilters, type MaterialRow } from './types/materialManagement.types';

type Props = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
  isTenantAdmin?: boolean;
};

function SaveProgressIcon() {
  return <CircularProgress size={16} color="inherit" aria-label="품목 저장 중" />;
}

export function MaterialManagementPage({ selectedModule, currentMenuName, content,
  breadcrumbItems, selectedMenuPermissions, isTenantAdmin = false }: Props) {
  const management = useMaterialManagement();
  const gridRef = useRef<F1GridRef<MaterialRow>>(null);
  const [keyword, setKeyword] = useState('');
  const [detailValues, setDetailValues] = useState<Record<string, PageSearchFieldValue>>({});
  const [pendingFilters, setPendingFilters] = useState<MaterialFilters | null>(null);
  const canCreate = Boolean(isTenantAdmin && selectedMenuPermissions?.create);
  const canUpdate = Boolean(isTenantAdmin && selectedMenuPermissions?.update);
  const canWrite = canCreate || canUpdate;
  const columns = useMemo(() => createMaterialColumns(
    (row) => !management.saving && (String(row.materialId).startsWith('new-material-') ? canCreate : canUpdate),
    management.options, management.rows,
  ), [canCreate, canUpdate, management.saving, management.options, management.rows]);
  const detailFields = useMemo(() => toPageSearchFields(columns), [columns]);
  const search = (filters: MaterialFilters) => {
    if (management.saving) return;
    if (management.hasChanges) { setPendingFilters(filters); return; }
    management.applyFilters(filters);
  };
  const searchDefault = () => search({ ...management.appliedFilters, keyword: keyword.trim() || undefined });
  const searchDetails = (values: Record<string, PageSearchFieldValue>) => {
    const filters: MaterialFilters = { keyword: keyword.trim() || undefined };
    materialSearchFields.forEach((field) => {
      const value = values[field];
      if (typeof value === 'string' && value.trim()) filters[field] = value.trim();
    });
    search(filters);
  };
  const actions: PermissionActionGroupDefinition[] = [
    { key: 'write', actions: [{ label: '품목 추가', icon: AddIcon, visible: canCreate,
      disabled: management.loading || management.saving, onClick: () => gridRef.current?.addRow() }] },
    { key: 'read', actions: [{ label: '조회', icon: SearchIcon, visible: Boolean(selectedMenuPermissions?.read),
      disabled: management.saving, onClick: searchDefault }] },
    { key: 'write', actions: [{ label: '저장', icon: management.saving ? SaveProgressIcon : SaveIcon,
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
    <UnsavedChangesConfirmDialog open={pendingFilters !== null} title="저장하지 않은 변경사항"
      description="변경사항을 버리고 품목 목록을 다시 불러오시겠습니까?" cancelLabel="취소" continueLabel="계속"
      onCancel={() => setPendingFilters(null)} onContinue={() => {
        if (pendingFilters) { management.discardChanges(); management.applyFilters(pendingFilters); }
        setPendingFilters(null);
      }} />
  </Box>;
}
