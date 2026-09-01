import type { ReactNode } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import {
  PermissionGroupActionBar,
  type PermissionActionGroupDefinition,
} from './PermissionGroup';

export type PageHeaderProps = {
  breadcrumbItems: string[];
  description: string;
  actionGroups?: PermissionActionGroupDefinition[];
  children?: ReactNode;
};

export function PageHeader({
  breadcrumbItems,
  description,
  actionGroups,
  children,
}: PageHeaderProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const breadcrumbText = breadcrumbItems.join(' > ');

  const breadcrumbBlock = (
    <Box>
      <Typography
        variant="overline"
        sx={{ color: '#64748b', letterSpacing: 1.4, display: 'block' }}
      >
        <Box
          component="span"
          aria-hidden="true"
          sx={{
            position: 'absolute',
            width: 1,
            height: 1,
            p: 0,
            m: 0,
            overflow: 'hidden',
            clip: 'rect(0 0 0 0)',
            clipPath: 'inset(50%)',
            whiteSpace: 'nowrap',
          }}
        >
          {breadcrumbText}
        </Box>
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          return (
            <Box
              component="span"
              key={`${item}-${index}`}
              sx={
                isLast
                  ? { color: 'text.primary', fontWeight: 800 }
                  : { color: 'text.secondary' }
              }
            >
              {index > 0 ? ' > ' : ''}
              {item}
            </Box>
          );
        })}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {description}
      </Typography>
    </Box>
  );

  return (
    <Box
      sx={{
        px: 3,
        py: 2,
        borderBottom: '1px solid rgba(148,163,184,0.18)',
        bgcolor: isDark
          ? 'rgba(15, 23, 42, 0.75)'
          : 'rgba(255, 255, 255, 0.72)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {actionGroups ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          {breadcrumbBlock}
          <PermissionGroupActionBar groups={actionGroups} />
        </Box>
      ) : (
        breadcrumbBlock
      )}
      {children}
    </Box>
  );
}
