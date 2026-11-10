import { Alert, Box, type AlertProps } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';

export type PageMessageHorizontalPadding = 'grid' | 'none';

type PageMessageAreaProps = {
  message: string;
  onClose?: () => void;
  severity?: AlertProps['severity'];
  action?: ReactNode;
  role?: 'alert' | 'status';
  compact?: boolean;
  horizontalPadding?: PageMessageHorizontalPadding;
};

function normalizePageMessage(message: string): string {
  const lines = message
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const deduped: string[] = [];
  for (const line of lines) {
    const previous = deduped[deduped.length - 1];
    if (previous === line) {
      continue;
    }
    deduped.push(line);
  }

  return deduped.join('\n');
}

export function PageMessageArea({
  message,
  onClose,
  severity = 'error',
  action,
  role = 'alert',
  compact = false,
  horizontalPadding,
}: PageMessageAreaProps) {
  const normalizedMessage = normalizePageMessage(message);

  if (!normalizedMessage) return null;

  return (
    <Box
      sx={{
        px:
          horizontalPadding === 'grid'
            ? { xs: 1, sm: 2 }
            : horizontalPadding === 'none'
              ? 0
              : { xs: 1.5, sm: 3 },
        pt: compact ? 1 : 2,
        pb: compact ? 1 : 2,
        '& + .MuiBox-root': { pt: 0 },
      }}
    >
      <Alert
        severity={severity}
        onClose={onClose}
        action={action}
        role={role}
        sx={(theme) => ({
          ...(severity === 'info' && {
            backgroundColor: alpha(
              theme.palette.info.main,
              theme.palette.mode === 'dark' ? 0.24 : 0.16,
            ),
          }),
          overflowWrap: 'anywhere',
          whiteSpace: 'pre-line',
          ...(action && {
            flexWrap: 'wrap',
            '& .MuiAlert-message': { flex: '1 1 240px', minWidth: 0 },
            '& .MuiAlert-action': { m: 0, p: 0, alignSelf: 'center' },
          }),
        })}
      >
        {normalizedMessage}
      </Alert>
    </Box>
  );
}
