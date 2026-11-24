import { useCallback, useState } from 'react';
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import { Box, IconButton, TextField } from '@mui/material';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageLoadBoundary } from '../../../../shared/components/PageLoadBoundary';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import type { PageSearchFieldValue } from '../../../../shared/components/page-search/searchFields';
import { useCommonConfirmDialog } from '../../../../shared/hooks/useCommonConfirmDialog';
import { getStoredAuth } from '../../../../shared/services/authService';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { AccountGrid } from './components/AccountGrid';
import { AccountRoleDialog } from './components/AccountRoleDialog';
import { TemporaryPasswordDialog } from './components/TemporaryPasswordDialog';
import {
  ACCOUNT_DEFAULT_VALUES,
  ACCOUNT_STATUS_FIELD,
  toAccountFilters,
} from './data/accountSearchFields';
import { useAccountManage } from './hooks/useAccountManage';
import type { AccountRow, PasswordResetResult } from './types/account.types';

const DETAIL_FIELDS = [ACCOUNT_STATUS_FIELD];

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
 * 환경설정 > 시스템 관리 > 계정관리: 발급된 로그인 계정의 허용/미허용, 비밀번호 초기화, 잠금 해제, 권한을 관리한다.
 * 계정 발급은 사원관리에서 하며, 계정 정보라서 관리자만 쓴다. 기준 화면은 인사관리 사원관리다.
 */
export function AccountManagementPage({
  selectedModule, currentMenuName, content, breadcrumbItems, selectedMenuPermissions, isTenantAdmin = false,
}: Props) {
  const management = useAccountManage();
  const { confirm, dialog: confirmDialog } = useCommonConfirmDialog();
  const [keyword, setKeyword] = useState('');
  const [detailValues, setDetailValues] = useState<Record<string, PageSearchFieldValue>>(ACCOUNT_DEFAULT_VALUES);
  const [appliedValues, setAppliedValues] = useState<Record<string, PageSearchFieldValue>>(ACCOUNT_DEFAULT_VALUES);
  const [roleTarget, setRoleTarget] = useState<AccountRow | null>(null);
  const [resetResult, setResetResult] = useState<{ row: AccountRow; result: PasswordResetResult } | null>(null);
  const canUpdate = Boolean(isTenantAdmin && selectedMenuPermissions?.update);
  const currentLoginCode = getStoredAuth()?.userId ?? '';

  const runSearch = (values: Record<string, PageSearchFieldValue>) => {
    setAppliedValues(values);
    setDetailValues(values);
    management.search(toAccountFilters(keyword, values));
  };

  const { setUse, resetPassword, unlock, setError } = management;

  const toggleUse = useCallback(async (row: AccountRow) => {
    const next = row.useAt === 'Y' ? 'N' : 'Y';
    if (next === 'N') {
      const confirmed = await confirm({
        title: '계정 미허용',
        description: `${row.userNm} (${row.loginCode}) 계정을 미허용으로 바꾸면 로그인할 수 없습니다. 계속할까요?`,
        confirmLabel: '미허용',
      });
      if (!confirmed) return;
    }
    try {
      await setUse(row, next);
      setError('');
    } catch (cause) {
      setError(messageOf(cause, '계정 상태를 바꾸지 못했습니다.'));
    }
  }, [confirm, setUse, setError]);

  const reset = useCallback(async (row: AccountRow) => {
    const confirmed = await confirm({
      title: '비밀번호 초기화',
      description: `${row.userNm} (${row.loginCode}) 계정에 임시 비밀번호를 발급합니다. 기존 비밀번호는 사용할 수 없고 다음 로그인 때 비밀번호를 변경해야 합니다. 계속할까요?`,
      confirmLabel: '초기화',
    });
    if (!confirmed) return;
    try {
      const result = await resetPassword(row);
      setError('');
      setResetResult({ row, result });
    } catch (cause) {
      setError(messageOf(cause, '비밀번호를 초기화하지 못했습니다.'));
    }
  }, [confirm, resetPassword, setError]);

  const release = useCallback(async (row: AccountRow) => {
    try {
      await unlock(row);
      setError('');
    } catch (cause) {
      setError(messageOf(cause, '잠금을 해제하지 못했습니다.'));
    }
  }, [unlock, setError]);

  const actions: PermissionActionGroupDefinition[] = [
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
      <PageLoadBoundary {...management.initialLoad} label="계정 목록" onRetry={management.reload}>
        <PageSearchArea
          searchField={(
            <TextField
              size="small"
              margin="none"
              placeholder="이름·사번·로그인 아이디·부서·직위 검색"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              slotProps={{
                htmlInput: { 'aria-label': '계정 검색' },
                input: {
                  endAdornment: keyword ? (
                    <IconButton size="small" edge="end" aria-label="계정 검색어 초기화" onClick={() => setKeyword('')} sx={{ p: 0.25 }}>
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
          onDefaultSearch={() => runSearch(appliedValues)}
          detailFields={DETAIL_FIELDS}
          detailValues={detailValues}
          appliedDetailValues={appliedValues}
          onDetailValuesChange={setDetailValues}
          onDetailSearch={runSearch}
          detailLoading={management.loading}
        />
        <PageMessageArea message={management.error} onClose={() => management.setError('')} pageSpacing="outer" />
        <Box sx={{ flex: 1, minHeight: 320, minWidth: 0, p: 2 }}>
          <AccountGrid
            rows={management.rows}
            loading={management.loading}
            highlightKeyword={management.filters.keyword || undefined}
            canExportExcel={Boolean(selectedMenuPermissions?.excel)}
            canUpdate={canUpdate && !management.saving}
            currentLoginCode={currentLoginCode}
            onToggleUse={(row) => void toggleUse(row)}
            onResetPassword={(row) => void reset(row)}
            onUnlock={(row) => void release(row)}
            onEditRoles={setRoleTarget}
          />
        </Box>
        {roleTarget ? (
          <AccountRoleDialog
            key={roleTarget.loginId}
            account={roleTarget}
            roleOptions={management.roleOptions}
            saving={management.saving}
            onSubmit={(roleIds) => management.changeRoles(roleTarget, roleIds)}
            onClose={() => setRoleTarget(null)}
          />
        ) : null}
        {resetResult ? (
          <TemporaryPasswordDialog
            result={resetResult.result}
            userNm={resetResult.row.userNm}
            onClose={() => setResetResult(null)}
          />
        ) : null}
        {confirmDialog}
      </PageLoadBoundary>
    </Box>
  );
}
