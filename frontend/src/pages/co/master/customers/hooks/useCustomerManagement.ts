import { useCallback, useEffect, useRef, useState } from 'react';
import { GridSaveReconciliationError, type F1GridChanges, type F1GridRef } from '../../../../../shared/components/f1-grid';
import { useNotification } from '../../../../../shared/context/NotificationContext';
import { useInitialLoadState } from '../../../../../shared/hooks/useInitialLoadState';
import { normalizeClassificationId } from '../../classification/services/classification.service';
import {
  fetchCustomers,
  saveCustomerRows,
} from '../services/customerManagement.service';
import type {
  CustomerFilters,
  CustomerPayload,
  CustomerRow,
} from '../types/customerManagement.types';

function toPayload(row: CustomerRow, isNew: boolean): CustomerPayload {
  const customerName = row.customerName.trim();
  const customerCode = row.customerCode.trim();
  if (!isNew && !customerCode) {
    throw new Error('수정 시 거래처코드를 입력해 주세요.');
  }
  if (row.useAt !== 'Y' && row.useAt !== 'N') {
    throw new Error('사용 여부는 사용 또는 미사용으로 선택해 주세요.');
  }

  return {
    customerCode,
    customerName,
    custNameAbbr: row.custNameAbbr.trim(),
    presidentName: row.presidentName.trim(),
    businessNo: row.businessNo.trim(),
    juridNo: row.juridNo.trim(),
    businessStatus1: row.businessStatus1.trim(),
    businessItem1: row.businessItem1.trim(),
    businessKind1: normalizeClassificationId(row.businessKind1),
    businessKind2: normalizeClassificationId(row.businessKind2),
    postCode: row.postCode.trim(),
    address: row.address.trim(),
    telephoneNo: row.telephoneNo.trim(),
    facsimileNo: row.facsimileNo.trim(),
    custMemo: row.custMemo.trim(),
    useAt: row.useAt,
  };
}

export function useCustomerManagement(initialFilters: CustomerFilters = {}) {
  const { showSuccess } = useNotification();
  const initialFiltersRef = useRef(initialFilters);
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const reconciliationRequired = useRef(false);
  const loadVersion = useRef(0);
  const [hasChanges, setHasChanges] = useState(false);
  const [gridKey, setGridKey] = useState(0);
  const [appliedFilters, setAppliedFilters] = useState<CustomerFilters>(initialFilters);
  const { start, succeed, fail, ...initialLoad } = useInitialLoadState();

  const loadRows = useCallback(
    async (
      filters: CustomerFilters = {},
    ) => {
      const version = ++loadVersion.current;
      setLoading(true);
      start();
      setError('');
      try {
        const nextRows = await fetchCustomers(filters);
        if (version !== loadVersion.current) return false;
        setRows(nextRows);
        succeed();
        reconciliationRequired.current = false;
        return true;
      } catch (loadError) {
        if (version !== loadVersion.current) return false;
        fail(loadError);
        setError(
          loadError instanceof Error
            ? loadError.message
            : '거래처 목록을 불러오지 못했습니다.',
        );
        return false;
      } finally {
        if (version === loadVersion.current) setLoading(false);
      }
    },
    [start, succeed, fail],
  );

  useEffect(() => {
    void loadRows(initialFiltersRef.current);
    return () => { ++loadVersion.current; };
  }, [loadRows]);

  const applyFilters = useCallback(
    (filters: CustomerFilters) => {
      setAppliedFilters(filters);
      void loadRows(filters);
    },
    [loadRows],
  );

  const discardChanges = useCallback(() => {
    setHasChanges(false);
    setGridKey((current) => current + 1);
  }, []);

  const handleChangesChange = useCallback(
    (changes: F1GridChanges<CustomerRow>) => {
      setHasChanges(
        changes.insertedRows.length > 0 ||
          changes.updatedRows.length > 0 ||
          changes.deletedRows.length > 0,
      );
    },
    [],
  );

  const saveChanges = useCallback(
    async (
      changes: F1GridChanges<CustomerRow>,
      acceptSavedRows: F1GridRef<CustomerRow>['acceptSavedRows'],
    ) => {
      if (reconciliationRequired.current) {
        setError(new GridSaveReconciliationError(undefined).message);
        return;
      }
      if (savingRef.current) return;
      if (
        !changes.insertedRows.length &&
        !changes.updatedRows.length &&
        !changes.deletedRows.length
      ) {
        return;
      }
      savingRef.current = true;
      setSaving(true);
      setError('');
      try {
        if (changes.deletedRows.length) {
          throw new Error('거래처는 삭제할 수 없습니다. 사용 여부를 변경해 주세요.');
        }
        const insertedRows = changes.insertedRows.map((row) => ({
          ...toPayload(row, true),
          customerId: String(row.customerId),
        }));
        const updatedRows = changes.updatedRows.map((row) => {
          const customerId = Number(row.customerId);
          if (!Number.isSafeInteger(customerId) || customerId <= 0) {
            throw new Error('수정할 거래처를 확인할 수 없습니다.');
          }
          return { ...toPayload(row, false), customerId: String(customerId) };
        });
        const savedRows = await saveCustomerRows({
          customers: { insertedRows, updatedRows, deletedRows: [] },
        }, [...changes.insertedRows, ...changes.updatedRows]);
        try {
          setRows(acceptSavedRows(savedRows));
        } catch (cause) {
          throw new GridSaveReconciliationError(cause);
        }
        setHasChanges(false);
        showSuccess('거래처를 저장했습니다.');
      } catch (saveError) {
        if (saveError instanceof GridSaveReconciliationError) reconciliationRequired.current = true;
        setError(
          saveError instanceof Error
            ? saveError.message
            : '거래처를 저장하지 못했습니다.',
        );
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [showSuccess],
  );

  return {
    initialLoad,
    rows,
    error,
    setError,
    loading,
    saving,
    hasChanges,
    gridKey,
    discardChanges,
    appliedFilters,
    applyFilters,
    handleChangesChange,
    saveChanges,
  };
}
