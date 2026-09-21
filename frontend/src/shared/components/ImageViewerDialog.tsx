import { useEffect, useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
  Dialog,
  DialogContent,
  IconButton,
  Typography,
} from '@mui/material';

export type ImageViewerDialogProps = {
  open: boolean;
  src: string;
  alt?: string;
  onClose: () => void;
  title?: string;
};

export function ImageViewerDialog({
  open,
  src,
  alt = '원본 이미지',
  onClose,
  title = '이미지 보기',
}: ImageViewerDialogProps) {
  const [displaySrc, setDisplaySrc] = useState(src);

  useEffect(() => {
    setDisplaySrc(src);
    return undefined;
  }, [src]);

  if (!open || !src) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      aria-labelledby="image-viewer-dialog-title"
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2,
            overflow: 'hidden',
            bgcolor: '#0f172a',
            border: '1px solid rgba(148, 163, 184, 0.2)',
          },
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.25,
          borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
          backgroundColor: '#111827',
        }}
      >
        <Typography
          id="image-viewer-dialog-title"
          variant="subtitle1"
          sx={{ fontWeight: 700, color: '#e2e8f0' }}
        >
          {title}
        </Typography>
        <IconButton
          aria-label="이미지 뷰어 닫기"
          onClick={onClose}
          sx={{ color: '#e2e8f0' }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
          backgroundColor: '#0f172a',
          overflow: 'auto',
        }}
      >
        <Box
          component="img"
          src={displaySrc}
          alt={alt}
          role="img"
          aria-label={alt}
          sx={{
            display: 'block',
            maxWidth: '100%',
            maxHeight: '72vh',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
            borderRadius: 1,
            bgcolor: '#020617',
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
