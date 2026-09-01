import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';

export type PageSearchAreaProps = {
  children: ReactNode;
};

export function PageSearchArea({ children }: PageSearchAreaProps) {
  return (
    <Box
      sx={{
        px: 3,
        py: 2,
        borderBottom: '1px solid rgba(148,163,184,0.18)',
        bgcolor: 'rgba(148, 163, 184, 0.03)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 1.5,
          color: 'primary.main',
        }}
      >
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'primary.main',
            color: '#fff',
            boxShadow: '0 8px 16px rgba(59,130,246,0.2)',
          }}
        >
          <SearchRoundedIcon fontSize="small" />
        </Box>
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 800, letterSpacing: 0.2 }}
        >
          검색 조건
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          gap: 1.5,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
