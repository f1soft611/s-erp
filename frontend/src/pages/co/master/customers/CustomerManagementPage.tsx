import { useCallback, useMemo, useRef, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import ClearIcon from '@mui/icons-material/Clear';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/Settings';
import { Box, IconButton, TextField } from '@mui/material';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageLoadBoundary } from '../../../../shared/components/PageLoadBoundary';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { UnsavedChangesConfirmDialog } from '../../../../shared/components/UnsavedChangesConfirmDialog';
import { useUnsavedChangesBeforeUnload } from '../../../../shared/hooks/useUnsavedChangesBeforeUnload';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import {
  type F1GridRef,
  type F1GridValidationError,
} from '../../../../shared/components/f1-grid';
import {
  toPageSearchFields,
  type PageSearchFieldValue,
} from '../../../../shared/components/page-search/searchFields';
import type {
  MenuPermission,
  ModuleItem,
  PageContent,
} from '../../../dashboard/types/dashboard';
import { CustomerGrid, createCustomerColumns } from './components/CustomerGrid';
import { useCustomerManagement } from './hooks/useCustomerManagement';
import { ClassificationSettingsDialog } from '../classification/components/ClassificationSettingsDialog';
import { ClassificationPickerDialog } from '../classification/components/ClassificationPickerDialog';
import type {
  CustomerFilters,
  CustomerRow,
} from './types/customerManagement.types';

type CustomerManagementPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
  isTenantAdmin?: boolean;
};

export function CustomerManagementPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
  isTenantAdmin = false,
}: CustomerManagementPageProps) {
  const management = useCustomerManagement();
  useUnsavedChangesBeforeUnload(management.hasChanges);
  const gridRef = useRef<F1GridRef<CustomerRow>>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [detailValues, setDetailValues] = useState<
    Record<string, PageSearchFieldValue>
  >({});
  const [refreshConfirmOpen, setRefreshConfirmOpen] = useState(false);
  const [classificationOpen, setClassificationOpen] = useState(false);
  const [classificationPicker, setClassificationPicker] = useState<{
    apply: (patch: Partial<CustomerRow>) => void;
    row: CustomerRow;
    level: 1 | 2;
  } | null>(null);
  const canCreateClassification = Boolean(selectedMenuPermissions?.create);
  const canUpdateClassification = Boolean(selectedMenuPermissions?.update);
  const [pendingFilters, setPendingFilters] = useState<CustomerFilters | null>(
    null,
  );

  const pagePermissions = {
    read: Boolean(selectedMenuPermissions?.read),
    create: Boolean(isTenantAdmin && selectedMenuPermissions?.create),
    update: Boolean(isTenantAdmin && selectedMenuPermissions?.update),
    excel: Boolean(selectedMenuPermissions?.excel),
  };
  const canWrite = pagePermissions.create || pagePermissions.update;
  const columns = useMemo(
    () => createCustomerColumns(canWrite && !management.saving,
      (row, apply, level) => setClassificationPicker({ row, apply, level })),
    [canWrite, management.saving],
  );
  const detailFields = useMemo(() => toPageSearchFields(columns), [columns]);

  const requestSearch = useCallback(
    (filters: CustomerFilters) => {
      if (management.saving) return;
      if (management.hasChanges) {
        setPendingFilters(filters);
        setRefreshConfirmOpen(true);
        return;
      }
      management.applyFilters(filters);
    },
    [management],
  );

  const handleDetailSearch = (values: Record<string, PageSearchFieldValue>) => {
    const selected = (value: PageSearchFieldValue | undefined) =>
      value == null || typeof value === 'object' ? '' : String(value).trim();
    const useAt = selected(values.useAt);
    requestSearch({
      keyword: searchQuery.trim() || undefined,
      presidentName: selected(values.presidentName) || undefined,
      businessNo: selected(values.businessNo) || undefined,
      juridNo: selected(values.juridNo) || undefined,
      businessStatus1: selected(values.businessStatus1) || undefined,
      businessItem1: selected(values.businessItem1) || undefined,
      useAt: useAt === 'Y' || useAt === 'N' ? useAt : undefined,
    });
  };

  const handleDefaultSearch = () => {
    requestSearch({
      ...management.appliedFilters,
      keyword: searchQuery.trim() || undefined,
    });
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
    setPendingFilters(null);
  };

  const confirmPendingSearch = () => {
    const filters = pendingFilters;
    setRefreshConfirmOpen(false);
    setPendingFilters(null);
    if (!filters) return;
    management.discardChanges();
    management.applyFilters(filters);
  };

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'write',
      actions: [{
        label: '거래처분류 설정',
        icon: SettingsIcon,
        visible: canCreateClassification || canUpdateClassification,
        disabled: management.saving,
        onClick: () => setClassificationOpen(true),
      }],
    },
    {
      key: 'write',
      actions: [
        {
          label: '거래처 추가',
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
          savingAriaLabel: '거래처 저장 중',
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
      <PageLoadBoundary {...management.initialLoad} label="거래처 목록"
        onRetry={() => management.applyFilters(management.appliedFilters)}>
      <PageSearchArea
        searchField={
          <TextField
            size="small"
            margin="none"
            placeholder="거래처코드/거래처명/약칭 검색"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            slotProps={{
              htmlInput: { 'aria-label': '거래처 검색' },
              input: {
                endAdornment: searchQuery ? (
                  <IconButton
                    type="button"
                    size="small"
                    edge="end"
                    aria-label="거래처 검색어 초기화"
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
                borderRadius: '0 8px 8px 0',
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
        onDetailValuesChange={setDetailValues}
        onDetailSearch={handleDetailSearch}
        detailLoading={management.loading}
      />
      <PageMessageArea
        message={management.error}
        onClose={() => management.setError('')}
      />
      <Box sx={{ flex: 1, minHeight: 280, minWidth: 0, p: 1 }}>
        <CustomerGrid
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
      <ClassificationSettingsDialog open={classificationOpen} kind="partner"
        canCreate={canCreateClassification} canUpdate={canUpdateClassification}
        onClose={() => setClassificationOpen(false)} />
      <ClassificationPickerDialog open={classificationPicker !== null} kind="partner"
        level={classificationPicker?.level}
        parentId={classificationPicker?.level === 2 ? classificationPicker.row.businessKind1 : undefined}
        onClose={() => setClassificationPicker(null)}
        onSelect={(selection) => {
          if (!classificationPicker) return;
          if (classificationPicker.level === 1) {
            const changed = (classificationPicker.row.businessKind1 ?? null) !== (selection?.row.id ?? null);
            classificationPicker.apply({
              businessKind1: selection?.row.id ?? null,
              businessKind1Name: selection?.row.name ?? '',
              ...(changed || !selection ? { businessKind2: null, businessKind2Name: '' } : {}),
            });
          } else {
            classificationPicker.apply({
              businessKind2: selection?.row.id ?? null, businessKind2Name: selection?.row.name ?? '',
              ...(selection?.parent ? {
                businessKind1: selection.parent.id, businessKind1Name: selection.parent.name,
              } : {}),
            });
          }
          setClassificationPicker(null);
        }} />
      <UnsavedChangesConfirmDialog
        open={refreshConfirmOpen}
        title="저장하지 않은 변경사항"
        description="변경사항을 버리고 거래처 목록을 다시 불러오시겠습니까?"
        cancelLabel="취소"
        continueLabel="계속"
        onCancel={cancelPendingSearch}
        onContinue={confirmPendingSearch}
      />
      </PageLoadBoundary>
    </Box>
  );
}
