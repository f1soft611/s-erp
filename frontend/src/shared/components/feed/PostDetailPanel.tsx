import { Box, IconButton, Paper, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { ReactNode } from 'react';

type PostDetailPanelProps = {
  title?: string;
  onClose: () => void;
  children: ReactNode;
};

export function PostDetailPanel({
  title = '게시글 상세',
  onClose,
  children,
}: PostDetailPanelProps) {
  return (
    <Paper
      component="section"
      aria-label={title}
      data-testid="post-detail-panel"
      data-layout="full-height-overlay"
      elevation={0}
      sx={{
        width: '100%',
        height: '100%',
        minHeight: 0,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 0,
        bgcolor: 'background.paper',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          px: 1.5,
          py: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <IconButton size="small" aria-label="상세 닫기" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      <Box
        data-testid="post-detail-panel-content"
        data-scroll-container="true"
        sx={{
          minWidth: 0,
          minHeight: 0,
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          p: 1.5,
        }}
      >
        {children}
      </Box>
    </Paper>
  );
}
