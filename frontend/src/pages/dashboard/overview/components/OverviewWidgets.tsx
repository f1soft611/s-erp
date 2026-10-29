import type { ReactNode } from 'react';
import { Alert, Box, Button, ButtonBase, Paper, Skeleton, Stack, Typography, alpha } from '@mui/material';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import { formatNumber } from '../services/overview.service';

function SkeletonText({ children, width }: { children: ReactNode; width?: string }) {
  return <Skeleton width={width}><span>{children}</span></Skeleton>;
}

export function OverviewPanel({ title, caption, icon, action, children, loading = false, focus = false, footer }: {
  title: string; caption?: string; icon: ReactNode; action?: ReactNode; children: ReactNode;
  loading?: boolean;
  focus?: boolean; footer?: ReactNode;
}) {
  return (
    <Paper component="section" aria-label={title} elevation={0} sx={{
      minWidth: 0, border: '1px solid', borderColor: 'divider', borderRadius: 3,
      overflow: 'hidden', bgcolor: 'background.paper', height: '100%', display: 'flex', flexDirection: 'column',
    }}>
      <Stack direction="row" sx={{ px: { xs: 2, sm: 2.5 }, pt: 2.5, pb: 2, gap: 1.25, alignItems: 'center' }}>
        <Box sx={(theme) => ({
          display: 'flex', color: 'primary.main', flexShrink: 0,
          ...(focus && { p: 1.1, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.09) }),
        })}>
          {loading ? <Skeleton variant="rounded" width={20} height={20} /> : icon}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography component="h2" sx={{ fontWeight: 750, fontSize: '0.95rem' }}>
            {loading ? <SkeletonText width="75%">{title}</SkeletonText> : title}
          </Typography>
          {caption && <Typography sx={{ mt: 0.4, fontSize: '0.73rem', color: 'text.secondary' }}>
            {loading ? <SkeletonText>{caption}</SkeletonText> : caption}
          </Typography>}
        </Box>
        {action}
      </Stack>
      <Box sx={{ px: focus ? 1.75 : { xs: 2, sm: 2.5 }, pb: focus ? 1.75 : 2.5, flex: 1 }}>{children}</Box>
      {footer && <Stack direction="row" sx={{
        px: { xs: 2, sm: 2.5 }, py: 1.25, borderTop: '1px solid', borderColor: 'divider',
        justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap',
        '& > .MuiTypography-root': { fontSize: '0.68rem', color: 'text.secondary' },
      }}>{footer}</Stack>}
    </Paper>
  );
}

export function OverviewListRow({ children, onClick, label, notice = false, pinned = false, loading = false }: {
  children: ReactNode; onClick?: () => void; label?: string; notice?: boolean; pinned?: boolean; loading?: boolean;
}) {
  return (
    <ButtonBase onClick={onClick} aria-label={label} disabled={loading} sx={(theme) => ({
      width: '100%', minWidth: 0, display: 'flex', alignItems: 'center', gap: 1.5, textAlign: 'left',
      p: { xs: 1.5, sm: 1.75 }, borderRadius: 2.5, border: '1px solid',
      borderColor: notice && !pinned ? 'transparent' : 'divider',
      bgcolor: pinned ? 'action.hover' : 'background.paper',
      ...(notice && !pinned && { '& + &': { borderTopColor: 'divider' } }),
      '&:hover': { bgcolor: 'action.hover', borderColor: theme.palette.primary.main },
      '&.Mui-focusVisible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: -2 },
    })}>
      {children}
      {loading ? <Skeleton variant="circular" width={18} height={18} sx={{ flexShrink: 0 }} />
        : <ChevronRightRounded sx={{ fontSize: 20, color: 'text.secondary', flexShrink: 0 }} />}
    </ButtonBase>
  );
}

export function MetricCard({ label, value, unit, hint, icon, tone = 'primary', onClick, loading = false }: {
  label: string; value: number; unit: string; hint: string; icon: ReactNode;
  tone?: 'primary' | 'success' | 'warning'; onClick: () => void;
  loading?: boolean;
}) {
  return (
    <ButtonBase onClick={onClick} disabled={loading} data-testid={loading ? 'metric-skeleton' : undefined}
      aria-label={loading ? undefined : `${label} ${formatNumber(value)}${unit}`} sx={(theme) => ({
      display: 'flex', flexDirection: 'column', alignItems: 'stretch', textAlign: 'left',
      minWidth: 0, width: '100%', p: { xs: 2, sm: 2.5 }, borderRadius: 3,
      border: '1px solid', borderColor: theme.palette.divider, bgcolor: 'background.paper',
      transition: 'border-color 160ms, box-shadow 160ms',
      '&:hover': { borderColor: theme.palette[tone].main, boxShadow: `0 8px 24px ${alpha(theme.palette[tone].main, 0.09)}` },
      '&.Mui-focusVisible': { outline: `3px solid ${theme.palette[tone].main}`, outlineOffset: 3 },
      '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
    })}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography sx={{ fontSize: '0.81rem', fontWeight: 650, color: 'text.secondary' }}>
          {loading ? <SkeletonText>{label}</SkeletonText> : label}
        </Typography>
        <Box sx={(theme) => ({
          color: theme.palette[tone].main, bgcolor: alpha(theme.palette[tone].main, 0.1),
          borderRadius: 2, p: 0.85, display: 'flex', flexShrink: 0,
        })}>{loading ? <Skeleton variant="rounded" width={20} height={20} /> : icon}</Box>
      </Stack>
      <Typography component="div" sx={{
        mt: 1.5, mb: 1.5, fontSize: unit === '원' ? 'clamp(1.15rem, 1.55vw, 1.65rem)' : 'clamp(1.45rem, 2.3vw, 2rem)', fontWeight: 800,
        letterSpacing: '-0.045em', lineHeight: 1.25, overflowWrap: 'anywhere', fontVariantNumeric: 'tabular-nums',
      }}>
        {loading ? <Skeleton width={unit === '원' ? '100%' : '65%'} sx={{ transform: 'none' }}>
          <span>
            {unit === '원' ? '000,000,000' : '0'}
            <Typography component="span" sx={{ ml: 0.65, fontSize: '0.8rem', fontWeight: 500 }}>{unit}</Typography>
          </span>
        </Skeleton> : <>
          {formatNumber(value)}
          <Typography component="span" sx={{ ml: 0.65, fontSize: '0.8rem', color: 'text.secondary', fontWeight: 500 }}>{unit}</Typography>
        </>}
      </Typography>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, justifyContent: 'space-between' }}>
        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
          {loading ? <SkeletonText>{hint}</SkeletonText> : hint}
        </Typography>
        {loading ? <Skeleton variant="circular" width={16} height={16} sx={{ flexShrink: 0 }} />
          : <ArrowForwardRounded sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />}
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
      <Stack aria-hidden="true" spacing={{ xs: 3, sm: 3.5 }}>
        <Box>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 2 }}>
            <Typography sx={{ fontWeight: 750, fontSize: '1.05rem' }}><SkeletonText>내 업무</SkeletonText></Typography>
            <Typography sx={{ fontSize: '0.73rem' }}><SkeletonText>현재 처리 상태 · 기간 제한 없음</SkeletonText></Typography>
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3,minmax(0,1fr))' }, gap: 2 }}>
            <MetricCard loading label="내가 처리할 결재" value={0} unit="건" hint="내 결재 순서에 도착한 문서" icon={null} onClick={() => {}} />
            <MetricCard loading label="내 임시저장" value={0} unit="건" hint="이어서 작성할 기안 문서" icon={null} tone="success" onClick={() => {}} />
            <MetricCard loading label="내 보완 필요" value={0} unit="건" hint="내가 기안한 보완요청 문서" icon={null} tone="warning" onClick={() => {}} />
          </Box>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
          <Box data-testid="work-skeleton">
            <OverviewPanel loading focus title="지금 확인할 업무" caption="결재 대기 및 보완요청 · 최근 변경 순" icon={null}
              footer={<><Skeleton width={90} height={18} /><Skeleton width={90} height={28} /></>}>
              <SkeletonList kind="work" />
            </OverviewPanel>
          </Box>
          <Box data-testid="notice-skeleton">
            <OverviewPanel loading focus title="최근 공지" caption="상단 고정 공지 우선 · 최근 등록 순" icon={null}
              footer={<><Skeleton width={90} height={18} /><Skeleton width={90} height={28} /></>}>
              <SkeletonList kind="notice" />
            </OverviewPanel>
          </Box>
        </Box>
        <Box data-testid="reference-skeleton" sx={{ minWidth: 0 }}>
          <OverviewPanel loading focus title="내가 확인할 문서" caption="미확인 참조 문서" icon={null}
            action={<Skeleton width={48} height={24} />}>
            <SkeletonList kind="work" />
          </OverviewPanel>
        </Box>
      </Stack>
    </Box>
  );
}

function SkeletonList({ kind }: { kind: 'work' | 'notice' | 'due' }) {
  return (
    <Stack spacing={1}>
      {[0, 1, 2].map((row) => (
        <OverviewListRow key={row} loading notice={kind === 'notice'} pinned={kind === 'notice' && row === 0}>
          {kind === 'due' && <Skeleton variant="rounded" width={46} height={61} sx={{ flexShrink: 0, borderRadius: 2 }} />}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {(kind === 'work' || (kind === 'notice' && row === 0)) && <Skeleton variant="rounded" width={54} height={22} sx={{ mb: 0.9, borderRadius: 1 }} />}
            {kind === 'due' && <Skeleton width={58} height={16} sx={{ mb: 0.5 }} />}
            <Typography sx={{ fontSize: kind === 'work' ? '0.85rem' : '0.83rem', fontWeight: 650 }}>
              <SkeletonText width={`${[85, 95, 70][row]}%`}>업무 제목</SkeletonText>
            </Typography>
            {kind !== 'work' && <Typography sx={{ fontSize: kind === 'due' ? '0.73rem' : '0.7rem', mt: kind === 'due' ? 0.4 : 0.65 }}>
              <SkeletonText width="45%">보조 정보</SkeletonText>
            </Typography>}
          </Box>
        </OverviewListRow>
      ))}
    </Stack>
  );
}

export function SalesOverviewSkeleton() {
  return (
    <Box role="status" aria-label="수주 현황 불러오는 중">
      <Stack aria-hidden="true" spacing={2.5}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3,minmax(0,1fr))' }, gap: 2 }}>
          <MetricCard loading label="선택 월 수주" value={0} unit="건" hint="0000-00-00 ~ 0000-00-00" icon={null} onClick={() => {}} />
          <MetricCard loading label="수주 공급가액" value={0} unit="원" hint="부가세 제외 · 상세 공급가액 합계" icon={null} tone="success" onClick={() => {}} />
          <MetricCard loading label="수주 총액" value={0} unit="원" hint="부가세 포함 · 매출액과 구분" icon={null} onClick={() => {}} />
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.15fr 1fr' }, gap: 2.5 }}>
          <Box data-testid="trend-skeleton">
            <OverviewPanel loading title="수주 흐름" caption="0000-00 — 0000-00 · 공급가액 기준" icon={null}
              action={<Skeleton width={64} height={24} />}>
              <Box sx={{ pt: 1 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(6,minmax(0,1fr))', gap: { xs: 0.5, sm: 1.5 }, borderBottom: '1px solid', borderColor: 'divider' }}>
                  {[48, 62, 54, 80, 72, 90].map((height, index) => (
                    <Stack key={index} sx={{ height: 204, justifyContent: 'flex-end', alignItems: 'center', px: 0.4, pt: 1 }}>
                      <Skeleton width="75%" height={14} sx={{ mb: 1 }} />
                      <Skeleton variant="rounded" sx={{ height: `${height}%`, width: '66%', maxWidth: 54, borderRadius: '6px 6px 0 0' }} />
                    </Stack>
                  ))}
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(6,minmax(0,1fr))', gap: { xs: 0.5, sm: 1.5 }, mt: 1.5 }}>
                  {[0, 1, 2, 3, 4, 5].map((month) => (
                    <Typography key={month} sx={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'center' }}><SkeletonText width="65%">0월</SkeletonText></Typography>
                  ))}
                </Box>
              </Box>
              <Typography sx={{ mt: 2, fontSize: '0.7rem' }}>
                <SkeletonText>월별 막대를 선택하면 해당 기간의 수주현황으로 이동합니다.</SkeletonText>
              </Typography>
            </OverviewPanel>
          </Box>
          <Box data-testid="due-skeleton">
            <OverviewPanel loading focus title="다가오는 납기" caption="오늘부터 7일 · 등록 기준 / 출하 미반영" icon={null}
              action={<Skeleton width={48} height={22} />}
              footer={<><Skeleton width={110} height={18} /><Skeleton width={80} height={28} /></>}>
              <SkeletonList kind="due" />
            </OverviewPanel>
          </Box>
        </Box>
        <Typography sx={{ fontSize: '0.7rem', textAlign: 'right' }}><Skeleton width={110} sx={{ ml: 'auto' }}><span>수주 조회 시각</span></Skeleton></Typography>
      </Stack>
    </Box>
  );
}
