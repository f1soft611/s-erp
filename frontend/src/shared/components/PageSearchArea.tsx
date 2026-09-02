import { useState, type ReactNode } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import KeyboardArrowUpRoundedIcon from '@mui/icons-material/KeyboardArrowUpRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';

export type PageSearchAreaProps = {
  children: ReactNode;
  defaultCollapsed?: boolean;
};

export function PageSearchArea({
  children,
  defaultCollapsed = false,
}: PageSearchAreaProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <Box
      sx={(theme) => ({
        px: 3,
        py: collapsed ? 1.25 : 2,
        borderBottom: `1px solid ${theme.palette.divider}`,
        bgcolor:
          theme.palette.mode === 'dark'
            ? 'rgba(15, 23, 42, 0.72)'
            : 'rgba(148, 163, 184, 0.03)',
        backdropFilter: 'blur(8px)',
        transition: 'all 0.2s ease',
      })}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          mb: collapsed ? 0 : 1.5,
          color: 'primary.main',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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

        <IconButton
          type="button"
          size="small"
          aria-label={collapsed ? '검색 조건 열기' : '검색 조건 접기'}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((current) => !current)}
          sx={{
            color: 'text.secondary',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          {collapsed ? (
            <KeyboardArrowDownRoundedIcon fontSize="small" />
          ) : (
            <KeyboardArrowUpRoundedIcon fontSize="small" />
          )}
        </IconButton>
      </Box>

      {!collapsed && (
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'stretch',
            gap: 1.5,
            pt: 0.25,
          }}
        >
          {children}
        </Box>
      )}
    </Box>
  );
}
