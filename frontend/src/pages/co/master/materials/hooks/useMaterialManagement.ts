import { useCallback, useEffect, useRef, useState } from 'react';
import type { F1GridChanges } from '../../../../../shared/components/f1-grid';
import { useNotification } from '../../../../../shared/context/NotificationContext';
import { fetchMaterialOptions, fetchMaterials, saveMaterialBatch, toMaterialPayload } from '../services/materialManagement.service';
import type { MaterialFilters, MaterialOption, MaterialRow } from '../types/materialManagement.types';

export function useMaterialManagement() {
  const { showSuccess } = useNotification();
  const [rows, setRows] = useState<MaterialRow[]>([]);
  const [options, setOptions] = useState<MaterialOption[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [gridKey, setGridKey] = useState(0);
  const [appliedFilters, setAppliedFilters] = useState<MaterialFilters>({});
  const savingRef = useRef(false);
  const loadVersion = useRef(0);

  const loadRows = useCallback(async (filters: MaterialFilters, quiet = false) => {
    const version = ++loadVersion.current;
    if (!quiet) setLoading(true);
    setError('');
    try {
      const [nextRows, nextOptions] = await Promise.all([fetchMaterials(filters), fetchMaterialOptions()]);
      if (version !== loadVersion.current) return false;
      setRows(nextRows);
      setOptions(nextOptions);
      return true;
    } catch (cause) {
      if (version === loadVersion.current) setError(cause instanceof Error ? cause.message : '품목 목록을 불러오지 못했습니다.');
      return false;
    } finally {
      if (!quiet && version === loadVersion.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRows({});
    return () => { ++loadVersion.current; };
  }, [loadRows]);

  const applyFilters = useCallback((filters: MaterialFilters) => {
    if (savingRef.current) return;
    setAppliedFilters(filters);
    void loadRows(filters);
  }, [loadRows]);
  const discardChanges = useCallback(() => {
    setHasChanges(false);
    setGridKey((key) => key + 1);
  }, []);
  const handleChangesChange = useCallback((changes: F1GridChanges<MaterialRow>) => {
    setHasChanges(Boolean(changes.insertedRows.length || changes.updatedRows.length || changes.deletedRows.length));
  }, []);
  const saveChanges = useCallback(async (changes: F1GridChanges<MaterialRow>) => {
    if (savingRef.current || (!changes.insertedRows.length && !changes.updatedRows.length && !changes.deletedRows.length)) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      if (changes.deletedRows.length) throw new Error('품목 삭제는 지원하지 않습니다.');
      const insertedRows = changes.insertedRows.map((row) => ({ ...toMaterialPayload(row, true), materialId: String(row.materialId) }));
      const updatedRows = changes.updatedRows.map((row) => {
        const id = Number(row.materialId);
        if (!Number.isSafeInteger(id) || id <= 0) throw new Error('수정할 품목 ID를 확인해 주세요.');
        return { ...toMaterialPayload(row, false), materialId: String(id) };
      });
      await saveMaterialBatch({ materials: { insertedRows, updatedRows, deletedRows: [] } });
      const refreshed = await loadRows(appliedFilters, true);
      discardChanges();
      if (!refreshed) {
        setError('저장은 완료했지만 목록을 다시 불러오지 못했습니다. 조회를 다시 실행해 주세요.');
        return;
      }
      showSuccess('품목을 저장했습니다.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '품목을 저장하지 못했습니다.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [appliedFilters, discardChanges, loadRows, showSuccess]);
  return { rows, options, error, setError, loading, saving, hasChanges, gridKey,
    appliedFilters, applyFilters, discardChanges, handleChangesChange, saveChanges };
}
