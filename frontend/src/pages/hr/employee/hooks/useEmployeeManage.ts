import { useCallback, useEffect, useState } from 'react';
import { useNotification } from '../../../../shared/context/notification';
import { useInitialLoadState } from '../../../../shared/hooks/useInitialLoadState';
import {
  createEmployee,
  fetchEmployeeCodeOptions,
  fetchEmployees,
  updateEmployee,
} from '../services/employee.service';
import type {
  EmployeeCodeOptions,
  EmployeeFilters,
  EmployeePayload,
  EmployeeRow,
} from '../types/employee.types';

const EMPTY_OPTIONS: EmployeeCodeOptions = {
  position: [], gender: [], employmentType: [], nativeType: [], birthCalendar: [], country: [], level: [],
};

function messageOf(cause: unknown, fallback: string): string {
  return cause instanceof Error && cause.message ? cause.message : fallback;
}

/** 사원 목록 조회(재직 구분·통합검색), 공통코드 선택지, 등록·수정을 관리한다. */
export function useEmployeeManage() {
  const { showSuccess } = useNotification();
  const [filters, setFilters] = useState<EmployeeFilters>({ keyword: '', status: 'ACTIVE' });
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const [saving, setSaving] = useState(false);
  const [codeOptions, setCodeOptions] = useState<EmployeeCodeOptions>(EMPTY_OPTIONS);
  const { start, succeed, fail, ...initialLoad } = useInitialLoadState();

  const [previousRequest, setPreviousRequest] = useState<{
    filters: EmployeeFilters | undefined;
    reloadToken: number;
  }>({ filters: undefined, reloadToken });

  if (previousRequest.filters !== filters || previousRequest.reloadToken !== reloadToken) {
    setPreviousRequest({ filters, reloadToken });
    start();
    setLoading(true);
  }

  useEffect(() => {
    let cancelled = false;
    void fetchEmployees(filters)
      .then((loaded) => {
        if (cancelled) return;
        setRows(loaded);
        setError('');
        succeed();
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        fail(cause);
        setError(messageOf(cause, '사원 목록을 조회하지 못했습니다.'));
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
    void fetchEmployeeCodeOptions()
      .then((options) => {
        if (!cancelled) setCodeOptions(options);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(messageOf(cause, '선택 항목(공통코드)을 불러오지 못했습니다.'));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const search = useCallback((next: EmployeeFilters) => setFilters({ ...next }), []);
  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  /** 등록. 실패하면 오류를 그대로 던져 팝업이 메시지를 보여 준다. */
  const create = useCallback(async (payload: EmployeePayload) => {
    setSaving(true);
    try {
      const created = await createEmployee(payload);
      showSuccess('사원을 등록했습니다.');
      setReloadToken((token) => token + 1);
      return created;
    } finally {
      setSaving(false);
    }
  }, [showSuccess]);

  const update = useCallback(async (userId: number, payload: EmployeePayload) => {
    setSaving(true);
    try {
      const updated = await updateEmployee(userId, payload);
      showSuccess('사원 정보를 저장했습니다.');
      setReloadToken((token) => token + 1);
      return updated;
    } finally {
      setSaving(false);
    }
  }, [showSuccess]);

  return {
    filters, rows, loading, error, setError, saving, codeOptions, initialLoad, search, reload, create, update,
  };
}
