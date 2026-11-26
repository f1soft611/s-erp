import { useEffect, useState, type ChangeEvent } from 'react';
import AttachFileOutlined from '@mui/icons-material/AttachFileOutlined';
import type { Editor } from '@tiptap/react';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { CommonDialog } from '../../../../../shared/components/CommonDialog';
import { AttachmentList } from '../../../../../shared/components/feed/AttachmentList';
import { RichTextEditor, RichTextEditorToolbar } from '../../../../../shared/components/rich-text-editor/RichTextEditor';
import { useCommonConfirmDialog } from '../../../../../shared/hooks/useCommonConfirmDialog';
import { fileToAttachment, imageToEditorImage } from '../data/workspaceFiles';
import type { NewPostInput } from '../hooks/useWorkspacePosts';
import type { WorkspaceRoom } from '../types/workspace.types';

type PostComposerDialogProps = {
  open: boolean;
  room: WorkspaceRoom;
  onClose: () => void;
  onSubmit: (input: NewPostInput) => Promise<unknown>;
};

export function PostComposerDialog({ open, room, onClose, onSubmit }: PostComposerDialogProps) {
  const theme = useTheme();
  const [title, setTitle] = useState('');
  const [columnId, setColumnId] = useState<string | null>(room.columns[0]?.id ?? null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [bodyEmpty, setBodyEmpty] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 열 때마다 에디터를 새로 만들어 이전 내용이 남지 않게 한다.
  const [session, setSession] = useState(0);
  const { confirm, dialog: confirmDialog } = useCommonConfirmDialog();

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setColumnId(room.columns[0]?.id ?? null);
    setBodyEmpty(true);
    setFiles([]);
    setSaving(false);
    setError(null);
    setSession((current) => current + 1);
  }, [open, room]);

  const dirty = title.trim() !== '' || !bodyEmpty || files.length > 0;

  const requestClose = async () => {
    if (saving) return;
    if (dirty) {
      const discard = await confirm({
        title: '작성 중인 내용이 있습니다',
        description: '닫으면 입력한 내용이 사라집니다.',
        confirmLabel: '버리고 닫기',
        cancelLabel: '계속 작성',
      });
      if (!discard) return;
    }
    onClose();
  };

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    setFiles((current) => [...current, ...picked]);
    event.target.value = '';
  };

  const submit = async () => {
    if (title.trim() === '' || saving) return;
    setSaving(true);
    setError(null);
    try {
      const attachments = await Promise.all(files.map(fileToAttachment));
      const body = editor && !editor.isEmpty ? editor.getHTML() : '';
      await onSubmit({ title: title.trim(), body, columnId, attachments });
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '글을 등록하지 못했습니다.');
      setSaving(false);
    }
  };

  const surface = theme.palette.background.paper;

  return (
    <>
      <CommonDialog
        open={open}
        onClose={() => void requestClose()}
        title="새 글 작성"
        description={`${room.name}에 글을 올립니다.`}
        size="md"
        fullScreenOnMobile
        actions={
          <>
            <Button variant="contained" disabled={title.trim() === '' || saving} onClick={() => void submit()}>
              {saving ? '등록 중…' : '등록'}
            </Button>
            <Button disabled={saving} onClick={() => void requestClose()}>
              취소
            </Button>
          </>
        }
      >
        <Stack spacing={2}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <TextField
            label="제목"
            fullWidth
            size="small"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            slotProps={{ htmlInput: { 'aria-required': true, maxLength: 200 } }}
          />
          {room.columns.length > 0 ? (
            <TextField
              select
              label="상태"
              size="small"
              fullWidth
              value={columnId ?? ''}
              onChange={(event) => setColumnId(event.target.value)}
              slotProps={{ select: { native: true } }}
            >
              {room.columns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.name}
                </option>
              ))}
            </TextField>
          ) : null}
          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
            <RichTextEditorToolbar editor={editor} />
            <Box
              sx={{
                minHeight: 200,
                display: 'flex',
                backgroundColor: surface,
                '& .workspace-composer-editor': { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' },
              }}
            >
              <RichTextEditor
                key={session}
                content=""
                ariaLabel="글 내용"
                placeholder="내용을 입력하세요. 이미지는 붙여넣기나 끌어놓기로 넣을 수 있습니다."
                className="workspace-composer-editor"
                onEditorReady={setEditor}
                onContentChange={(current) => setBodyEmpty(current.isEmpty)}
                uploadImage={imageToEditorImage}
                onImageUploadError={setError}
                contentSx={{
                  display: 'block',
                  width: '100%',
                  minWidth: 0,
                  flex: 1,
                  minHeight: 200,
                  maxHeight: 360,
                  overflowY: 'auto',
                  px: 2,
                  py: 1.5,
                  color: theme.palette.text.primary,
                  backgroundColor: surface,
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </Box>
          </Box>
          <Stack spacing={1}>
            <Button component="label" size="small" variant="outlined" startIcon={<AttachFileOutlined />} sx={{ alignSelf: 'flex-start' }}>
              파일 첨부
              <input hidden multiple type="file" onChange={handleFiles} />
            </Button>
            <AttachmentList
              testId="workspace-composer-attachments"
              mode="edit"
              showImagePreview={false}
              files={files.map((file, index) => ({
                id: String(index),
                name: file.name,
                size: file.size,
                mimeType: file.type,
              }))}
              onRemove={(id) => setFiles((current) => current.filter((_, index) => String(index) !== id))}
            />
            <Typography variant="caption" color="text.secondary">
              백엔드 연동 전에는 1MB 이하 파일만 보관되어 내려받을 수 있습니다. 더 큰 파일은 이름과 크기만 기록됩니다.
            </Typography>
          </Stack>
        </Stack>
      </CommonDialog>
      {confirmDialog}
    </>
  );
}
