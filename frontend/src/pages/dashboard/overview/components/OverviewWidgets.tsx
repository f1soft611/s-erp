import type { ReactNode } from 'react';
import { Alert, Box, Button, ButtonBase, Paper, Skeleton, Stack, Typography, alpha } from '@mui/material';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded';
import { formatNumber } from '../services/overview.service';

export function OverviewPanel({ title, caption, icon, action, children }: {
  title: string; caption?: string; icon: ReactNode; action?: ReactNode; children: ReactNode;
}) {
  return (
    <Paper component="section" aria-label={title} elevation={0} sx={{
      minWidth: 0, border: '1px solid', borderColor: 'divider', borderRadius: 3,
      overflow: 'hidden', bgcolor: 'background.paper', height: '100%',
    }}>
      <Stack direction="row" sx={{ px: { xs: 2, sm: 2.5 }, pt: 2.5, pb: 2, gap: 1.25, alignItems: 'center' }}>
        <Box sx={{ display: 'flex', color: 'primary.main', flexShrink: 0 }}>{icon}</Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography component="h2" sx={{ fontWeight: 750, fontSize: '0.95rem' }}>{title}</Typography>
          {caption && <Typography sx={{ mt: 0.4, fontSize: '0.73rem', color: 'text.secondary' }}>{caption}</Typography>}
        </Box>
        {action}
      </Stack>
      <Box sx={{ px: { xs: 2, sm: 2.5 }, pb: 2.5 }}>{children}</Box>
    </Paper>
  );
}

export function MetricCard({ label, value, unit, hint, icon, tone = 'primary', onClick }: {
  label: string; value: number; unit: string; hint: string; icon: ReactNode;
  tone?: 'primary' | 'success' | 'warning'; onClick: () => void;
}) {
  return (
    <ButtonBase onClick={onClick} aria-label={`${label} ${formatNumber(value)}${unit}`} sx={(theme) => ({
      display: 'flex', flexDirection: 'column', alignItems: 'stretch', textAlign: 'left',
      minWidth: 0, width: '100%', p: { xs: 2, sm: 2.5 }, borderRadius: 3,
      border: '1px solid', borderColor: theme.palette.divider, bgcolor: 'background.paper',
      transition: 'border-color 160ms, box-shadow 160ms',
      '&:hover': { borderColor: theme.palette[tone].main, boxShadow: `0 8px 24px ${alpha(theme.palette[tone].main, 0.09)}` },
      '&.Mui-focusVisible': { outline: `3px solid ${theme.palette[tone].main}`, outlineOffset: 3 },
      '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
    })}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography sx={{ fontSize: '0.81rem', fontWeight: 650, color: 'text.secondary' }}>{label}</Typography>
        <Box sx={(theme) => ({
          color: theme.palette[tone].main, bgcolor: alpha(theme.palette[tone].main, 0.1),
          borderRadius: 2, p: 0.85, display: 'flex', flexShrink: 0,
        })}>{icon}</Box>
      </Stack>
      <Typography component="div" sx={{
        mt: 1.5, mb: 1.5, fontSize: unit === '원' ? 'clamp(1.15rem, 1.55vw, 1.65rem)' : 'clamp(1.45rem, 2.3vw, 2rem)', fontWeight: 800,
        letterSpacing: '-0.045em', lineHeight: 1.25, overflowWrap: 'anywhere', fontVariantNumeric: 'tabular-nums',
      }}>
        {formatNumber(value)}
        <Typography component="span" sx={{ ml: 0.65, fontSize: '0.8rem', color: 'text.secondary', fontWeight: 500 }}>{unit}</Typography>
      </Typography>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, justifyContent: 'space-between' }}>
        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>{hint}</Typography>
        <ArrowForwardRounded sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
      </Stack>
    </ButtonBase>
  );
}

export function OverviewEmpty({ children }: { children: ReactNode }) {
  return (
    <Stack sx={{ minHeight: 142, alignItems: 'center', justifyContent: 'center', gap: 1.25, textAlign: 'center' }}>
      <CheckCircleOutlineRounded sx={{ fontSize: 30, color: 'text.disabled' }} />
      <Typography sx={{ fontSize: '0.83rem', color: 'text.secondary' }}>{children}</Typography>
    </Stack>
  );
}

export function OverviewError({ label, onRetry }: { label: string; onRetry: () => void }) {
  return (
    <Alert severity="warning" sx={{ borderRadius: 2, alignItems: 'center', '& .MuiAlert-message': { minWidth: 0 } }}>
      <Typography sx={{ fontSize: '0.82rem' }}>{label}{label.endsWith('현황') ? '을' : '를'} 불러오지 못했습니다.</Typography>
      <Button size="small" color="inherit" aria-label={`${label} 다시 조회`} onClick={onRetry} sx={{ mt: 0.75 }}>
        다시 조회
      </Button>
    </Alert>
  );
}

export function OverviewSkeleton() {
  return (
    <Box role="status" aria-label="종합현황 불러오는 중">
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3,minmax(0,1fr))' }, gap: 2 }}>
        {[1, 2, 3].map((key) => <Skeleton key={key} variant="rounded" height={165} sx={{ borderRadius: 3 }} />)}
      </Box>
      <Skeleton variant="rounded" height={240} sx={{ mt: 2, borderRadius: 3 }} />
    </Box>
  );
}
