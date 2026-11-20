import BlockOutlined from '@mui/icons-material/BlockOutlined';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import LockOpenOutlined from '@mui/icons-material/LockOpenOutlined';
import LockResetOutlined from '@mui/icons-material/LockResetOutlined';
import ManageAccountsOutlined from '@mui/icons-material/ManageAccountsOutlined';
import { Box, Chip, IconButton, Tooltip } from '@mui/material';
import { useMemo } from 'react';
import { F1Grid, type F1GridColumn } from '../../../../../shared/components/f1-grid';
import { ACCOUNT_STATUS_LABEL, resolveAccountStatus } from '../data/accountStatus';
import type { AccountRow, AccountStatus } from '../types/account.types';

const STATUS_COLOR: Record<AccountStatus, 'success' | 'default' | 'warning' | 'error'> = {
  ACTIVE: 'success',
  DISABLED: 'default',
  LOCKED: 'warning',
  RETIRED: 'error',
};

export type AccountGridActions = {
  onToggleUse: (row: AccountRow) => void;
  onResetPassword: (row: AccountRow) => void;
  onUnlock: (row: AccountRow) => void;
  onEditRoles: (row: AccountRow) => void;
};

function createColumns(
  actions: AccountGridActions, canUpdate: boolean, currentLoginCode: string,
): F1GridColumn<AccountRow>[] {
  const dim: F1GridColumn<AccountRow>['getCellStyle'] = ({ row }) =>
    (resolveAccountStatus(row) === 'ACTIVE' ? undefined : { opacity: 0.6 });
  const text = (
    field: keyof AccountRow, headerName: string, width: number, extra: Partial<F1GridColumn<AccountRow>> = {},
  ): F1GridColumn<AccountRow> => ({
    field, headerName, width, editable: false, getCellStyle: dim, search: { hidden: true }, ...extra,
  });
  return [
    { field: 'loginId', headerName: 'No', type: 'rownumber', width: 48, align: 'center', search: { hidden: true } },
    text('employeeNo', '사번', 80, { align: 'center', highlightSearch: true }),
    text('userNm', '이름', 120, { highlightSearch: true }),
    text('loginCode', '로그인 아이디', 130, { highlightSearch: true }),
    // 가장 중요한 열이라 좁은 화면에서도 보이도록 앞쪽에 둔다.
    {
      field: 'useAt', headerName: '상태', width: 80, align: 'center', editable: false, search: { hidden: true },
      getValue: (row) => ACCOUNT_STATUS_LABEL[resolveAccountStatus(row)],
      renderCell: ({ row }) => {
        const status = resolveAccountStatus(row);
        return <Chip size="small" color={STATUS_COLOR[status]} label={ACCOUNT_STATUS_LABEL[status]} variant={status === 'DISABLED' ? 'outlined' : 'filled'} />;
      },
    },
    text('passwordChangeRequired', '변경 필요', 80, {
      align: 'center', getValue: (row) => (row.passwordChangeRequired ? '변경 필요' : ''),
    }),
    text('departmentNm', '부서', 110, { highlightSearch: true }),
    text('positionNm', '직위', 70, { align: 'center', highlightSearch: true }),
    text('roles', '권한', 180, {
      getValue: (row) => row.roles.map((role) => role.roleNm).join(', '),
    }),
    text('passwordChangedAt', '최근 비밀번호 변경', 140, { align: 'center' }),
    {
      field: 'userId', headerName: '관리', width: 176, align: 'center', pinned: 'right', editable: false,
      search: { hidden: true },
      renderCell: ({ row }) => {
        const self = row.loginCode === currentLoginCode;
        const disabled = row.useAt === 'N';
        const selfReason = '자기 자신의 계정은 미허용으로 바꿀 수 없습니다.';
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.25 }}>
            <Tooltip title={self && !disabled ? selfReason : disabled ? '계정 허용' : '계정 미허용'}>
              <span>
                <IconButton
                  size="small"
                  aria-label={`${row.userNm} 계정 ${disabled ? '허용' : '미허용'}`}
                  disabled={!canUpdate || (self && !disabled)}
                  onClick={() => actions.onToggleUse(row)}
                >
                  {disabled ? <CheckCircleOutlined fontSize="small" /> : <BlockOutlined fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="비밀번호 초기화">
              <span>
                <IconButton
                  size="small"
                  aria-label={`${row.userNm} 비밀번호 초기화`}
                  disabled={!canUpdate}
                  onClick={() => actions.onResetPassword(row)}
                >
                  <LockResetOutlined fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={row.locked ? '잠금 해제' : '잠긴 계정만 해제할 수 있습니다.'}>
              <span>
                <IconButton
                  size="small"
                  aria-label={`${row.userNm} 잠금 해제`}
                  disabled={!canUpdate || !row.locked}
                  onClick={() => actions.onUnlock(row)}
                >
                  <LockOpenOutlined fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="권한 변경">
              <span>
                <IconButton
                  size="small"
                  aria-label={`${row.userNm} 권한 변경`}
                  disabled={!canUpdate}
                  onClick={() => actions.onEditRoles(row)}
                >
                  <ManageAccountsOutlined fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        );
      },
    },
  ];
}

type Props = AccountGridActions & {
  rows: AccountRow[];
  loading: boolean;
  highlightKeyword?: string;
  canExportExcel: boolean;
  canUpdate: boolean;
  currentLoginCode: string;
};

/** 계정 목록(읽기 전용). 맨 오른쪽 "관리" 열에서 허용/미허용·비밀번호 초기화·잠금 해제·권한 변경을 한다. */
export function AccountGrid({
  rows, loading, highlightKeyword, canExportExcel, canUpdate, currentLoginCode,
  onToggleUse, onResetPassword, onUnlock, onEditRoles,
}: Props) {
  const columns = useMemo(
    () => createColumns({ onToggleUse, onResetPassword, onUnlock, onEditRoles }, canUpdate, currentLoginCode),
    [onToggleUse, onResetPassword, onUnlock, onEditRoles, canUpdate, currentLoginCode],
  );
  return (
    <F1Grid
      ariaLabel="계정 목록"
      storageKey="settings-account-list-v1"
      rows={rows}
      columns={columns}
      rowKey="loginId"
      height="100%"
      rowHeight={48}
      showCheckbox={false}
      selectionMode="row"
      multiSelect={false}
      highlightKeyword={highlightKeyword}
      loading={loading}
      canExportExcel={canExportExcel}
      excelFileName="계정목록"
      rowFormPlugin={{ enabled: false }}
      allowAddRowInContextMenu={false}
      allowDuplicateRowInContextMenu={false}
      allowDeleteRowInContextMenu={false}
    />
  );
}
