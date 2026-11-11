import { useEffect, useState } from 'react';
import { AppSaveButton } from '../../../../../shared/components/AppSaveButton';
import { CommonDialog } from '../../../../../shared/components/CommonDialog';
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import type {
  ArchiveCategory,
  ArchiveFileRow,
  ArchiveFileUpdatePayload,
} from '../types/archive.types';

type ArchiveFileEditDialogProps = {
  file: ArchiveFileRow | null;
  categories: ArchiveCategory[];
  saving: boolean;
  onClose: () => void;
  onSave: (
    file: ArchiveFileRow,
    payload: ArchiveFileUpdatePayload,
  ) => Promise<ArchiveFileRow | null>;
};

export function ArchiveFileEditDialog({
  file,
  categories,
  saving,
  onClose,
  onSave,
}: ArchiveFileEditDialogProps) {
  const [fileName, setFileName] = useState('');
  const [folderCode, setFolderCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setFileName(file?.fileName ?? '');
    setFolderCode(file?.categoryCode ?? '');
    setError('');
  }, [file]);

  const handleSave = async () => {
    if (!file) return;
    const normalizedName = fileName.trim();
    if (!normalizedName || normalizedName.length > 200) {
      setError('파일명을 1자 이상 200자 이하로 입력해 주세요.');
      return;
    }

    try {
      const updated = await onSave(file, {
        postId: file.postId,
        fileName: normalizedName,
        folderCode: folderCode || null,
      });
      if (updated) onClose();
      else setError('파일 정보를 저장하지 못했습니다. 다시 시도해 주세요.');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : '파일 정보를 저장하지 못했습니다. 다시 시도해 주세요.',
      );
    }
  };

  return (
    <CommonDialog
      open={file !== null}
      onClose={() => {
        if (!saving) onClose();
      }}
      title="파일 정보 수정"
      titleId="archive-file-edit-title"
      size="sm"
      actions={
        <>
          <AppSaveButton
            variant="contained"
            saving={saving}
            onClick={() => void handleSave()}
            disabled={saving}
          >
            저장
          </AppSaveButton>
          <Button onClick={onClose} disabled={saving}>
            취소
          </Button>
        </>
      }
    >
      <Box sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          autoFocus
          label="파일명"
          value={fileName}
          onChange={(event) => setFileName(event.target.value)}
          slotProps={{ htmlInput: { maxLength: 200 } }}
          disabled={saving}
        />
        <FormControl fullWidth>
          <InputLabel id="archive-edit-folder-label">저장 폴더</InputLabel>
          <Select
            labelId="archive-edit-folder-label"
            label="저장 폴더"
            value={folderCode}
            onChange={(event) => setFolderCode(event.target.value)}
            disabled={saving}
            inputProps={{ 'aria-label': '저장 폴더' }}
          >
            <MenuItem value="">루트</MenuItem>
            {categories
              .filter((category) => category.active)
              .map((category) => (
                <MenuItem key={category.code} value={category.code}>
                  {category.name}
                </MenuItem>
              ))}
          </Select>
        </FormControl>
      </Box>
    </CommonDialog>
  );
}
