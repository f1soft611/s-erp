import { useEffect, useMemo, useRef, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import ClearIcon from '@mui/icons-material/Clear';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import { Box, IconButton, TextField } from '@mui/material';
import { PageHeader } from '../../../shared/components/PageHeader';
import { PageLoadBoundary } from '../../../shared/components/PageLoadBoundary';
import { PageMessageArea } from '../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../shared/components/PageSearchArea';
import { UnsavedChangesConfirmDialog } from '../../../shared/components/UnsavedChangesConfirmDialog';
import { DepartmentPickerDialog } from '../../../shared/components/department-picker';
import type { PermissionActionGroupDefinition } from '../../../shared/components/PermissionGroup';
import type { F1GridRef, F1GridValidationError } from '../../../shared/components/f1-grid';
import type { PageSearchFieldValue } from '../../../shared/components/page-search/searchFields';
import { useUnsavedChangesBeforeUnload } from '../../../shared/hooks/useUnsavedChangesBeforeUnload';
import { loadPostcodeScript, openPostcodeSearch } from '../../../shared/services/postcode';
import type { MenuPermission, ModuleItem, PageContent } from '../../dashboard/types/dashboard';
import { EmployeeGrid } from './components/EmployeeGrid';
import { createEmployeeColumns } from './data/employeeGridData';
import {
  EMPLOYEE_DEFAULT_VALUES,
  EMPLOYEE_STATUS_FIELD,
  toEmployeeFilters,
} from './data/employeeSearchFields';
import { useEmployeeManage } from './hooks/useEmployeeManage';
import type { EmployeeFilters, EmployeeRow } from './types/employee.types';

const DETAIL_FIELDS = [EMPLOYEE_STATUS_FIELD];

type PendingSearch = { filters: EmployeeFilters; values: Record<string, PageSearchFieldValue> };

type Props = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
  isTenantAdmin?: boolean;
};

function messageOf(cause: unknown, fallback: string): string {
  return cause instanceof Error && cause.message ? cause.message : fallback;
}

/**
 * 인사관리 > 인사정보 > 사원관리: 사원 목록(재직/퇴직/전체, 통합검색)을 공통 행 폼으로 등록·수정하고 저장 버튼으로 일괄 저장한다.
 * 개인정보라 관리자만 쓴다. 기준 화면은 창고관리다.
 */
export function EmployeeManagePage({
  selectedModule, currentMenuName, content, breadcrumbItems, selectedMenuPermissions, isTenantAdmin = false,
}: Props) {
  const management = useEmployeeManage();
  useUnsavedChangesBeforeUnload(management.hasChanges);
  const gridRef = useRef<F1GridRef<EmployeeRow>>(null);
  const [keyword, setKeyword] = useState('');
  const [detailValues, setDetailValues] = useState<Record<string, PageSearchFieldValue>>(EMPLOYEE_DEFAULT_VALUES);
  const [appliedValues, setAppliedValues] = useState<Record<string, PageSearchFieldValue>>(EMPLOYEE_DEFAULT_VALUES);
  const [pendingSearch, setPendingSearch] = useState<PendingSearch | null>(null);
  // 부서 선택 버튼(표 셀·행 폼)이 열어 둔 도움창. 선택 결과는 그 칸의 행에 적용한다.
  const [departmentPicker, setDepartmentPicker] = useState<{ apply: (patch: Partial<EmployeeRow>) => void } | null>(null);

  const canCreate = Boolean(isTenantAdmin && selectedMenuPermissions?.create);
  const canUpdate = Boolean(isTenantAdmin && selectedMenuPermissions?.update);
  const canWrite = canCreate || canUpdate;
  const { setError } = management;

  useEffect(() => {
    // 주소 검색 창을 클릭과 같은 동작 안에서 바로 열 수 있도록(브라우저 팝업 차단 방지) 스크립트를 미리 불러 둔다.
    if (canWrite) loadPostcodeScript().catch(() => undefined);
  }, [canWrite]);

  const columns = useMemo(
    () => createEmployeeColumns(canWrite && !management.saving, management.codeOptions, {
      onOpenDepartmentPicker: (_row, apply) => setDepartmentPicker({ apply }),
      onOpenPostcodePicker: (_row, apply) => {
        openPostcodeSearch((selection) => apply({ postalCode: selection.postalCode, address: selection.address }))
          .catch((cause: unknown) => setError(messageOf(cause, '우편번호 검색 서비스를 불러오지 못했습니다.')));
      },
    }),
    [canWrite, management.saving, management.codeOptions, setError],
  );

  const applySearch = (filters: EmployeeFilters, values: Record<string, PageSearchFieldValue>) => {
    setAppliedValues(values);
    setDetailValues(values);
    management.applyFilters(filters);
  };

  const requestSearch = (values: Record<string, PageSearchFieldValue>) => {
    if (management.saving) return;
    const filters = toEmployeeFilters(keyword, values);
    if (management.hasChanges) {
      setPendingSearch({ filters, values });
      return;
    }
    applySearch(filters, values);
  };

  const cancelPendingSearch = () => {
    setPendingSearch(null);
    setDetailValues(appliedValues);
  };

  const confirmPendingSearch = () => {
    const pending = pendingSearch;
    setPendingSearch(null);
    if (!pending) return;
    management.discardChanges();
    applySearch(pending.filters, pending.values);
  };

  const handleGridSave = () => {
    const grid = gridRef.current;
    if (!grid) return;
    // 이전 데이터라서 필수값이 비어 있는 기존 사원이 있어도, 변경한 행만 검증해 다른 사원의 저장이 막히지 않게 한다.
    if (!grid.validate({ changedOnly: true })) return;
    void management.saveChanges(grid.getChanges(), (savedRows) => grid.acceptSavedRows(savedRows));
  };

  const handleValidationErrors = (errors: F1GridValidationError[]) => {
    management.setError([...new Set(errors.map((error) => error.message))].join('\n'));
  };

  const actions: PermissionActionGroupDefinition[] = [
    {
      key: 'write',
      actions: [{
        label: '사원 추가',
        icon: AddIcon,
        visible: canCreate,
        disabled: management.loading || management.saving,
        onClick: () => gridRef.current?.addRow(),
      }],
    },
    {
      key: 'read',
      actions: [{
        label: '조회',
        icon: SearchIcon,
        visible: Boolean(selectedMenuPermissions?.read),
        disabled: management.saving,
        onClick: () => requestSearch(appliedValues),
      }],
    },
    {
      key: 'save',
      actions: [{
        label: '저장',
        icon: SaveIcon,
        saving: management.saving,
        savingAriaLabel: '사원 저장 중',
        visible: canWrite,
        disabled: !management.hasChanges || management.saving,
        onClick: handleGridSave,
      }],
    },
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
                  height: '100%', borderRadius: '0 4px 4px 0', backgroundColor: theme.palette.background.paper,
                },
              })}
            />
          )}
          onDefaultSearch={() => requestSearch(appliedValues)}
          detailFields={DETAIL_FIELDS}
          detailValues={detailValues}
          appliedDetailValues={appliedValues}
          onDetailValuesChange={setDetailValues}
          onDetailSearch={requestSearch}
          detailLoading={management.loading}
        />
        <PageMessageArea message={management.error} onClose={() => management.setError('')} />
        <Box sx={{ flex: 1, minHeight: 320, minWidth: 0, p: 1 }}>
          <EmployeeGrid
            rows={management.rows}
            columns={columns}
            highlightKeyword={management.filters.keyword || undefined}
            canCreate={canCreate && !management.saving}
            canUpdate={canUpdate && !management.saving}
            canExportExcel={Boolean(selectedMenuPermissions?.excel)}
            loading={management.loading}
            gridKey={management.gridKey}
            gridRef={gridRef}
            onChangesChange={management.handleChangesChange}
            onValidationErrors={handleValidationErrors}
          />
        </Box>
        <DepartmentPickerDialog
          open={departmentPicker !== null}
          onClose={() => setDepartmentPicker(null)}
          onChange={(department) => departmentPicker?.apply({
            departmentId: department.departmentId, departmentNm: department.departmentNm,
          })}
        />
        <UnsavedChangesConfirmDialog
          open={pendingSearch !== null}
          title="저장하지 않은 변경사항"
          description="변경사항을 버리고 사원 목록을 다시 불러오시겠습니까?"
          cancelLabel="취소"
          continueLabel="계속"
          onCancel={cancelPendingSearch}
          onContinue={confirmPendingSearch}
        />
      </PageLoadBoundary>
    </Box>
  );
}
