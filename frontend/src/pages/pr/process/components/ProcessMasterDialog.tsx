import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, Button, Stack, useMediaQuery } from '@mui/material';
import { AppSaveButton } from '../../../../shared/components/AppSaveButton';
import { CommonDialog } from '../../../../shared/components/CommonDialog';
import { F1Grid, type F1GridChanges, type F1GridRef } from '../../../../shared/components/f1-grid';
import { UnsavedChangesConfirmDialog } from '../../../../shared/components/UnsavedChangesConfirmDialog';
import { useNotification } from '../../../../shared/context/notification';
import { useUnsavedChangesBeforeUnload } from '../../../../shared/hooks/useUnsavedChangesBeforeUnload';
import { createProcessColumns } from '../data/processManagement.columns';
import { createMasterRow } from '../data/processManagement.data';
import { fetchProcessMasters, saveProcessMasters } from '../services/processManagement.service';
import type { ProcessRow } from '../types/processManagement.types';

type Props = {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onClose: () => void;
  /** 공정 마스터가 저장되어 작업장 트리를 다시 조회해야 할 때 호출한다. */
  onSaved: () => void;
};

/** 공정 마스터(이름·설명·이미지·속성)를 등록·수정·삭제한다. */
export function ProcessMasterDialog({ canCreate, canUpdate, canDelete, onClose, onSaved }: Props) {
  const mobile = useMediaQuery('(max-width:599px)');
  const { showSuccess } = useNotification();
  const gridRef = useRef<F1GridRef<ProcessRow>>(null);
  const [rows, setRows] = useState<ProcessRow[]>([]);
  const [gridKey, setGridKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const [error, setError] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);
  const busy = loading || saving;
  useUnsavedChangesBeforeUnload(dirty);

  const load = () => {
    setLoading(true);
    setError('');
    return fetchProcessMasters()
      .then((items) => { setRows(items); setGridKey((key) => key + 1); setDirty(false); setSelectedCount(0); })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : '공정 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, []);

  const canEdit = (row: ProcessRow) => !busy && (row.id.includes(':new-') ? canCreate : canUpdate);
  const columns = useMemo(() => createProcessColumns({
    nameHeader: '공정명', canEditText: canEdit, canEditProcess: canEdit,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [busy, canCreate, canUpdate]);

  const save = async () => {
    const grid = gridRef.current;
    if (!grid || busy || !grid.validate()) return;
    const changes: F1GridChanges<ProcessRow> = grid.getChanges();
    setSaving(true);
    setError('');
    try {
      const saved = await saveProcessMasters(changes);
      setRows(saved);
      setGridKey((key) => key + 1);
      setDirty(false);
      setSelectedCount(0);
      showSuccess('공정을 저장했습니다.');
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '공정을 저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };
  const requestClose = () => { if (saving) return; if (dirty) setConfirmClose(true); else onClose(); };

  return (
    <CommonDialog open title="공정 설정" size="xl" fullScreenOnMobile onClose={requestClose}
      description="작업장에 연결할 공정을 등록합니다. 작업장에 연결된 공정은 삭제할 수 없습니다."
      actions={<>
        <AppSaveButton variant="contained" saving={saving} progressLabel="공정 저장 중" onClick={() => void save()}
          disabled={(!canCreate && !canUpdate && !canDelete) || !dirty || busy}>저장</AppSaveButton>
        <Button onClick={requestClose} disabled={saving}>닫기</Button>
      </>}>
      <Box sx={{ minWidth: 0, overflowX: 'hidden' }}>
        {error && <Alert severity="error" sx={{ mb: 2 }} action={loading ? undefined : (
          rows.length === 0 && !dirty ? <Button color="inherit" onClick={() => void load()}>다시 조회</Button> : undefined
        )}>{error}</Alert>}
        <Stack direction="row" spacing={1} useFlexGap sx={{ mb: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {canCreate && <Button variant="outlined" disabled={busy} onClick={() => gridRef.current?.addRow(createMasterRow())}>공정 추가</Button>}
          {canDelete && <Button variant="outlined" color="error" disabled={busy || selectedCount === 0}
            onClick={() => gridRef.current?.deleteSelectedRows()}>선택 삭제</Button>}
        </Stack>
        <Box sx={{ minWidth: 0, width: '100%', overflow: 'hidden' }}>
          <F1Grid key={gridKey} ref={gridRef} storageKey="process-master-grid-v1" ariaLabel="공정 설정" rows={rows}
            rowKey="id" columns={columns} height={mobile ? 360 : 440} minHeight={200} rowHeight={80} showCheckbox
            loading={loading} createRow={createMasterRow}
            onChangesChange={(changes) => setDirty(changes.insertedRows.length + changes.updatedRows.length + changes.deletedRows.length > 0)}
            onSelectionChange={(ids) => setSelectedCount(ids.length)}
            onValidationErrors={(errors) => setError(errors.map((item) => item.message).join('\n'))}
            disableContextMenu allowDuplicateRowInContextMenu={false} />
        </Box>
      </Box>
      <UnsavedChangesConfirmDialog open={confirmClose} title="저장하지 않은 변경사항"
        description="공정의 변경사항을 버리고 계속하시겠습니까?" cancelLabel="취소" continueLabel="계속"
        onCancel={() => setConfirmClose(false)} onContinue={() => { setConfirmClose(false); onClose(); }} />
    </CommonDialog>
  );
}
