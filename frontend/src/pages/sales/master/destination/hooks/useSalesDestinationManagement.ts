import { useCallback, useEffect, useRef, useState } from 'react';
import type { F1GridChanges } from '../../../../../shared/components/f1-grid';
import {
  deleteSalesDestination, fetchDestinationCustomers, fetchSalesDestinations, saveDestinationBatch,
} from '../services/salesDestination.service';
import type { DestinationCustomer, SalesDestination, SalesDestinationGridRow } from '../types/salesDestination.types';

export function useSalesDestinationManagement() {
  const [customers, setCustomers] = useState<DestinationCustomer[]>([]);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [rows, setRows] = useState<SalesDestination[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [gridKey, setGridKey] = useState(0);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchDestinationCustomers(keyword)
      .then((list) => { if (active) setCustomers(list); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : '거래처 조회에 실패했습니다.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [keyword, revision]);

  useEffect(() => {
    let active = true;
    setSelectedId(null);
    setRows([]);
    if (customerId !== null) {
      setRowsLoading(true);
      fetchSalesDestinations(customerId)
        .then((list) => { if (active) setRows(list); })
        .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : '납품처 조회에 실패했습니다.'); })
        .finally(() => { if (active) setRowsLoading(false); });
    } else setRowsLoading(false);
    return () => { active = false; };
  }, [customerId, revision]);

  const save = useCallback(async (changes: F1GridChanges<SalesDestinationGridRow>) => {
    if (savingRef.current || customerId === null) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      const inserted = changes.insertedRows.map(({ salesDestinationId: _id, destinationCode: _code, ...row }) => row);
      const updated = changes.updatedRows.map((row) => {
        if (typeof row.salesDestinationId !== 'number') throw new Error('납품처 ID를 확인해 주세요.');
        return { ...row, salesDestinationId: row.salesDestinationId };
      });
      await saveDestinationBatch(customerId, inserted, updated);
      setHasChanges(false);
      setGridKey((value) => value + 1);
      setRevision((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '납품처 저장에 실패했습니다.');
    } finally { savingRef.current = false; setSaving(false); }
  }, [customerId]);

  const remove = useCallback(async (id: number) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      await deleteSalesDestination(id);
      setRevision((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '납품처 삭제에 실패했습니다.');
    } finally { savingRef.current = false; setSaving(false); }
  }, []);

  const discardChanges = useCallback(() => {
    setHasChanges(false);
    setGridKey((value) => value + 1);
  }, []);

  return { customers, customerId, setCustomerId, rows, selectedId, setSelectedId,
    setKeyword, loading, rowsLoading, saving, error, setError, save, remove,
    hasChanges, setHasChanges, gridKey, discardChanges, refresh: () => setRevision((value) => value + 1) };
}
