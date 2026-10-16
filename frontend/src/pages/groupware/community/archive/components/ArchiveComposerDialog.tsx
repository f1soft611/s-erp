import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import type {
  ArchiveAttachment,
  ArchiveCategory,
  ArchiveId,
  ArchivePost,
  ArchivePostSavePayload,
} from '../types/archive.types';
import type { ArchiveSaveResult } from '../hooks/useArchiveMutations';

type ArchiveComposerDialogProps = {
  open: boolean;
  post: ArchivePost | null;
  categories: ArchiveCategory[];
  isSaving: boolean;
  onClose: () => void;
  onSave: (
    postId: ArchiveId | null,
    payload: ArchivePostSavePayload,
    files: File[],
    removedAttachments: ArchiveAttachment[],
  ) => Promise<ArchiveSaveResult>;
};

export function ArchiveComposerDialog({
  open,
  post,
  categories,
  isSaving,
  onClose,
  onSave,
}: ArchiveComposerDialogProps) {
  const [postId, setPostId] = useState<ArchiveId | null>(post?.postId ?? null);
  const [title, setTitle] = useState(post?.title ?? '');
  const [contents, setContents] = useState(post?.contents ?? '');
  const [categoryCode, setCategoryCode] = useState(post?.categoryCode ?? '');
  const [files, setFiles] = useState<File[]>([]);
  const [attachments, setAttachments] = useState<ArchiveAttachment[]>(
    post?.attachments ?? [],
  );
  const [removedAttachments, setRemovedAttachments] = useState<
    ArchiveAttachment[]
  >([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setPostId(post?.postId ?? null);
    setTitle(post?.title ?? '');
    setContents(post?.contents ?? '');
    setCategoryCode(post?.categoryCode ?? '');
    setFiles([]);
    setAttachments(post?.attachments ?? []);
    setRemovedAttachments([]);
    setError('');
  }, [open, post]);

  const handleSave = async () => {
    setError('');
    const result = await onSave(
      postId,
      { title: title.trim(), contents, categoryCode },
      files,
      removedAttachments,
    );
    if (result.postId != null) setPostId(result.postId);
    if (!result.success) {
      const failedIds = new Set(
        result.failedRemovals.map((attachment) => attachment.boardFileId),
      );
      setRemovedAttachments(result.failedRemovals);
      setAttachments((current) =>
        current.filter(
          (attachment) =>
            !removedAttachments.some(
              (removed) => removed.boardFileId === attachment.boardFileId,
            ) || failedIds.has(attachment.boardFileId),
        ),
      );
      setFiles(result.failedUploads);
      setError(result.error ?? '저장 중 일부 작업에 실패했습니다.');
      return;
    }
    onClose();
  };

  const handleFileChange = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    setFiles((current) => [...current, ...Array.from(selectedFiles)]);
  };

  const removeAttachment = (attachment: ArchiveAttachment) => {
    setRemovedAttachments((current) => [...current, attachment]);
    setAttachments((current) =>
      current.filter((item) => item.boardFileId !== attachment.boardFileId),
    );
  };

  const restoreAttachment = (attachment: ArchiveAttachment) => {
    setRemovedAttachments((current) =>
      current.filter((item) => item.boardFileId !== attachment.boardFileId),
    );
    setAttachments((current) => [...current, attachment]);
  };

  return (
    <Dialog
      open={open}
      onClose={isSaving ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="archive-composer-title"
    >
      <DialogTitle id="archive-composer-title">
        {post ? '자료 수정' : '자료 등록'}
        <IconButton
          type="button"
          aria-label="작성 닫기"
          onClick={onClose}
          disabled={isSaving}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseOutlined />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="제목"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={isSaving}
            required
            fullWidth
            slotProps={{ htmlInput: { maxLength: 200 } }}
          />
          <FormControl fullWidth required disabled={isSaving}>
            <InputLabel id="archive-composer-category-label">자료 분류</InputLabel>
            <Select
              labelId="archive-composer-category-label"
              label="자료 분류"
              value={categoryCode}
              onChange={(event) => setCategoryCode(event.target.value)}
              disabled={isSaving}
            >
              {categories.map((category) => (
                <MenuItem key={category.code} value={category.code}>
                  {category.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="설명"
            value={contents}
            onChange={(event) => setContents(event.target.value)}
            disabled={isSaving}
            multiline
            minRows={5}
            fullWidth
            required
          />
          <Box>
            <Button
              component="label"
              variant="outlined"
              disabled={isSaving}
            >
              파일 추가
              <input
                aria-label="첨부파일 추가"
                type="file"
                multiple
                hidden
                disabled={isSaving}
                onChange={(event) => {
                  handleFileChange(event.target.files);
                  event.target.value = '';
                }}
              />
            </Button>
            {attachments.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="subtitle2">기존 첨부파일</Typography>
                {attachments.map((attachment) => (
                  <Stack
                    key={attachment.boardFileId}
                    direction="row"
                    sx={{
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1,
                    }}
                  >
                    <Typography sx={{ overflowWrap: 'anywhere' }}>
                      {attachment.fileName}
                    </Typography>
                    <Button
                      type="button"
                      size="small"
                      color="error"
                      onClick={() => removeAttachment(attachment)}
                      disabled={isSaving}
                    >
                      제거
                    </Button>
                  </Stack>
                ))}
              </Box>
            )}
            {removedAttachments.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="subtitle2">제거 예정</Typography>
                {removedAttachments.map((attachment) => (
                  <Stack
                    key={attachment.boardFileId}
                    direction="row"
                    sx={{
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1,
                    }}
                  >
                    <Typography sx={{ overflowWrap: 'anywhere' }}>
                      {attachment.fileName}
                    </Typography>
                    <Button
                      type="button"
                      size="small"
                      onClick={() => restoreAttachment(attachment)}
                      disabled={isSaving}
                    >
                      복원
                    </Button>
                  </Stack>
                ))}
              </Box>
            )}
            {files.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="subtitle2">추가할 파일</Typography>
                {files.map((file, index) => (
                  <Stack
                    key={`${file.name}-${file.lastModified}-${index}`}
                    direction="row"
                    sx={{
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1,
                    }}
                  >
                    <Typography sx={{ overflowWrap: 'anywhere' }}>
                      {file.name}
                    </Typography>
                    <Button
                      type="button"
                      size="small"
                      disabled={isSaving}
                      onClick={() =>
                        setFiles((current) =>
                          current.filter((_, fileIndex) => fileIndex !== index),
                        )
                      }
                    >
                      제외
                    </Button>
                  </Stack>
                ))}
              </Box>
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap', px: 2, py: 1.5 }}>
        <Button type="button" onClick={onClose} disabled={isSaving}>
          취소
        </Button>
        <Button
          type="button"
          variant="contained"
          onClick={() => void handleSave()}
          disabled={
            isSaving ||
            !title.trim() ||
            !contents.trim() ||
            !categories.some((category) => category.code === categoryCode)
          }
        >
          {isSaving ? '저장 중…' : '저장'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
