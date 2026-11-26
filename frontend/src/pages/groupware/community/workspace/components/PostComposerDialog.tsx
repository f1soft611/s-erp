import { useEffect, useRef, useState, type ChangeEvent, type ClipboardEvent, type DragEvent } from 'react';
import AttachFileOutlined from '@mui/icons-material/AttachFileOutlined';
import type { Editor } from '@tiptap/react';
import { Alert, Box, Button, IconButton, Stack, TextField, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { CommonDialog } from '../../../../../shared/components/CommonDialog';
import { AttachmentList } from '../../../../../shared/components/feed/AttachmentList';
import { RichTextEditor, RichTextEditorToolbar } from '../../../../../shared/components/rich-text-editor/RichTextEditor';
import { richTextEditorIconButtonSx } from '../../../../../shared/components/rich-text-editor/richTextEditorToolbarStyles';
import { useCommonConfirmDialog } from '../../../../../shared/hooks/useCommonConfirmDialog';
import { fileToAttachment } from '../data/workspaceFiles';
import type { NewPostInput } from '../hooks/useWorkspacePosts';
import type { WorkspaceAttachment, WorkspacePost, WorkspaceRoom } from '../types/workspace.types';

type PostComposerDialogProps = {
  open: boolean;
  room: WorkspaceRoom;
  /** 지정하면 이 글을 수정하는 작성창으로 열린다. */
  post?: WorkspacePost | null;
  onClose: () => void;
  onSubmit: (input: NewPostInput) => Promise<unknown>;
};

const IMAGE_BLOCKED_MESSAGE = '본문에는 이미지를 넣을 수 없습니다. 파일 첨부를 이용해 주세요.';

// 에디터 이미지 붙여넣기·끌어놓기는 제한한다(이미지는 파일 첨부로만 올린다).
function hasImageFile(data: DataTransfer | null) {
  return (
    Array.from(data?.items ?? []).some((item) => item.kind === 'file' && item.type.startsWith('image/')) ||
    Array.from(data?.files ?? []).some((file) => file.type.startsWith('image/'))
  );
}

export function PostComposerDialog({ open, room, post = null, onClose, onSubmit }: PostComposerDialogProps) {
  const theme = useTheme();
  const [title, setTitle] = useState('');
  const [columnId, setColumnId] = useState<string | null>(room.columns[0]?.id ?? null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [bodyEmpty, setBodyEmpty] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  // 수정할 때 이미 올라가 있던 첨부. 삭제하면 저장 시 빠진다.
  const [keptAttachments, setKeptAttachments] = useState<WorkspaceAttachment[]>([]);
  const [touched, setTouched] = useState(false);
  const isEdit = post !== null;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 열 때마다 에디터를 새로 만들어 이전 내용이 남지 않게 한다.
  const [session, setSession] = useState(0);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const { confirm, dialog: confirmDialog } = useCommonConfirmDialog();

  useEffect(() => {
    if (!open) return;
    setTitle(post?.title ?? '');
    setColumnId(post?.columnId ?? room.columns[0]?.id ?? null);
    setBodyEmpty(!post?.body);
    setFiles([]);
    setKeptAttachments(post?.attachments ?? []);
    setTouched(false);
    setSaving(false);
    setError(null);
    setSession((current) => current + 1);
  }, [open, room, post]);

  const dirty = isEdit ? touched : title.trim() !== '' || !bodyEmpty || files.length > 0;

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
    setTouched(true);
    event.target.value = '';
  };

  const blockImagePaste = (event: ClipboardEvent<HTMLElement>) => {
    if (!hasImageFile(event.clipboardData)) return;
    event.preventDefault();
    event.stopPropagation();
    setError(IMAGE_BLOCKED_MESSAGE);
  };

  const blockFileDrop = (event: DragEvent<HTMLElement>) => {
    if (!Array.from(event.dataTransfer?.types ?? []).includes('Files')) return;
    event.preventDefault();
    if (event.type === 'drop') setError(IMAGE_BLOCKED_MESSAGE);
  };

  const submit = async () => {
    if (title.trim() === '' || saving) return;
    setSaving(true);
    setError(null);
    try {
      const attachments = await Promise.all(files.map(fileToAttachment));
      const body = editor && !editor.isEmpty ? editor.getHTML() : '';
      await onSubmit({ title: title.trim(), body, columnId, attachments: [...keptAttachments, ...attachments] });
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '글을 등록하지 못했습니다.');
      setSaving(false);
    }
  };

  const surface = theme.palette.background.paper;

  const footerStart = (
    <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 1 }}>
      <RichTextEditorToolbar editor={editor} panelTestId="workspace-composer-toolbar-popup" />
      <IconButton
        size="small"
        aria-label="첨부 링크"
        disabled={saving}
        onClick={() => attachmentInputRef.current?.click()}
        sx={richTextEditorIconButtonSx}
      >
        <AttachFileOutlined fontSize="small" />
      </IconButton>
      <input
        ref={attachmentInputRef}
        hidden
        multiple
        type="file"
        aria-label="첨부 파일 선택"
        disabled={saving}
        onChange={handleFiles}
      />
    </Box>
  );

  return (
    <>
      <CommonDialog
        open={open}
        onClose={() => void requestClose()}
        title={isEdit ? '글 수정' : '새 글 작성'}
        description={isEdit ? `${room.name}의 글을 수정합니다.` : `${room.name}에 글을 올립니다.`}
        size="md"
        fullScreenOnMobile
        footerStart={footerStart}
        actions={
          <>
            <Button variant="contained" disabled={title.trim() === '' || saving} onClick={() => void submit()}>
              {saving ? (isEdit ? '저장 중…' : '등록 중…') : isEdit ? '저장' : '등록'}
            </Button>
            <Button disabled={saving} onClick={() => void requestClose()}>
              취소
            </Button>
          </>
        }
        dialogProps={{ 'data-testid': 'workspace-composer-dialog-root' }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <Box
            sx={{
              display: 'grid',
              gap: 1,
              flexShrink: 0,
              gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: room.columns.length > 0 ? 'minmax(0, 1fr) 180px' : 'minmax(0, 1fr)' },
            }}
          >
          <TextField
            label="제목"
            fullWidth
            size="small"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setTouched(true);
            }}
            slotProps={{ htmlInput: { 'aria-required': true, maxLength: 200 } }}
            sx={{ flexShrink: 0 }}
          />
          {room.columns.length > 0 ? (
            <TextField
              select
              label="상태"
              size="small"
              fullWidth
              value={columnId ?? ''}
              onChange={(event) => {
                setColumnId(event.target.value);
                setTouched(true);
              }}
              slotProps={{ select: { native: true } }}
              sx={{ flexShrink: 0 }}
            >
              {room.columns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.name}
                </option>
              ))}
            </TextField>
          ) : null}
          </Box>
          <Box
            // 첫 줄이 아닌 빈 곳을 눌러도 입력할 수 있게 마지막 위치로 포커스를 옮긴다.
            onMouseDown={(event) => {
              const target = event.target as HTMLElement;
              if (!editor || target.closest('.ProseMirror')) return;
              event.preventDefault();
              editor.chain().focus('end').run();
            }}
            onPasteCapture={blockImagePaste}
            onDragOver={blockFileDrop}
            onDrop={blockFileDrop}
            sx={{
              minHeight: 200,
              display: 'flex',
              borderTop: 1,
              borderColor: 'divider',
              backgroundColor: surface,
              cursor: 'text',
              '& .workspace-composer-editor': { flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' },
              // 입력 영역이 첫 줄 높이로 줄어들지 않고 박스 전체를 채운다.
              '& .workspace-composer-editor .ProseMirror': { minHeight: 176, outline: 'none' },
            }}
          >
            <RichTextEditor
              key={session}
              content={post?.body || ''}
              ariaLabel="글 내용"
              placeholder="내용을 입력하세요."
              className="workspace-composer-editor"
              onEditorReady={setEditor}
              onContentChange={(current) => {
                setBodyEmpty(current.isEmpty);
                setTouched(true);
              }}
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
          {keptAttachments.length + files.length > 0 ? (
            <Stack spacing={0.5} sx={{ flexShrink: 0 }}>
              <AttachmentList
                testId="workspace-composer-attachments"
                mode="edit"
                showImagePreview={false}
                files={[
                  ...keptAttachments.map((attachment, index) => ({
                    id: `kept-${index}`,
                    name: attachment.name,
                    size: attachment.size,
                    mimeType: attachment.type,
                  })),
                  ...files.map((file, index) => ({
                    id: `new-${index}`,
                    name: file.name,
                    size: file.size,
                    mimeType: file.type,
                  })),
                ]}
                onRemove={(id) => {
                  setTouched(true);
                  if (id.startsWith('kept-')) {
                    setKeptAttachments((current) => current.filter((_, index) => `kept-${index}` !== id));
                  } else {
                    setFiles((current) => current.filter((_, index) => `new-${index}` !== id));
                  }
                }}
              />
              <Typography variant="caption" color="text.secondary">
                백엔드 연동 전에는 1MB 이하 파일만 보관되어 내려받을 수 있습니다. 더 큰 파일은 이름과 크기만 기록됩니다.
              </Typography>
            </Stack>
          ) : null}
        </Box>
      </CommonDialog>
      {confirmDialog}
    </>
  );
}
