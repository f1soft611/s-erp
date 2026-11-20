import { useCallback, useEffect, useState } from 'react';
import { useNotification } from '../../../../../shared/context/notification';
import { useInitialLoadState } from '../../../../../shared/hooks/useInitialLoadState';
import {
  fetchAccounts,
  fetchRoleOptions,
  resetAccountPassword,
  unlockAccount,
  updateAccountRoles,
  updateAccountStatus,
} from '../services/account.service';
import type { AccountFilters, AccountRow, PasswordResetResult, RoleOption } from '../types/account.types';

function messageOf(cause: unknown, fallback: string): string {
  return cause instanceof Error && cause.message ? cause.message : fallback;
}

/** 계정 목록 조회(상태·통합검색), 역할 선택지, 허용/미허용·비밀번호 초기화·잠금 해제·역할 변경을 관리한다. */
export function useAccountManage() {
  const { showSuccess } = useNotification();
  const [filters, setFilters] = useState<AccountFilters>({ keyword: '', status: 'ALL' });
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const [saving, setSaving] = useState(false);
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);
  const { start, succeed, fail, ...initialLoad } = useInitialLoadState();

  const [previousRequest, setPreviousRequest] = useState<{
    filters: AccountFilters | undefined;
    reloadToken: number;
  }>({ filters: undefined, reloadToken });

  if (previousRequest.filters !== filters || previousRequest.reloadToken !== reloadToken) {
    setPreviousRequest({ filters, reloadToken });
    start();
    setLoading(true);
  }

  useEffect(() => {
    let cancelled = false;
    void fetchAccounts(filters)
      .then((loaded) => {
        if (cancelled) return;
        setRows(loaded);
        setError('');
        succeed();
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        fail(cause);
        setError(messageOf(cause, '계정 목록을 조회하지 못했습니다.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters, reloadToken, succeed, fail]);

  useEffect(() => {
    let cancelled = false;
    void fetchRoleOptions()
      .then((options) => {
        if (!cancelled) setRoleOptions(options);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(messageOf(cause, '역할 목록을 불러오지 못했습니다.'));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const search = useCallback((next: AccountFilters) => setFilters({ ...next }), []);
  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  /** 변경 작업 공통 처리: 저장 중 표시, 성공 안내, 목록 다시 읽기. 실패는 호출한 쪽이 메시지로 보여 주도록 던진다. */
  const run = useCallback(async <T,>(task: () => Promise<T>, successMessage: string): Promise<T> => {
    setSaving(true);
    try {
      const result = await task();
      showSuccess(successMessage);
      setReloadToken((token) => token + 1);
      return result;
    } finally {
      setSaving(false);
    }
  }, [showSuccess]);

  const setUse = useCallback(
    (row: AccountRow, useAt: 'Y' | 'N') => run(
      () => updateAccountStatus(row.loginId, useAt),
      useAt === 'Y' ? `${row.userNm} 계정을 허용했습니다.` : `${row.userNm} 계정을 미허용으로 바꿨습니다.`,
    ),
    [run],
  );

  const resetPassword = useCallback(
    (row: AccountRow): Promise<PasswordResetResult> => run(
      () => resetAccountPassword(row.loginId),
      `${row.userNm} 계정의 비밀번호를 초기화했습니다.`,
    ),
    [run],
  );

  const unlock = useCallback(
    (row: AccountRow) => run(() => unlockAccount(row.loginId), `${row.userNm} 계정의 잠금을 해제했습니다.`),
    [run],
  );

  const changeRoles = useCallback(
    (row: AccountRow, roleIds: number[]) => run(
      () => updateAccountRoles(row.loginId, roleIds),
      `${row.userNm} 계정의 권한을 저장했습니다.`,
    ),
    [run],
  );

  return {
    filters, rows, loading, error, setError, saving, roleOptions, initialLoad,
    search, reload, setUse, resetPassword, unlock, changeRoles,
  };
}
