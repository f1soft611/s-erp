import { useEffect, useMemo, useState } from 'react';
import AddOutlined from '@mui/icons-material/AddOutlined';
import ArrowDownwardRounded from '@mui/icons-material/ArrowDownwardRounded';
import ArrowUpwardRounded from '@mui/icons-material/ArrowUpwardRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import {
  Alert,
  Box,
  Button,
  IconButton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { CommonDialog } from '../../../../../shared/components/CommonDialog';
import { useCommonConfirmDialog } from '../../../../../shared/hooks/useCommonConfirmDialog';
import type { WorkspaceRoom, WorkspaceUser, WorkspaceViewMode } from '../types/workspace.types';
import { PermissionGroupTable } from './PermissionGroupTable';
import { WorkspaceColorPicker } from './WorkspaceColorPicker';

type RoomSettingsDialogProps = {
  open: boolean;
  /** null이면 새 방을 만든다. */
  room: WorkspaceRoom | null;
  users: WorkspaceUser[];
  currentUserId: string;
  onClose: () => void;
  onSave: (room: WorkspaceRoom) => Promise<unknown>;
};

let seq = 0;
const newId = (prefix: string) => {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq}`;
};

const createDraft = (room: WorkspaceRoom | null, currentUserId: string): WorkspaceRoom =>
  room
    ? JSON.parse(JSON.stringify(room))
    : {
        id: newId('room'),
        name: '',
        defaultView: 'feed',
        columns: [],
        groups: [
          { id: newId('g'), name: '방 관리자', level: 'admin', members: [{ kind: 'user', userId: currentUserId }] },
        ],
      };

export function RoomSettingsDialog({ open, room, users, currentUserId, onClose, onSave }: RoomSettingsDialogProps) {
  const initial = useMemo(() => createDraft(room, currentUserId), [room, currentUserId, open]); // eslint-disable-line react-hooks/exhaustive-deps
  const [draft, setDraft] = useState<WorkspaceRoom>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog: confirmDialog } = useCommonConfirmDialog();

  useEffect(() => {
    if (!open) return;
    setDraft(initial);
    setSaving(false);
    setError(null);
  }, [open, initial]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const hasColumns = draft.columns.length > 0;
  const isNew = room === null;

  const requestClose = async () => {
    if (saving) return;
    if (dirty) {
      const discard = await confirm({
        title: '저장하지 않은 변경이 있습니다',
        description: '닫으면 변경한 내용이 사라집니다.',
        confirmLabel: '버리고 닫기',
        cancelLabel: '계속 편집',
      });
      if (!discard) return;
    }
    onClose();
  };

  const updateColumns = (columns: WorkspaceRoom['columns']) =>
    setDraft((current) => ({
      ...current,
      columns,
      defaultView: columns.length === 0 ? 'feed' : current.defaultView,
    }));

  const moveColumn = (index: number, delta: -1 | 1) => {
    const next = draft.columns.slice();
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    updateColumns(next);
  };

  const submit = async () => {
    if (draft.name.trim() === '' || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({ ...draft, name: draft.name.trim() });
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '방 설정을 저장하지 못했습니다.');
      setSaving(false);
    }
  };

  return (
    <>
      <CommonDialog
        open={open}
        onClose={() => void requestClose()}
        title={isNew ? '방 만들기' : '방 설정'}
        description="컬럼과 권한 그룹은 방 전체에 적용됩니다."
        size="md"
        fullScreenOnMobile
        actions={
          <>
            <Button variant="contained" disabled={draft.name.trim() === '' || saving} onClick={() => void submit()}>
              {saving ? '저장 중…' : '저장'}
            </Button>
            <Button disabled={saving} onClick={() => void requestClose()}>
              취소
            </Button>
          </>
        }
      >
        <Stack spacing={3}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <Stack spacing={1.5}>
            <Typography variant="subtitle2">기본 정보</Typography>
            <TextField
              label="방 이름"
              size="small"
              fullWidth
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              slotProps={{ htmlInput: { 'aria-required': true, maxLength: 100 } }}
            />
            <Box>
              <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 0.5 }}>
                기본 보기
              </Typography>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={draft.defaultView}
                aria-label="기본 보기"
                onChange={(_, next: WorkspaceViewMode | null) => {
                  if (next) setDraft({ ...draft, defaultView: next });
                }}
              >
                <ToggleButton value="kanban" disabled={!hasColumns} sx={{ px: 2 }}>
                  칸반
                </ToggleButton>
                <ToggleButton value="feed" sx={{ px: 2 }}>
                  피드
                </ToggleButton>
                <ToggleButton value="list" sx={{ px: 2 }}>
                  리스트
                </ToggleButton>
                <ToggleButton value="file" sx={{ px: 2 }}>
                  첨부
                </ToggleButton>
              </ToggleButtonGroup>
              {!hasColumns ? (
                <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
                  컬럼을 추가하면 칸반으로 볼 수 있습니다.
                </Typography>
              ) : null}
            </Box>
          </Stack>

          <Stack spacing={1}>
            <Typography variant="subtitle2">칸반 컬럼</Typography>
            {draft.columns.map((column, index) => (
              <Stack key={column.id} direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                <WorkspaceColorPicker
                  value={column.color}
                  ariaLabel={`컬럼 ${index + 1} 색상`}
                  onChange={(color) =>
                    updateColumns(
                      draft.columns.map((item) => {
                        if (item.id !== column.id) return item;
                        const { color: _previous, ...rest } = item;
                        return color ? { ...rest, color } : rest;
                      }),
                    )
                  }
                />
                <TextField
                  size="small"
                  fullWidth
                  value={column.name}
                  onChange={(event) =>
                    updateColumns(draft.columns.map((item) => (item.id === column.id ? { ...item, name: event.target.value } : item)))
                  }
                  slotProps={{ htmlInput: { 'aria-label': `컬럼 ${index + 1} 이름` } }}
                />
                <IconButton size="small" aria-label={`컬럼 ${index + 1} 위로`} disabled={index === 0} onClick={() => moveColumn(index, -1)}>
                  <ArrowUpwardRounded fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  aria-label={`컬럼 ${index + 1} 아래로`}
                  disabled={index === draft.columns.length - 1}
                  onClick={() => moveColumn(index, 1)}
                >
                  <ArrowDownwardRounded fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  aria-label={`컬럼 ${index + 1} 삭제`}
                  onClick={() => updateColumns(draft.columns.filter((item) => item.id !== column.id))}
                >
                  <DeleteOutlineRounded fontSize="small" />
                </IconButton>
              </Stack>
            ))}
            <Button
              size="small"
              startIcon={<AddOutlined />}
              sx={{ alignSelf: 'flex-start' }}
              onClick={() => updateColumns([...draft.columns, { id: newId('col'), name: '새 컬럼' }])}
            >
              컬럼 추가
            </Button>
            <Typography variant="caption" color="text.secondary">
              카드가 있는 컬럼은 삭제할 수 없습니다. 먼저 카드를 다른 컬럼으로 옮겨 주세요.
            </Typography>
          </Stack>

          <Stack spacing={1}>
            <Typography variant="subtitle2">권한 그룹</Typography>
            <PermissionGroupTable groups={draft.groups} users={users} onChange={(groups) => setDraft({ ...draft, groups })} />
            <Typography variant="caption" color="text.secondary">
              방 설정 권한 그룹은 최소 1개 필요합니다. 저장 권한이 있는 그룹만 글·댓글을 쓰고 카드를 옮길 수 있습니다.
            </Typography>
          </Stack>
        </Stack>
      </CommonDialog>
      {confirmDialog}
    </>
  );
}
