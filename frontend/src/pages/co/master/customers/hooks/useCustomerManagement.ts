import { useCallback, useEffect, useRef, useState } from 'react';
import type { F1GridChanges } from '../../../../../shared/components/f1-grid';
import { useNotification } from '../../../../../shared/context/NotificationContext';
import {
  fetchCustomers,
  saveCustomerBatch,
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
    postCode: row.postCode.trim(),
    address: row.address.trim(),
    telephoneNo: row.telephoneNo.trim(),
    facsimileNo: row.facsimileNo.trim(),
    custMemo: row.custMemo.trim(),
    useAt: row.useAt,
  };
}

export function useCustomerManagement() {
  const { showSuccess } = useNotification();
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [gridKey, setGridKey] = useState(0);
  const [appliedFilters, setAppliedFilters] = useState<CustomerFilters>({});

  const loadRows = useCallback(
    async (
      filters: CustomerFilters = {},
      options: { quiet?: boolean } = {},
    ) => {
      if (!options.quiet) setLoading(true);
      setError('');
      try {
        setRows(await fetchCustomers(filters));
        return true;
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : '거래처 목록을 불러오지 못했습니다.',
        );
        return false;
      } finally {
        if (!options.quiet) setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadRows({});
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
    async (changes: F1GridChanges<CustomerRow>) => {
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
        await saveCustomerBatch({
          customers: { insertedRows, updatedRows, deletedRows: [] },
        });
        const refreshed = await loadRows(appliedFilters, { quiet: true });
        setHasChanges(false);
        setGridKey((current) => current + 1);
        if (!refreshed) {
          setError('저장은 완료했지만 목록을 다시 불러오지 못했습니다. 조회를 다시 실행해 주세요.');
          return;
        }
        showSuccess('거래처를 저장했습니다.');
      } catch (saveError) {
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
    [appliedFilters, loadRows, showSuccess],
  );

  return {
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
