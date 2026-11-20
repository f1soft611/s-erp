import { useCallback, useMemo, useRef, useState } from 'react';
import GroupAddOutlinedIcon from '@mui/icons-material/GroupAddOutlined';
import PersonRemoveOutlinedIcon from '@mui/icons-material/PersonRemoveOutlined';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import SearchIcon from '@mui/icons-material/Search';
import { Box, Button, Tab, Tabs, Typography } from '@mui/material';
import { PageHeader } from '../../../shared/components/PageHeader';
import { PageMessageArea } from '../../../shared/components/PageMessageArea';
import { DepartmentPickerDialog } from '../../../shared/components/department-picker';
import { EmployeePickerDialog } from '../../../shared/components/employee-picker';
import type { PermissionActionGroupDefinition } from '../../../shared/components/PermissionGroup';
import type { F1GridRef } from '../../../shared/components/f1-grid';
import { useCommonConfirmDialog } from '../../../shared/hooks/useCommonConfirmDialog';
import type { MenuPermission, ModuleItem, PageContent } from '../../dashboard/types/dashboard';
import { OrderHistoryPanel } from './components/OrderHistoryPanel';
import { OrderInputBar } from './components/OrderInputBar';
import { OrderTargetGrid } from './components/OrderTargetGrid';
import { createTargetColumns } from './data/orderGridData';
import { defaultHistoryValues, toHistoryFilters } from './data/orderSearch';
import { useOrderHistory } from './hooks/useOrderHistory';
import { useOrderProcess } from './hooks/useOrderProcess';
import type { OrderTargetRow } from './types/order.types';

type Props = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
  isTenantAdmin?: boolean;
};

type TabKey = 'process' | 'history';

/**
 * 인사관리 > 인사정보 > 인사명령: 명령 유형·명령일·명령 후 값을 한 번 입력하고 사원을 여러 명 골라 즉시 처리한다.
 * 처리 내역은 같은 화면의 탭에서 조회한다. 인사 정보를 바꾸므로 관리자만 쓴다. 이력은 수정·삭제하지 않는다.
 */
export function OrderManagePage({
  selectedModule, currentMenuName, content, breadcrumbItems, selectedMenuPermissions, isTenantAdmin = false,
}: Props) {
  const [tab, setTab] = useState<TabKey>('process');
  const [refreshToken, setRefreshToken] = useState(0);
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);
  const [departmentPicker, setDepartmentPicker] = useState<{ apply: (post: { value: string; label: string }) => void } | null>(null);
  const gridRef = useRef<F1GridRef<OrderTargetRow>>(null);
  const { confirm, dialog: confirmDialog } = useCommonConfirmDialog();
  const history = useOrderHistory(toHistoryFilters('', defaultHistoryValues()), refreshToken);
  const process = useOrderProcess(gridRef, useCallback(() => setRefreshToken((current) => current + 1), []));

  const canCreate = Boolean(isTenantAdmin && selectedMenuPermissions?.create);
  const canRead = Boolean(selectedMenuPermissions?.read);
  const busy = process.processing;

  const columns = useMemo(
    () => createTargetColumns(process.type, process.codeOptions, canCreate && !busy, {
      onOpenDepartmentPicker: (applyPatch) => setDepartmentPicker({
        apply: (post) => applyPatch({ postValue: post.value, postLabel: post.label }),
      }),
    }),
    [process.type, process.codeOptions, canCreate, busy],
  );

  const handleProcess = async () => {
    const prepared = process.prepare();
    if (!prepared) return;
    const confirmed = await confirm({
      title: '인사명령 처리',
      description: `${prepared.summary}을(를) 처리합니다. 사원 정보가 바로 바뀌고 처리 내역에 기록되며, 처리한 뒤에는 취소할 수 없습니다(되돌리려면 반대 명령을 처리하세요). 계속할까요?`,
      confirmLabel: '처리',
    });
    if (!confirmed) return;
    await process.submit(prepared.rows);
  };

  const actions: PermissionActionGroupDefinition[] = tab === 'process'
    ? [{
      key: 'process',
      actions: [{
        label: '발령 처리',
        icon: PlaylistAddCheckIcon,
        visible: canCreate,
        saving: busy,
        savingAriaLabel: '인사명령 처리 중',
        disabled: busy || process.employees.length === 0,
        onClick: () => { void handleProcess(); },
      }],
    }]
    : [{
      key: 'read',
      actions: [{
        label: '조회',
        icon: SearchIcon,
        visible: canRead,
        disabled: history.loading,
        onClick: () => setRefreshToken((current) => current + 1),
      }],
    }];

  return (
    <Box sx={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0, minWidth: 0, height: '100%' }}>
      <PageHeader
        breadcrumbItems={breadcrumbItems?.length ? breadcrumbItems : [selectedModule.name, currentMenuName]}
        description={content.description}
        actionGroups={actions}
      />
      <Tabs
        value={tab}
        onChange={(_event, next: TabKey) => setTab(next)}
        aria-label="인사명령 탭"
        sx={{ px: { xs: 1, sm: 2 }, minHeight: 40, borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { minHeight: 40 } }}
      >
        <Tab value="process" label="인사명령 처리" />
        <Tab value="history" label="처리 내역" />
      </Tabs>

      {tab === 'process' ? (
        <>
          <PageMessageArea message={process.error} onClose={() => process.setError('')} />
          <Box sx={{ display: 'flex', flex: 1, flexDirection: 'column', gap: 2, minHeight: 0, minWidth: 0, p: { xs: 1, sm: 2 } }}>
            <OrderInputBar
              types={process.types}
              type={process.type}
              typeCode={process.typeCode}
              codeOptions={process.codeOptions}
              orderDt={process.orderDt}
              bar={process.bar}
              remark={process.remark}
              disabled={!canCreate || busy}
              onTypeChange={process.changeType}
              onOrderDtChange={process.setOrderDt}
              onBarChange={process.applyBar}
              onRemarkChange={process.setRemark}
              onOpenDepartmentPicker={() => setDepartmentPicker({ apply: process.applyBar })}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<GroupAddOutlinedIcon />}
                disabled={!canCreate || busy || !process.type}
                onClick={() => setEmployeePickerOpen(true)}
              >
                사원 선택
              </Button>
              <Button
                size="small"
                color="inherit"
                startIcon={<PersonRemoveOutlinedIcon />}
                disabled={!canCreate || busy || process.employees.length === 0}
                onClick={process.removeSelected}
              >
                선택한 사원 제외
              </Button>
              <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                대상 {process.employees.length}명 · 명령 후 값은 사원별로 고칠 수 있습니다.
              </Typography>
            </Box>
            <Box sx={{ flex: 1, minHeight: 280, minWidth: 0 }}>
              <OrderTargetGrid
                rows={process.targets}
                columns={columns}
                gridKey={`${process.typeCode}-${process.gridKey}`}
                gridRef={gridRef}
              />
            </Box>
          </Box>
          <EmployeePickerDialog
            open={employeePickerOpen}
            title="대상 사원 선택"
            selectionMode="multiple"
            onClose={() => setEmployeePickerOpen(false)}
            onApply={(options) => { void process.addEmployees(options.map((option) => ({ userId: option.userId }))); }}
          />
          <DepartmentPickerDialog
            open={departmentPicker !== null}
            onClose={() => setDepartmentPicker(null)}
            onChange={(department) => departmentPicker?.apply({
              value: String(department.departmentId), label: department.departmentNm,
            })}
          />
        </>
      ) : (
        <OrderHistoryPanel history={history} types={process.types} canExportExcel={Boolean(selectedMenuPermissions?.excel)} />
      )}
      {confirmDialog}
    </Box>
  );
}
