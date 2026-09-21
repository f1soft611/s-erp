import { Box } from '@mui/material';
import type { ReactNode } from 'react';

type ContentSplitLayoutProps = {
  left: ReactNode;
  right: ReactNode;
  rightTop?: number | string;
};

export function ContentSplitLayout({
  left,
  right,
  rightTop = 16,
}: ContentSplitLayoutProps) {
  return (
    <Box
      data-testid="view-mode-split-layout"
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          md: 'minmax(0, 1.7fr) minmax(260px, 0.9fr)',
        },
        gap: 2,
        alignItems: 'start',
      }}
    >
      <Box sx={{ minWidth: 0 }}>{left}</Box>
      <Box
        data-testid="view-mode-right-slot"
        sx={{
          minWidth: 0,
          position: 'sticky',
          top: rightTop,
          alignSelf: 'start',
        }}
      >
        {right}
      </Box>
    </Box>
  );
}
