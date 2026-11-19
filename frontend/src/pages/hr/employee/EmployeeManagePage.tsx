import { useCallback, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import { Box, IconButton, TextField } from '@mui/material';
import { PageHeader } from '../../../shared/components/PageHeader';
import { PageLoadBoundary } from '../../../shared/components/PageLoadBoundary';
import { PageMessageArea } from '../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../shared/components/PageSearchArea';
import type { PermissionActionGroupDefinition } from '../../../shared/components/PermissionGroup';
import type { PageSearchFieldValue } from '../../../shared/components/page-search/searchFields';
import type { MenuPermission, ModuleItem, PageContent } from '../../dashboard/types/dashboard';
import { EmployeeFormDialog } from './components/EmployeeFormDialog';
import { EmployeeGrid } from './components/EmployeeGrid';
import { createEmptyEmployeeForm, toEmployeeFormValues } from './data/employeeForm';
import {
  EMPLOYEE_DEFAULT_VALUES,
  EMPLOYEE_STATUS_FIELD,
  toEmployeeFilters,
} from './data/employeeSearchFields';
import { useEmployeeManage } from './hooks/useEmployeeManage';
import { checkEmployeeNoAvailable, checkLoginCodeAvailable } from './services/employee.service';
import type { EmployeeFormValues, EmployeeRow } from './types/employee.types';

const DETAIL_FIELDS = [EMPLOYEE_STATUS_FIELD];

type Props = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
  isTenantAdmin?: boolean;
};

/** 인사관리 > 인사정보 > 사원등록: 사원 목록(재직/퇴직/전체, 통합검색)과 등록·수정 팝업. 개인정보라 관리자만 쓴다. */
export function EmployeeManagePage({
  selectedModule, currentMenuName, content, breadcrumbItems, selectedMenuPermissions, isTenantAdmin = false,
}: Props) {
  const management = useEmployeeManage();
  const [keyword, setKeyword] = useState('');
  const [detailValues, setDetailValues] = useState<Record<string, PageSearchFieldValue>>(EMPLOYEE_DEFAULT_VALUES);
  const [appliedValues, setAppliedValues] = useState<Record<string, PageSearchFieldValue>>(EMPLOYEE_DEFAULT_VALUES);
  const [form, setForm] = useState<EmployeeFormValues | null>(null);
  const canCreate = Boolean(isTenantAdmin && selectedMenuPermissions?.create);
  const canUpdate = Boolean(isTenantAdmin && selectedMenuPermissions?.update);

  const runSearch = (values: Record<string, PageSearchFieldValue>) => {
    setAppliedValues(values);
    setDetailValues(values);
    management.search(toEmployeeFilters(keyword, values));
  };

  const openEmployee = useCallback((row: EmployeeRow) => setForm(toEmployeeFormValues(row)), []);

  const actions: PermissionActionGroupDefinition[] = [
    { key: 'write', actions: [{
      label: '사원 추가',
      icon: AddIcon,
      visible: canCreate,
      disabled: management.saving,
      onClick: () => setForm(createEmptyEmployeeForm()),
    }] },
    { key: 'read', actions: [{
      label: '조회',
      icon: SearchIcon,
      visible: Boolean(selectedMenuPermissions?.read),
      disabled: management.saving,
      onClick: () => runSearch(appliedValues),
    }] },
  ];

  return (
    <Box sx={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0, minWidth: 0, height: '100%' }}>
      <PageHeader
        breadcrumbItems={breadcrumbItems?.length ? breadcrumbItems : [selectedModule.name, currentMenuName]}
        description={content.description}
        actionGroups={actions}
      />
      <PageLoadBoundary {...management.initialLoad} label="사원 목록" onRetry={management.reload}>
        <PageSearchArea
          searchField={(
            <TextField
              size="small"
              margin="none"
              placeholder="이름·사번·부서·직위·아이디·전화·이메일 검색"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              slotProps={{
                htmlInput: { 'aria-label': '사원 검색' },
                input: {
                  endAdornment: keyword ? (
                    <IconButton size="small" edge="end" aria-label="사원 검색어 초기화" onClick={() => setKeyword('')} sx={{ p: 0.25 }}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  ) : null,
                },
              }}
              sx={(theme) => ({
                width: '100%', height: 40,
                '& .MuiOutlinedInput-root': {
                  height: '100%', borderRadius: '0 6px 6px 0', backgroundColor: theme.palette.background.paper,
                },
              })}
            />
          )}
          onDefaultSearch={() => runSearch(appliedValues)}
          detailFields={DETAIL_FIELDS}
          detailValues={detailValues}
          appliedDetailValues={appliedValues}
          onDetailValuesChange={setDetailValues}
          onDetailSearch={runSearch}
          detailLoading={management.loading}
        />
        <PageMessageArea message={management.error} onClose={() => management.setError('')} />
        <Box sx={{ flex: 1, minHeight: 320, minWidth: 0, p: 1 }}>
          <EmployeeGrid
            rows={management.rows}
            loading={management.loading}
            highlightKeyword={management.filters.keyword || undefined}
            canExportExcel={Boolean(selectedMenuPermissions?.excel)}
            onOpen={openEmployee}
          />
        </Box>
        {form ? (
          <EmployeeFormDialog
            key={form.userId ?? 'new'}
            initial={form}
            codeOptions={management.codeOptions}
            canSave={form.userId === null ? canCreate : canUpdate}
            saving={management.saving}
            onSubmit={(payload) => (form.userId === null
              ? management.create(payload)
              : management.update(form.userId, payload))}
            onCheckEmployeeNo={checkEmployeeNoAvailable}
            onCheckLoginCode={checkLoginCodeAvailable}
            onClose={() => setForm(null)}
          />
        ) : null}
      </PageLoadBoundary>
    </Box>
  );
}
