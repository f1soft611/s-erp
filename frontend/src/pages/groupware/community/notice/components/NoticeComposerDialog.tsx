import { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  IconButton,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined';
import FormatBoldOutlinedIcon from '@mui/icons-material/FormatBoldOutlined';
import FormatItalicOutlinedIcon from '@mui/icons-material/FormatItalicOutlined';
import FormatUnderlinedOutlinedIcon from '@mui/icons-material/FormatUnderlinedOutlined';
import {
  F1Editor,
  createImagePasteExtension,
  createTableExtension,
  excelPasteExtension,
  fontSizeExtension,
  noticeEditorSchema,
} from '../../../../../shared/components/f1-editor';
import type { F1EditorDocument } from '../../../../../shared/components/f1-editor';

type NoticeComposerDialogProps = {
  open: boolean;
  isDark: boolean;
  onClose: () => void;
};

export function NoticeComposerDialog({
  open,
  isDark,
  onClose,
}: NoticeComposerDialogProps) {
  const [doc, setDoc] = useState<F1EditorDocument>(
    noticeEditorSchema.defaultDocument,
  );

  const editorExtensions = [
    createImagePasteExtension(async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/uploads/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('이미지 업로드 실패');
      }

      const payload = await response.json();
      return payload.url as string;
    }),
    excelPasteExtension,
    fontSizeExtension,
    createTableExtension(),
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            width: 'min(820px, calc(100vw - 48px))',
            maxWidth: '820px',
            height: 'min(90vh, 880px)',
            maxHeight: 'calc(100vh - 32px)',
            borderRadius: 3,
            overflow: 'hidden',
            backgroundColor: isDark ? '#0f172a' : '#ffffff',
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: isDark ? '#0f172a' : '#f8fafc',
          minHeight: 0,
          width: '100%',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2.5,
            py: 2,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            새 공지 작성
          </Typography>
          <IconButton onClick={onClose} size="small" aria-label="닫기">
            <CloseIcon />
          </IconButton>
        </Box>

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            px: 2.5,
            pb: 0,
          }}
        >
          <F1Editor
            schema={noticeEditorSchema}
            value={doc}
            onChange={setDoc}
            onSubmit={(nextDoc: F1EditorDocument) => {
              console.log('submit notice doc:', nextDoc);
              onClose();
            }}
            extensions={editorExtensions}
            toolbar={false}
            showFooterActions={false}
          />
        </Box>

        <DialogActions
          sx={{
            alignItems: 'center',
            bgcolor: isDark ? '#0f172a' : '#ffffff',
            borderColor: 'divider',
            borderTop: 1,
            borderBottom: 0,
            flexShrink: 0,
            gap: 1,
            justifyContent: 'space-between',
            px: 2.5,
            py: 1.25,
            width: '100%',
            boxSizing: 'border-box',
            mx: 0,
            ml: 0,
            mr: 0,
            borderRadius: 0,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              size="small"
              aria-label="굵게"
              sx={{
                border: '1px solid rgba(148, 163, 184, 0.35)',
                borderRadius: 1,
                width: 32,
                height: 32,
                bgcolor: 'background.paper',
              }}
            >
              <FormatBoldOutlinedIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              aria-label="기울임"
              sx={{
                border: '1px solid rgba(148, 163, 184, 0.35)',
                borderRadius: 1,
                width: 32,
                height: 32,
                bgcolor: 'background.paper',
              }}
            >
              <FormatItalicOutlinedIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              aria-label="밑줄"
              sx={{
                border: '1px solid rgba(148, 163, 184, 0.35)',
                borderRadius: 1,
                width: 32,
                height: 32,
                bgcolor: 'background.paper',
              }}
            >
              <FormatUnderlinedOutlinedIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              aria-label="첨부 파일"
              sx={{
                border: '1px solid rgba(148, 163, 184, 0.35)',
                borderRadius: 1,
                width: 32,
                height: 32,
                bgcolor: 'background.paper',
              }}
            >
              <AttachFileOutlinedIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box sx={{ display: 'flex', flexShrink: 0, gap: 1 }}>
            <Button
              variant="contained"
              onClick={() => {
                console.log('submit notice doc:', doc);
                onClose();
              }}
              sx={{ minWidth: 96, fontWeight: 700 }}
            >
              등록
            </Button>
            <Button onClick={onClose} sx={{ minWidth: 96, fontWeight: 600 }}>
              취소
            </Button>
          </Box>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
