import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { F1GridChanges, F1TreeRef } from '../../../../shared/components/f1-grid';
import { useUnsavedChangesBeforeUnload } from '../../../../shared/hooks/useUnsavedChangesBeforeUnload';
import { createProcessRow } from '../data/processManagement.data';
import { fetchProcesses, saveProcesses } from '../services/processManagement.service';
import type { ProcessRow } from '../types/processManagement.types';

export function useProcessManagement() {
  const treeRef = useRef<F1TreeRef<ProcessRow>>(null);
  const [rows, setRows] = useState<ProcessRow[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [parentId, setParentId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [version, setVersion] = useState(0);
  useUnsavedChangesBeforeUnload(dirty);

  useEffect(() => {
    let active = true;
    fetchProcesses().then((items) => { if (active) setRows(items); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : '공정 조회에 실패했습니다.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const visibleRows = useMemo(() => {
    const keyword = appliedQuery.trim().toLowerCase();
    if (!keyword) return rows;
    const matches = rows.filter((row) => [row.name, row.code, row.description].some((value) => value.toLowerCase().includes(keyword)));
    const ids = new Set(matches.flatMap((row) => [row.id, ...(row.parentId ? [row.parentId] : [])]));
    return rows.filter((row) => ids.has(row.id) || (row.parentId && ids.has(row.parentId) && matches.some((item) => item.id === row.parentId)));
  }, [appliedQuery, rows]);

  const onChanges = (changes: F1GridChanges<ProcessRow>) =>
    setDirty(changes.insertedRows.length + changes.updatedRows.length + changes.deletedRows.length > 0);
  const onSelection = useCallback((ids: (string | number)[]) => {
    const next = ids.map(String);
    const row = treeRef.current?.getActiveRows().find((item) => item.id === next[0]);
    setParentId(row?.id.startsWith('g:') ? row.id : row?.parentId ?? null);
    setSelected((current) => current.length === next.length && current.every((id, index) => id === next[index])
      ? current : next);
  }, []);
  const addGroup = () => treeRef.current?.addRow(createProcessRow(true));
  const addProcessUnder = (groupId: string) => treeRef.current?.addChildRow(groupId, createProcessRow(false));
  const addProcess = () => { if (parentId) addProcessUnder(parentId); };
  const save = async () => {
    const grid = treeRef.current;
    if (!grid || !grid.validate()) return;
    setSaving(true);
    setError('');
    try {
      const saved = await saveProcesses(grid.getChanges());
      setRows(saved);
      setDirty(false);
      setSelected([]);
      setParentId(null);
      setVersion((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '공정 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return {
    treeRef, visibleRows, selected, parentId, query, setQuery, appliedQuery, setAppliedQuery,
    error, setError, loading, saving, dirty, version, onChanges, onSelection, addGroup, addProcess,
    addProcessUnder, save,
  };
}
