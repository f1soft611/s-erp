import { useCallback, useEffect, useState } from 'react';
import { useInitialLoadState } from '../../../../shared/hooks/useInitialLoadState';
import {
  changeDepartmentUse,
  createDepartment,
  fetchDepartments,
  fetchDepartmentUsers,
  fetchUnassignedUsers,
  updateDepartment,
} from '../services/department.service';
import { COMPANY_ROW_ID } from '../data/departmentTree';
import type {
  DepartmentPayload,
  DepartmentRow,
  DepartmentUseAt,
  DepartmentUserRow,
  MemberStatusFilter,
} from '../types/department.types';

function messageOf(cause: unknown, fallback: string): string {
  return cause instanceof Error && cause.message ? cause.message : fallback;
}

/** 부서 트리 조회·선택, 소속 사원 조회, 등록·수정·사용안함 처리를 관리한다. */
export function useDepartmentManage() {
  const [includeInactive, setIncludeInactive] = useState(false);
  const [rows, setRows] = useState<DepartmentRow[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const [gridKey, setGridKey] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const { start, succeed, fail, ...initialLoad } = useInitialLoadState();

  const [previousListRequest, setPreviousListRequest] = useState<{
    includeInactive: boolean | undefined;
    reloadToken: number;
  }>({ includeInactive: undefined, reloadToken });

  if (
    previousListRequest.includeInactive !== includeInactive
    || previousListRequest.reloadToken !== reloadToken
  ) {
    setPreviousListRequest({ includeInactive, reloadToken });
    start();
    setLoading(true);
  }

  useEffect(() => {
    let cancelled = false;
    void fetchDepartments(includeInactive)
      .then((loaded) => {
        if (cancelled) return;
        setRows(loaded.departments);
        setCompanyName(loaded.companyName);
        setGridKey((key) => key + 1);
        setError('');
        succeed();
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        fail(cause);
        setError(messageOf(cause, '부서 목록을 조회하지 못했습니다.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [includeInactive, reloadToken, start, succeed, fail]);

  const selected = rows.find((row) => row.departmentId === selectedId) ?? null;
  const companySelected = selectedId === COMPANY_ROW_ID;
  // 회사 노드를 고르면 부서 미지정 사원을, 부서를 고르면 그 부서의 사원을 조회한다.
  const selectedDepartmentId = companySelected ? COMPANY_ROW_ID : (selected ? selected.departmentId : null);

  const [memberStatus, setMemberStatus] = useState<MemberStatusFilter>('ACTIVE');
  const [users, setUsers] = useState<DepartmentUserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [previousUsersRequest, setPreviousUsersRequest] = useState<{
    departmentId: number | null;
    reloadToken: number;
    memberStatus: MemberStatusFilter;
  }>({ departmentId: null, reloadToken, memberStatus });

  if (
    previousUsersRequest.departmentId !== selectedDepartmentId
    || previousUsersRequest.reloadToken !== reloadToken
    || previousUsersRequest.memberStatus !== memberStatus
  ) {
    setPreviousUsersRequest({ departmentId: selectedDepartmentId, reloadToken, memberStatus });
    if (selectedDepartmentId === null) {
      setUsers([]);
      setUsersError('');
    } else {
      setUsersLoading(true);
      setUsersError('');
    }
  }

  useEffect(() => {
    if (selectedDepartmentId === null) return undefined;
    let cancelled = false;
    void (selectedDepartmentId === COMPANY_ROW_ID
      ? fetchUnassignedUsers(memberStatus)
      : fetchDepartmentUsers(selectedDepartmentId, memberStatus))
      .then((loaded) => {
        if (!cancelled) setUsers(loaded);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setUsers([]);
        setUsersError(messageOf(cause, '소속 사원을 조회하지 못했습니다.'));
      })
      .finally(() => {
        if (!cancelled) setUsersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDepartmentId, reloadToken, memberStatus]);

  /** 부서 편집 팝업의 부서장 선택지로 쓸 그 부서의 소속 사원을 불러온다. 실패하면 화면 상단에 안내하고 null을 돌려준다. */
  const loadMembers = useCallback(async (departmentId: number) => {
    try {
      return await fetchDepartmentUsers(departmentId, 'ACTIVE');
    } catch (cause) {
      setError(messageOf(cause, '소속 사원을 조회하지 못했습니다.'));
      return null;
    }
  }, []);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  /** 등록. 실패하면 오류를 그대로 던져 팝업이 메시지를 보여 준다. */
  const create = useCallback(async (payload: DepartmentPayload) => {
    setSaving(true);
    try {
      const created = await createDepartment(payload);
      setSelectedId(created.departmentId);
      setReloadToken((token) => token + 1);
      return created;
    } finally {
      setSaving(false);
    }
  }, []);

  const update = useCallback(async (departmentId: number, payload: DepartmentPayload) => {
    setSaving(true);
    try {
      const updated = await updateDepartment(departmentId, payload);
      setSelectedId(updated.departmentId);
      setReloadToken((token) => token + 1);
      return updated;
    } finally {
      setSaving(false);
    }
  }, []);

  /** 사용안함·복원. 실패하면 화면 상단 메시지에 서버 안내를 보여 준다. */
  const changeUse = useCallback(async (departmentId: number, useAt: DepartmentUseAt) => {
    setSaving(true);
    setError('');
    try {
      await changeDepartmentUse(departmentId, useAt);
      setReloadToken((token) => token + 1);
      return true;
    } catch (cause) {
      setError(messageOf(cause, '부서 사용 여부를 변경하지 못했습니다.'));
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    includeInactive,
    setIncludeInactive,
    rows,
    companyName,
    loading,
    error,
    setError,
    gridKey,
    selected,
    companySelected,
    select: setSelectedId,
    saving,
    users,
    memberStatus,
    setMemberStatus,
    usersLoading,
    usersError,
    initialLoad,
    reload,
    loadMembers,
    create,
    update,
    changeUse,
  };
}
