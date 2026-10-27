import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  Alert, Box, Button, Stack, useMediaQuery,
} from '@mui/material';
import { CommonDialog } from '../../../../../shared/components/CommonDialog';
import { F1Tree, type F1GridColumn, type F1TreeRef } from '../../../../../shared/components/f1-grid';
import { UnsavedChangesConfirmDialog } from '../../../../../shared/components/UnsavedChangesConfirmDialog';
import { useUnsavedChangesBeforeUnload } from '../../../../../shared/hooks/useUnsavedChangesBeforeUnload';
import {
  createClassification, fetchClassifications, updateClassification,
} from '../services/classification.service';
import type { Classification, ClassificationKind } from '../types/classification.types';

type Props = {
  open: boolean;
  kind: ClassificationKind;
  canCreate: boolean;
  canUpdate: boolean;
  onClose: () => void;
};

const sameValues = (row: Classification, saved?: Classification) => Boolean(saved &&
  row.name === saved.name && row.sortSeq === saved.sortSeq && row.useAt === saved.useAt);

function SettingsContent({ kind, canCreate, canUpdate, onClose }: Omit<Props, 'open'>) {
  const mobile = useMediaQuery('(max-width:599px)');
  const treeRef = useRef<F1TreeRef<Classification>>(null);
  const baseline = useRef(new Map<number, Classification>());
  const nextId = useRef(-1);
  const savingRef = useRef(false);
  const [rows, setRows] = useState<Classification[]>([]);
  const [treeKey, setTreeKey] = useState(0);
  const [selectedId, setSelectedId] = useState<number>();
  const [selected, setSelected] = useState<Classification>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [editorDirty, setEditorDirty] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);
  const maxLevel = kind === 'item' ? 3 : 2;
  const title = kind === 'item' ? '품목분류 설정' : '거래처분류 설정';
  const busy = loading || saving;
  useUnsavedChangesBeforeUnload(dirty || editorDirty);

  const applyRows = useCallback((data: Classification[], preferredId?: number) => {
    baseline.current = new Map(data.map((row) => [row.id, row]));
    setRows(data);
    setTreeKey((key) => key + 1);
    const selection = data.find((row) => row.id === preferredId) ?? data[0];
    setSelectedId(selection?.id);
    setSelected(selection);
    setDirty(false);
  }, []);

  useEffect(() => {
    let active = true;
    void fetchClassifications(kind)
      .then((data) => { if (active) applyRows(data); })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : '분류 목록을 불러오지 못했습니다.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [kind, applyRows]);

  const reload = async (preferredId = selectedId) => {
    setLoading(true);
    setLoadError('');
    try {
      applyRows(await fetchClassifications(kind), preferredId);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : '분류 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const changed = (row: Classification) => !sameValues(row, baseline.current.get(row.id));
  const editable = (row: Classification) =>
    !busy && !loadError && (row.id < 0 ? canCreate : canUpdate);
  const columns: F1GridColumn<Classification>[] = [
    { field: 'name', headerName: '분류명', width: 240, flex: 1, editable, required: true },
    { field: 'sortSeq', headerName: '정렬순서', width: 100, type: 'number', editable },
    {
      field: 'useAt', headerName: '사용여부', width: 90, type: 'checkbox', editable, align: 'center',
      getValue: (row) => row.useAt === 'Y',
      onValueChange: (_row, value) => ({ useAt: value ? 'Y' : 'N' }),
      headerCheckbox: false, syncWithTreeCheckbox: false,
    },
  ];

  const syncChanges = () => {
    const data = treeRef.current?.getActiveRows() ?? [];
    setDirty(data.some(changed));
    setSelected(data.find((row) => row.id === selectedId));
  };
  const commitEditor = () => {
    flushSync(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    });
  };
  const requestClose = () => {
    if (savingRef.current) return;
    commitEditor();
    if ((treeRef.current?.getActiveRows() ?? []).some(changed)) setConfirmClose(true);
    else onClose();
  };
  const add = (asChild = false) => {
    if (busy || savingRef.current || loadError || !canCreate) return;
    commitEditor();
    const parent = asChild ? treeRef.current?.getSelectedRows()[0] : undefined;
    if (asChild && (!parent || parent.level >= maxLevel || parent.useAt !== 'Y')) return;
    const row: Classification = {
      id: nextId.current--, parentId: parent?.id ?? null,
      level: (parent?.level ?? 0) + 1, name: '', sortSeq: 0, useAt: 'Y',
    };
    if (parent) treeRef.current?.addChildRow(parent.id, row);
    else treeRef.current?.addRow(row);
    setSaveError('');
  };

  const save = async () => {
    if (busy || savingRef.current || loadError) return;
    commitEditor();
    const snapshot = treeRef.current?.getActiveRows() ?? [];
    const pending = snapshot.filter(changed);
    if (!pending.length) return;
    const byId = new Map(snapshot.map((row) => [row.id, row]));
    for (const row of pending) {
      if (!(row.id < 0 ? canCreate : canUpdate)) return;
      if (!row.name.trim() || [...row.name.trim()].length > 50) {
        setSaveError('분류명은 1~50자로 입력해 주세요.');
        return;
      }
      if (row.sortSeq == null || String(row.sortSeq).trim() === '' ||
        !Number.isInteger(Number(row.sortSeq)) || Number(row.sortSeq) < 0 || Number(row.sortSeq) > 2147483647) {
        setSaveError('정렬순서는 0 이상 2147483647 이하의 정수로 입력해 주세요.');
        return;
      }
    }
    for (const row of snapshot) {
      if (row.parentId !== null && (row.useAt === 'Y' || row.id < 0) &&
        byId.get(row.parentId)?.useAt !== 'Y') {
        setSaveError('하위 분류를 사용하거나 추가하려면 상위 분류가 사용 상태여야 합니다.');
        return;
      }
    }

    savingRef.current = true;
    setSaving(true);
    setSaveError('');
    const savedByDraftId = new Map<number, Classification>();
    // Existing single-row APIs require parents first for creates/activation, children first for deactivation.
    const ordered = [
      ...pending.filter((row) => row.id > 0 && row.useAt === 'Y').sort((a, b) => a.level - b.level),
      ...pending.filter((row) => row.id < 0).sort((a, b) => a.level - b.level),
      ...pending.filter((row) => row.id > 0 && row.useAt === 'N').sort((a, b) => b.level - a.level),
    ];
    let failed = false;
    try {
      for (const row of ordered) {
        const payload = { name: row.name.trim(), sortSeq: Number(row.sortSeq), useAt: row.useAt };
        const saved = row.id < 0
          ? await createClassification(kind, {
            ...payload, parentId: savedByDraftId.get(row.parentId ?? 0)?.id ?? row.parentId,
          })
          : await updateClassification(kind, row.id, payload);
        savedByDraftId.set(row.id, saved);
        baseline.current.set(saved.id, saved);
      }
    } catch (error) {
      failed = true;
      setSaveError(error instanceof Error ? error.message : '분류를 저장하지 못했습니다.');
    }
    const reconciled = snapshot.map((row) => savedByDraftId.get(row.id) ?? {
      ...row, parentId: savedByDraftId.get(row.parentId ?? 0)?.id ?? row.parentId,
    });
    const nextSelectedId = savedByDraftId.get(selectedId ?? 0)?.id ?? selectedId;
    setRows(reconciled);
    setTreeKey((key) => key + 1);
    setSelectedId(nextSelectedId);
    setSelected(reconciled.find((row) => row.id === nextSelectedId));
    setDirty(reconciled.some(changed));
    if (!failed) await reload(nextSelectedId);
    savingRef.current = false;
    setSaving(false);
  };

  return (
    <CommonDialog open title={title} onClose={requestClose} fullScreenOnMobile
      description={`최대 ${maxLevel}단계 · 셀을 더블클릭하여 편집한 뒤 저장하세요. 삭제 대신 사용여부를 해제하세요.`}
      actions={<>
        <Button variant="contained" onClick={() => void save()}
          disabled={(!canCreate && !canUpdate) || busy || Boolean(loadError)}>{saving ? '저장 중…' : '저장'}</Button>
        <Button onClick={requestClose} disabled={saving}>닫기</Button>
      </>}>
      <Box sx={{ minWidth: 0, overflowX: 'hidden' }}>
        {loadError && <Alert severity="error" sx={{ mb: 2 }} action={
          <Button color="inherit" disabled={busy} onClick={() => void reload()}>다시 조회</Button>
        }>{loadError}</Alert>}
        {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}
        {canCreate && <Stack direction="row" spacing={1} useFlexGap sx={{ mb: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Button variant="outlined" disabled={busy || Boolean(loadError)} onClick={() => add()}>최상위 추가</Button>
          <Button variant="outlined" disabled={busy || Boolean(loadError) || !selected ||
            selected.level >= maxLevel || selected.useAt !== 'Y'} onClick={() => add(true)}>하위 추가</Button>
        </Stack>}
        <Box sx={{ minWidth: 0, width: '100%', overflow: 'hidden' }}
          onChangeCapture={(event) => {
            if (event.target instanceof HTMLInputElement && event.target.type !== 'checkbox') setEditorDirty(true);
          }}
          onKeyDownCapture={(event) => {
            const input = event.target instanceof HTMLElement &&
              (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA');
            if (event.key === 'Insert' || (event.ctrlKey && event.key.toLowerCase() === 'd') ||
              (event.key === 'Delete' && !input)) {
              event.preventDefault();
              event.stopPropagation();
            }
          }}>
          <F1Tree key={treeKey} ref={treeRef} rows={rows} columns={columns}
            rowKey="id" parentKey="parentId" treeColumn="name" ariaLabel="분류 트리"
            height={mobile ? 360 : 440} minHeight={200} showCheckbox={false} defaultExpandAll
            getRowOrder={(row) => row.sortSeq} loading={busy}
            onBeforeEdit={() => !savingRef.current && !loading && !loadError}
            editorPlugins={[{ id: 'classification-draft', endEdit: () => setEditorDirty(false) }]}
            initialSelectedRowIds={selectedId === undefined ? [] : [selectedId]}
            onSelectionChange={(ids) => {
              const id = typeof ids[0] === 'number' ? ids[0] : undefined;
              setSelectedId(id);
              setSelected(treeRef.current?.getActiveRows().find((row) => row.id === id));
            }}
            onChangesChange={syncChanges}
            disableContextMenu allowAddRootInContextMenu={false} allowAddRowInContextMenu={false}
            allowDuplicateRowInContextMenu={false} allowDeleteRowInContextMenu={false} />
        </Box>
      </Box>
      <UnsavedChangesConfirmDialog open={confirmClose} title="저장하지 않은 변경사항"
        description="분류의 변경사항을 버리고 계속하시겠습니까?" cancelLabel="취소" continueLabel="계속"
        onCancel={() => setConfirmClose(false)} onContinue={() => { setConfirmClose(false); onClose(); }} />
    </CommonDialog>
  );
}

export function ClassificationSettingsDialog({ open, ...props }: Props) {
  return open ? <SettingsContent key={props.kind} {...props} /> : null;
}
