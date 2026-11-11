import { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { CommonDialog } from './CommonDialog';

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
  const theme = useTheme();
  const checkerColor = alpha(
    theme.palette.text.primary,
    theme.palette.mode === 'dark' ? 0.12 : 0.08,
  );

  useEffect(() => {
    setDisplaySrc(src);
    return undefined;
  }, [src]);

  if (!open || !src) {
    return null;
  }

  return (
    <CommonDialog
      open={open}
      onClose={onClose}
      title={title}
      titleId="image-viewer-dialog-title"
      closeButtonLabel="이미지 뷰어 닫기"
      size="xl"
      bodyMode="fill"
      paperHeight="90vh"
      surfaceBackgroundColor={theme.palette.background.paper}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: 0,
          p: 1.5,
          backgroundColor: 'background.default',
          overflow: 'auto',
        }}
      >
        <Box
          data-testid="image-viewer-canvas"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            minHeight: 'min(30vh, 200px)',
            maxHeight: '72vh',
            overflow: 'auto',
            backgroundColor: 'background.default',
            backgroundImage: `repeating-conic-gradient(${checkerColor} 0% 25%, transparent 0% 50%)`,
            backgroundSize: '16px 16px',
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
            }}
          />
        </Box>
      </Box>
    </CommonDialog>
  );
}
