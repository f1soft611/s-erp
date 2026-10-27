import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Checkbox, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, FormControlLabel, List, ListItemButton,
  ListItemText, Stack, TextField, Typography, useMediaQuery,
} from '@mui/material';
import { UnsavedChangesConfirmDialog } from '../../../../../shared/components/UnsavedChangesConfirmDialog';
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

type Form = {
  id: number | null;
  parentId: number | null;
  level: number;
  name: string;
  sortSeq: string;
  useAt: 'Y' | 'N';
};

const toForm = (row: Classification): Form => ({ ...row, sortSeq: String(row.sortSeq) });
const emptyForm = (parent?: Classification): Form => ({
  id: null, parentId: parent?.id ?? null, level: (parent?.level ?? 0) + 1,
  name: '', sortSeq: '0', useAt: 'Y',
});

function parentFirst(rows: Classification[]): Classification[] {
  const sorted = [...rows].sort((a, b) => a.sortSeq - b.sortSeq || a.id - b.id);
  const children = new Map<number | null, Classification[]>();
  const ids = new Set(rows.map((row) => row.id));
  for (const row of sorted) {
    const key = row.parentId !== null && ids.has(row.parentId) ? row.parentId : null;
    children.set(key, [...(children.get(key) ?? []), row]);
  }
  const result: Classification[] = [];
  const seen = new Set<number>();
  const visit = (row: Classification) => {
    if (seen.has(row.id)) return;
    seen.add(row.id);
    result.push(row);
    (children.get(row.id) ?? []).forEach(visit);
  };
  (children.get(null) ?? []).forEach(visit);
  sorted.forEach(visit);
  return result;
}

function SettingsContent({ kind, canCreate, canUpdate, onClose }: Omit<Props, 'open'>) {
  const mobile = useMediaQuery('(max-width:599px)');
  const [rows, setRows] = useState<Classification[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [pendingAction, setPendingAction] = useState<Form | 'close' | null>(null);
  const maxLevel = kind === 'item' ? 3 : 2;
  const title = kind === 'item' ? '품목분류설정' : '거래처분류설정';

  const applyRows = useCallback((data: Classification[], selectedId?: number) => {
    const loaded = parentFirst(data);
    setRows(loaded);
    setForm((previous) => {
      const selected = loaded.find((row) => row.id === (selectedId ?? previous?.id)) ?? loaded[0];
      return selected ? toForm(selected) : null;
    });
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

  const reload = async (selectedId?: number) => {
    setLoading(true);
    setLoadError('');
    try {
      applyRows(await fetchClassifications(kind), selectedId);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : '분류 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const editable = Boolean(form && (form.id === null ? canCreate : canUpdate));
  const selected = rows.find((row) => row.id === form?.id);
  const busy = loading || saving;
  const dirty = Boolean(form && (
    form.name !== (selected?.name ?? '') ||
    form.sortSeq !== String(selected?.sortSeq ?? 0) ||
    form.useAt !== (selected?.useAt ?? 'Y')
  ));
  const applyAction = (next: Form | 'close') => {
    if (next === 'close') onClose();
    else { setForm(next); setSaveError(''); }
  };
  const requestAction = (next: Form | 'close') => {
    if (saving) return;
    if (dirty) setPendingAction(next);
    else applyAction(next);
  };
  const save = async () => {
    if (!form || !editable || busy || loadError) return;
    const name = form.name.trim();
    const sortSeq = Number(form.sortSeq);
    if (!name || [...name].length > 50) {
      setSaveError('분류명은 1~50자로 입력해 주세요.');
      return;
    }
    if (!form.sortSeq.trim() || !Number.isInteger(sortSeq) || sortSeq < 0 || sortSeq > 2147483647) {
      setSaveError('정렬순서는 0 이상 2147483647 이하의 정수로 입력해 주세요.');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      const payload = { name, sortSeq, useAt: form.useAt };
      const saved = form.id === null
        ? await createClassification(kind, { ...payload, parentId: form.parentId })
        : await updateClassification(kind, form.id, payload);
      setForm(toForm(saved));
      setRows((previous) => parentFirst([...previous.filter((row) => row.id !== saved.id), saved]));
      await reload(saved.id);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : '분류를 저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const add = (parent?: Classification) => {
    requestAction(emptyForm(parent));
  };

  return (
    <Dialog open fullWidth maxWidth="md" fullScreen={mobile}
      aria-labelledby="classification-settings-title" onClose={() => requestAction('close')}>
      <DialogTitle id="classification-settings-title">{title}</DialogTitle>
      <DialogContent dividers sx={{ minWidth: 0, overflowX: 'hidden' }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          최대 {maxLevel}단계 · 상위 분류와 단계는 등록 후 변경할 수 없습니다. 삭제 대신 사용을 해제하세요.
        </Typography>
        {loadError && <Alert severity="error" sx={{ mb: 2 }} action={
          <Button color="inherit" disabled={busy} onClick={() => void reload()}>다시 조회</Button>
        }>{loadError}</Alert>}
        {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}
        {loading && <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <CircularProgress size={28} aria-label="분류 조회 중" />
        </Box>}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ minWidth: 0 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {canCreate && <Stack direction="row" spacing={1} useFlexGap sx={{ mb: 1, flexWrap: 'wrap' }}>
              <Button variant="outlined" disabled={busy || Boolean(loadError)} onClick={() => add()}>최상위 추가</Button>
              <Button variant="outlined" disabled={busy || Boolean(loadError) || !selected ||
                selected.level >= maxLevel || selected.useAt !== 'Y'}
                onClick={() => { if (selected) add(selected); }}>하위 추가</Button>
            </Stack>}
            {!loading && !loadError && rows.length === 0 &&
              <Typography color="text.secondary" sx={{ p: 2 }}>등록된 분류가 없습니다.</Typography>}
            <List aria-label="분류 목록" sx={{ maxHeight: { xs: 220, sm: 420 }, overflow: 'auto', p: 0 }}>
              {rows.map((row) => <ListItemButton key={row.id} aria-label={row.name}
                selected={form?.id === row.id} disabled={busy}
                onClick={() => { if (form?.id !== row.id) requestAction(toForm(row)); }}
                sx={{ pl: 2 + (row.level - 1) * 2, minWidth: 0 }}>
                <ListItemText primary={row.name} secondary={`${row.level}단계 · ${row.useAt === 'Y' ? '사용' : '미사용'}`}
                  slotProps={{ primary: { sx: { overflowWrap: 'anywhere' } } }} />
              </ListItemButton>)}
            </List>
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {form ? <Stack spacing={2}>
              <Typography variant="subtitle2">{form.id === null ? '새 분류' : '분류 수정'} · {form.level}단계</Typography>
              <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
                상위 분류: {rows.find((row) => row.id === form.parentId)?.name ?? '없음'}
              </Typography>
              <TextField label="분류명" size="small" fullWidth value={form.name} disabled={!editable || busy}
                onChange={(event) => setForm({ ...form, name: event.target.value })} />
              <TextField label="정렬순서" size="small" type="number" fullWidth value={form.sortSeq}
                disabled={!editable || busy} slotProps={{ htmlInput: { min: 0, max: 2147483647, step: 1 } }}
                onChange={(event) => setForm({ ...form, sortSeq: event.target.value })} />
              <FormControlLabel label="사용" control={<Checkbox checked={form.useAt === 'Y'}
                disabled={!editable || busy}
                onChange={(_, checked) => setForm({ ...form, useAt: checked ? 'Y' : 'N' })} />} />
            </Stack> : <Typography color="text.secondary" sx={{ p: 2 }}>분류를 선택하거나 추가해 주세요.</Typography>}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap' }}>
        <Button onClick={() => requestAction('close')} disabled={saving}>닫기</Button>
        <Button variant="contained" onClick={() => void save()}
          disabled={!editable || busy || Boolean(loadError)}>{saving ? '저장 중…' : '저장'}</Button>
      </DialogActions>
      <UnsavedChangesConfirmDialog open={pendingAction !== null} title="저장하지 않은 변경사항"
        description="분류의 변경사항을 버리고 계속하시겠습니까?" cancelLabel="취소" continueLabel="계속"
        onCancel={() => setPendingAction(null)} onContinue={() => {
          if (pendingAction !== null) applyAction(pendingAction);
          setPendingAction(null);
        }} />
    </Dialog>
  );
}

export function ClassificationSettingsDialog({ open, ...props }: Props) {
  return open ? <SettingsContent key={props.kind} {...props} /> : null;
}
