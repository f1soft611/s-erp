import { useMemo, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { Box, Checkbox, FormControlLabel, MenuItem, TextField, Typography } from '@mui/material';
import { PageHeader } from '../../../shared/components/PageHeader';
import { PageLoadBoundary } from '../../../shared/components/PageLoadBoundary';
import { PageMessageArea } from '../../../shared/components/PageMessageArea';
import type { PermissionActionGroupDefinition } from '../../../shared/components/PermissionGroup';
import { useCommonConfirmDialog } from '../../../shared/hooks/useCommonConfirmDialog';
import type { MenuPermission, ModuleItem, PageContent } from '../../dashboard/types/dashboard';
import { DepartmentFormDialog, type DepartmentFormInitial } from './components/DepartmentFormDialog';
import { DepartmentTree } from './components/DepartmentTree';
import { DepartmentUserGrid } from './components/DepartmentUserGrid';
import { buildDepartmentPath, buildTreeRows, COMPANY_ROW_ID } from './data/departmentTree';
import { useDepartmentManage } from './hooks/useDepartmentManage';
import type { DepartmentUseAt, MemberStatusFilter } from './types/department.types';

type Props = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
  isTenantAdmin?: boolean;
};

/** 인사관리 > 부서관리: 좌측 부서 트리(폴더형, 우클릭으로 등록·편집·사용안함), 우측 선택 부서의 소속 사원. */
export function DepartmentManagePage({
  selectedModule, currentMenuName, content, breadcrumbItems, selectedMenuPermissions, isTenantAdmin = false,
}: Props) {
  const management = useDepartmentManage();
  const { confirm, dialog: confirmDialog } = useCommonConfirmDialog();
  const [form, setForm] = useState<DepartmentFormInitial | null>(null);
  const canCreate = Boolean(isTenantAdmin && selectedMenuPermissions?.create) && !management.saving;
  const canUpdate = Boolean(isTenantAdmin && selectedMenuPermissions?.update) && !management.saving;
  const selected = management.selected;
  const treeRows = useMemo(
    () => buildTreeRows(management.companyName, management.rows),
    [management.companyName, management.rows],
  );
  const selectedTreeId = management.companySelected ? COMPANY_ROW_ID : (selected?.departmentId ?? null);
  const companyLabel = management.companyName || '회사';

  const openCreate = (parentDepartmentId: number | null) => setForm({
    departmentId: null, parentDepartmentId, departmentNm: '', managerUserId: null, managerUserNm: '',
    managerOptions: [], departmentDc: '', sortOrder: 0,
  });

  const openEdit = async (departmentId: number) => {
    const target = management.rows.find((row) => row.departmentId === departmentId);
    if (!target) return;
    // 부서장은 이 부서의 소속 사원만 고를 수 있으므로 팝업을 열기 전에 소속 사원을 불러온다.
    const members = await management.loadMembers(departmentId);
    if (!members) return;
    setForm({
      departmentId: target.departmentId,
      parentDepartmentId: target.parentDepartmentId,
      departmentNm: target.departmentNm,
      managerUserId: target.managerUserId,
      managerUserNm: target.managerUserNm,
      managerOptions: members.map((member) => ({ userId: member.userId, userNm: member.userNm, levelNm: member.levelNm })),
      departmentDc: target.departmentDc,
      sortOrder: target.sortOrder,
    });
  };

  const changeUse = async (departmentId: number, useAt: DepartmentUseAt) => {
    const target = management.rows.find((row) => row.departmentId === departmentId);
    if (!target) return;
    const confirmed = await confirm({
      title: useAt === 'N' ? '부서 사용안함' : '부서 복원',
      description: useAt === 'N'
        ? `'${target.departmentNm}' 부서를 사용안함 처리합니다. 사용안함 부서는 기본 트리에서 숨겨집니다.`
        : `'${target.departmentNm}' 부서를 다시 사용합니다.`,
      confirmLabel: useAt === 'N' ? '사용안함' : '복원',
    });
    if (confirmed) await management.changeUse(departmentId, useAt);
  };

  const actions: PermissionActionGroupDefinition[] = [
    { key: 'write', actions: [{
      label: '최상위 부서 추가',
      icon: AddIcon,
      visible: Boolean(isTenantAdmin && selectedMenuPermissions?.create),
      disabled: !canCreate || management.loading,
      onClick: () => openCreate(null),
    }] },
    { key: 'read', actions: [{
      label: '조회',
      icon: SearchIcon,
      visible: Boolean(selectedMenuPermissions?.read),
      disabled: management.saving,
      onClick: management.reload,
    }] },
  ];

  const hasDepartments = management.rows.length > 0;

  return (
    <Box sx={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0, minWidth: 0, height: '100%' }}>
      <PageHeader
        breadcrumbItems={breadcrumbItems?.length ? breadcrumbItems : [selectedModule.name, currentMenuName]}
        description={content.description}
        actionGroups={actions}
      />
      <PageLoadBoundary {...management.initialLoad} label="부서 목록" onRetry={management.reload}>
        <PageMessageArea message={management.error} onClose={() => management.setError('')} />
        <Box sx={{
          display: 'flex', flex: 1, minHeight: 280, minWidth: 0, gap: 1, p: 1,
          flexDirection: { xs: 'column', md: 'row' },
        }}>
          <Box sx={{
            display: 'flex', flexDirection: 'column', flex: { md: '0 0 420px' }, minWidth: 0,
            minHeight: { xs: 300, md: 0 }, height: { xs: 340, md: 'auto' },
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 0.5 }}>
              <Typography variant="subtitle2">부서</Typography>
              <FormControlLabel
                label="사용안함 포함"
                control={(
                  <Checkbox
                    size="small"
                    checked={management.includeInactive}
                    onChange={(event) => management.setIncludeInactive(event.target.checked)}
                  />
                )}
              />
            </Box>
            <Box sx={{ flex: 1, minHeight: 0 }}>
              <DepartmentTree
                rows={treeRows}
                gridKey={management.gridKey}
                loading={management.loading}
                selectedId={selectedTreeId}
                canCreate={canCreate}
                canUpdate={canUpdate}
                onSelect={management.select}
                onAddRoot={() => openCreate(null)}
                onAddChild={openCreate}
                onEdit={(id) => { void openEdit(id); }}
                onChangeUse={(id, useAt) => { void changeUse(id, useAt); }}
              />
            </Box>
            {!management.loading && !hasDepartments ? (
              <Typography variant="body2" color="text.secondary" sx={{ px: 0.5, pt: 1 }}>
                등록된 부서가 없습니다. 회사를 우클릭하거나 상단의 &lsquo;최상위 부서 추가&rsquo;로 첫 부서를 등록해 주세요.
              </Typography>
            ) : null}
          </Box>
          <Box sx={{ display: 'flex', flex: 1, flexDirection: 'column', minWidth: 0, minHeight: 280 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="subtitle2" sx={{ px: 0.5, py: 0.75 }}>
              {management.companySelected
                ? `${companyLabel} 부서 미지정 사원 (${management.users.length}명)`
                : selected
                  ? `${buildDepartmentPath(management.rows, selected.departmentId)} 소속 사원 (${management.users.length}명)`
                  : '왼쪽에서 부서를 선택해 주세요.'}
            </Typography>
            <TextField
              select
              size="small"
              label="재직 구분"
              value={management.memberStatus}
              onChange={(event) => management.setMemberStatus(event.target.value as MemberStatusFilter)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="ACTIVE">재직(휴직 포함)</MenuItem>
              <MenuItem value="RETIRED">퇴직</MenuItem>
              <MenuItem value="ALL">전체</MenuItem>
            </TextField>
            </Box>
            {management.usersError ? (
              <Typography role="alert" variant="body2" color="error" sx={{ px: 0.5, pb: 0.5 }}>
                {management.usersError}
              </Typography>
            ) : null}
            <Box sx={{ flex: 1, minHeight: 0 }}>
              {selected || management.companySelected
                ? <DepartmentUserGrid rows={management.users} loading={management.usersLoading} />
                : null}
            </Box>
          </Box>
        </Box>
        {form ? (
          <DepartmentFormDialog
            key={`${form.departmentId ?? 'new'}-${form.parentDepartmentId ?? 'root'}`}
            initial={form}
            companyName={management.companyName}
            rows={management.rows}
            saving={management.saving}
            onSubmit={(payload) => (form.departmentId === null
              ? management.create(payload)
              : management.update(form.departmentId, payload))}
            onClose={() => setForm(null)}
          />
        ) : null}
        {confirmDialog}
      </PageLoadBoundary>
    </Box>
  );
}
