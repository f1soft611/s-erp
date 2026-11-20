import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GridSaveReconciliationError,
  type F1GridChanges,
  type F1GridRef,
} from '../../../../shared/components/f1-grid';
import { useNotification } from '../../../../shared/context/notification';
import { useInitialLoadState } from '../../../../shared/hooks/useInitialLoadState';
import { toEmployeePayload } from '../data/employeePayload';
import { fetchEmployeeCodeOptions, fetchEmployees, saveEmployeeRows } from '../services/employee.service';
import type { EmployeeCodeOptions, EmployeeFilters, EmployeeRow } from '../types/employee.types';

const EMPTY_OPTIONS: EmployeeCodeOptions = {
  position: [], gender: [], employmentType: [], nativeType: [], birthCalendar: [], country: [], level: [],
};

const INITIAL_FILTERS: EmployeeFilters = { keyword: '', status: 'ACTIVE' };

function messageOf(cause: unknown, fallback: string): string {
  return cause instanceof Error && cause.message ? cause.message : fallback;
}

/**
 * 사원 목록 조회(재직 구분·통합검색), 공통코드 선택지, 공통 행 폼 변경의 일괄 저장을 관리한다.
 * 창고관리와 같은 흐름이다: 행 폼에서 적용 → 화면 저장 버튼으로 한꺼번에 저장.
 */
export function useEmployeeManage() {
  const { showSuccess } = useNotification();
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  /** 사진이 바뀌었는지 비교하려고 마지막으로 불러오거나 저장한 행을 ID로 찾아볼 수 있게 둔다. */
  const originalById = useRef(new Map<string, EmployeeRow>());
  const [codeOptions, setCodeOptions] = useState<EmployeeCodeOptions>(EMPTY_OPTIONS);
  const [filters, setFilters] = useState<EmployeeFilters>(INITIAL_FILTERS);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const reconciliationRequired = useRef(false);
  const loadVersion = useRef(0);
  const [hasChanges, setHasChanges] = useState(false);
  const [gridKey, setGridKey] = useState(0);
  const { start, succeed, fail, ...initialLoad } = useInitialLoadState();

  const commitRows = useCallback((next: EmployeeRow[]) => {
    originalById.current = new Map(next.map((row) => [row.userId, row]));
    setRows(next);
  }, []);

  const loadRows = useCallback(
    async (next: EmployeeFilters) => {
      const version = ++loadVersion.current;
      setLoading(true);
      start();
      setError('');
      try {
        const [loaded, options] = await Promise.all([fetchEmployees(next), fetchEmployeeCodeOptions()]);
        if (version !== loadVersion.current) return false;
        commitRows(loaded);
        setCodeOptions(options);
        succeed();
        reconciliationRequired.current = false;
        return true;
      } catch (cause) {
        if (version !== loadVersion.current) return false;
        fail(cause);
        setError(messageOf(cause, '사원 목록을 조회하지 못했습니다.'));
        return false;
      } finally {
        if (version === loadVersion.current) setLoading(false);
      }
    },
    [start, succeed, fail, commitRows],
  );

  const initialFiltersRef = useRef(INITIAL_FILTERS);
  useEffect(() => {
    void loadRows(initialFiltersRef.current);
    return () => { loadVersion.current += 1; };
  }, [loadRows]);

  const applyFilters = useCallback(
    (next: EmployeeFilters) => {
      setFilters(next);
      void loadRows(next);
    },
    [loadRows],
  );

  const reload = useCallback(() => applyFilters(filters), [applyFilters, filters]);

  const discardChanges = useCallback(() => {
    setHasChanges(false);
    setGridKey((current) => current + 1);
  }, []);

  const handleChangesChange = useCallback((changes: F1GridChanges<EmployeeRow>) => {
    setHasChanges(
      changes.insertedRows.length > 0 || changes.updatedRows.length > 0 || changes.deletedRows.length > 0,
    );
  }, []);

  const saveChanges = useCallback(
    async (changes: F1GridChanges<EmployeeRow>, acceptSavedRows: F1GridRef<EmployeeRow>['acceptSavedRows']) => {
      if (reconciliationRequired.current) {
        setError(new GridSaveReconciliationError(undefined).message);
        return;
      }
      if (savingRef.current) return;
      if (!changes.insertedRows.length && !changes.updatedRows.length && !changes.deletedRows.length) return;
      savingRef.current = true;
      setSaving(true);
      setError('');
      try {
        if (changes.deletedRows.length) {
          throw new Error('사원은 삭제할 수 없습니다. 퇴사일을 입력해 퇴직 처리해 주세요.');
        }
        const insertedRows = changes.insertedRows.map((row) => toEmployeePayload(row));
        const updatedRows = changes.updatedRows.map((row) => {
          const userId = Number(row.userId);
          if (!Number.isSafeInteger(userId) || userId <= 0) {
            throw new Error('수정할 사원을 확인할 수 없습니다.');
          }
          return toEmployeePayload(row, originalById.current.get(row.userId));
        });
        const savedRows = await saveEmployeeRows(
          { employees: { insertedRows, updatedRows, deletedRows: [] } },
          [...changes.insertedRows, ...changes.updatedRows],
        );
        try {
          commitRows(acceptSavedRows(savedRows));
        } catch (cause) {
          throw new GridSaveReconciliationError(cause);
        }
        setHasChanges(false);
        showSuccess('사원을 저장했습니다.');
      } catch (cause) {
        if (cause instanceof GridSaveReconciliationError) reconciliationRequired.current = true;
        setError(messageOf(cause, '사원을 저장하지 못했습니다.'));
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [showSuccess, commitRows],
  );

  return {
    initialLoad, rows, codeOptions, filters, error, setError, loading, saving, hasChanges, gridKey,
    applyFilters, reload, discardChanges, handleChangesChange, saveChanges,
  };
}
