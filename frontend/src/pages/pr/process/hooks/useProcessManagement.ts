import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { F1GridChanges, F1TreeRef } from '../../../../shared/components/f1-grid';
import { useUnsavedChangesBeforeUnload } from '../../../../shared/hooks/useUnsavedChangesBeforeUnload';
import { createLinkRow, createWorkplaceRow } from '../data/processManagement.data';
import { fetchProcessMasters, fetchProcesses, saveProcesses } from '../services/processManagement.service';
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pickerWorkplaceId, setPickerWorkplaceId] = useState<string | null>(null);
  const [masters, setMasters] = useState<ProcessRow[]>([]);
  const [mastersLoading, setMastersLoading] = useState(false);
  const [mastersError, setMastersError] = useState('');
  useUnsavedChangesBeforeUnload(dirty);

  /** silent이면 로딩 표시와 기존 오류 메시지 초기화 없이 조용히 다시 조회한다. */
  const reload = useCallback(async (options: { silent?: boolean } = {}) => {
    if (!options.silent) setLoading(true);
    if (!options.silent) setError('');
    try {
      setRows(await fetchProcesses());
      setDirty(false);
      setSelected([]);
      setParentId(null);
      setVersion((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '공정 조회에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

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
  const addWorkplace = () => treeRef.current?.addRow(createWorkplaceRow());

  /** 작업장에 공정을 추가하려고 공정 선택 모달을 연다. 공정 마스터는 열 때마다 다시 조회한다. */
  const addProcessUnder = (workplaceId: string) => {
    setPickerWorkplaceId(workplaceId);
    setMastersLoading(true);
    setMastersError('');
    fetchProcessMasters()
      .then(setMasters)
      .catch((cause: unknown) => setMastersError(cause instanceof Error ? cause.message : '공정 목록을 불러오지 못했습니다.'))
      .finally(() => setMastersLoading(false));
  };
  const addProcess = () => { if (parentId) addProcessUnder(parentId); };
  const closePicker = () => setPickerWorkplaceId(null);
  const confirmPicker = (selectedMasters: ProcessRow[]) => {
    const workplaceId = pickerWorkplaceId;
    setPickerWorkplaceId(null);
    if (workplaceId) selectedMasters.forEach((master) => treeRef.current?.addChildRow(workplaceId, createLinkRow(workplaceId, master)));
  };
  /** 이미 연결되었거나 이번 변경에서 추가한 공정 마스터 ID. */
  const linkedProcessIds = (workplaceId: string | null): ReadonlySet<number> => new Set(
    (treeRef.current?.getActiveRows() ?? [])
      .filter((row) => row.parentId === workplaceId && row.processId !== null)
      .map((row) => row.processId as number));

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

  const workplaceName = (workplaceId: string | null) =>
    treeRef.current?.getActiveRows().find((row) => row.id === workplaceId)?.name ?? '';

  return {
    treeRef, visibleRows, selected, parentId, query, setQuery, appliedQuery, setAppliedQuery,
    error, setError, loading, saving, dirty, version, onChanges, onSelection, addWorkplace, addProcess,
    addProcessUnder, save, reload,
    settingsOpen, openSettings: () => setSettingsOpen(true), closeSettings: () => setSettingsOpen(false),
    pickerWorkplaceId, closePicker, confirmPicker, masters, mastersLoading, mastersError,
    linkedProcessIds, workplaceName,
  };
}
