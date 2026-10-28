import { Box, Button, ButtonBase, Chip, Stack, TextField, Tooltip, Typography, alpha } from '@mui/material';
import ShoppingBagOutlined from '@mui/icons-material/ShoppingBagOutlined';
import AccountBalanceWalletOutlined from '@mui/icons-material/AccountBalanceWalletOutlined';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import TrendingUpRounded from '@mui/icons-material/TrendingUpRounded';
import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined';
import ArrowOutwardRounded from '@mui/icons-material/ArrowOutwardRounded';
import { useNavigate } from 'react-router-dom';
import type { DashboardSales } from '../types/overview';
import { formatNumber, isDashboardMonth, salesDuePath, salesMonthPath } from '../services/overview.service';
import { MetricCard, OverviewEmpty, OverviewError, OverviewPanel, OverviewSkeleton } from './OverviewWidgets';

function compactMoney(value: number) {
  if (value >= 100000000) return `${formatNumber(Math.round(value / 10000000) / 10)}억`;
  if (value >= 10000) return `${formatNumber(Math.round(value / 1000) / 10)}만`;
  return formatNumber(value);
}

function SalesTrend({ rows, selectedMonth }: { rows: DashboardSales['trend']; selectedMonth: string }) {
  const navigate = useNavigate();
  const max = Math.max(1, ...rows.map((row) => row.supplyAmount));
  return (
    <Box role="group" aria-label="최근 6개월 수주 공급가액 추이" sx={{ pt: 1 }}>
      <Box sx={(theme) => ({
        display: 'grid', gridTemplateColumns: 'repeat(6,minmax(0,1fr))', gap: { xs: 0.5, sm: 1.5 },
        backgroundImage: `repeating-linear-gradient(to top, ${alpha(theme.palette.text.primary, 0.07)} 0 1px, transparent 1px 48px)`,
        borderBottom: '1px solid', borderColor: 'divider',
      })}>
        {rows.map((row) => (
          <Tooltip key={row.month} title={`${row.month} · ${formatNumber(row.supplyAmount)}원 · 수주 ${formatNumber(row.orderCount)}건`}>
            <ButtonBase onClick={() => { if (isDashboardMonth(row.month)) navigate(salesMonthPath(row.month)); }}
              aria-disabled={!isDashboardMonth(row.month)}
              tabIndex={isDashboardMonth(row.month) ? 0 : -1}
              aria-label={`${row.month} 수주 공급가액 ${formatNumber(row.supplyAmount)}원, ${row.orderCount}건 상세 보기`}
              sx={(theme) => ({
                minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                height: 204, px: 0.4, pt: 1, borderRadius: '8px 8px 0 0',
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.07) },
                '&.Mui-focusVisible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
              })}>
              <Typography sx={{ mb: 1, fontSize: { xs: '0.62rem', sm: '0.72rem' }, color: 'text.secondary' }}>
                {compactMoney(row.supplyAmount)}
              </Typography>
              <Box sx={(theme) => ({
                width: '66%', maxWidth: 54, height: `${row.supplyAmount / max * 150}px`, flexShrink: 0,
                borderRadius: '6px 6px 0 0',
                background: row.month === selectedMonth
                  ? `linear-gradient(180deg, ${theme.palette.primary.main}, ${alpha(theme.palette.primary.main, 0.65)})`
                  : alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.35 : 0.2),
              })} />
            </ButtonBase>
          </Tooltip>
        ))}
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(6,minmax(0,1fr))', gap: { xs: 0.5, sm: 1.5 }, mt: 1.5 }}>
        {rows.map((row) => (
          <Typography key={row.month} sx={{ fontSize: '0.7rem', textAlign: 'center',
            fontWeight: row.month === selectedMonth ? 750 : 400,
            color: row.month === selectedMonth ? 'primary.main' : 'text.secondary' }}>
            {Number(row.month.slice(5))}월
          </Typography>
        ))}
      </Box>
    </Box>
  );
}

export function SalesOverview({ month, onMonthChange, data, loading, error, onRetry }: {
  month: string; onMonthChange: (month: string) => void; data: DashboardSales | null;
  loading: boolean; error: boolean; onRetry: () => void;
}) {
  const navigate = useNavigate();
  return (
    <Box component="section" aria-label="영업 현황" sx={{ minWidth: 0 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', gap: 2, mb: 2, alignItems: { sm: 'center' } }}>
        <Box>
          <Typography component="h2" sx={{ fontSize: '1.05rem', fontWeight: 750 }}>영업 현황</Typography>
          <Typography sx={{ mt: 0.5, fontSize: '0.78rem', color: 'text.secondary' }}>
            수주일 기준 · 활성 수주 · 금액 단위 원
          </Typography>
        </Box>
        <TextField type="month" label="수주 조회 월" size="small" margin="none" value={month}
          onChange={(event) => { if (isDashboardMonth(event.target.value)) onMonthChange(event.target.value); }}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: '1900-01', max: '9998-12' } }}
          sx={{ width: { xs: '100%', sm: 176 }, '& .MuiOutlinedInput-root': { bgcolor: 'background.paper', borderRadius: 2 } }} />
      </Stack>
      {error ? <OverviewError label="수주 현황" onRetry={onRetry} /> : loading || !data ? <OverviewSkeleton /> : (
        <Stack spacing={2.5}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3,minmax(0,1fr))' }, gap: 2 }}>
            <MetricCard label="선택 월 수주" value={data.orderCount} unit="건" hint={`${data.from} ~ ${data.to}`}
              icon={<ShoppingBagOutlined fontSize="small" />} onClick={() => navigate(salesMonthPath(data.month))} />
            <MetricCard label="수주 공급가액" value={data.supplyAmount} unit="원" hint="부가세 제외 · 상세 공급가액 합계"
              icon={<AccountBalanceWalletOutlined fontSize="small" />} tone="success" onClick={() => navigate(salesMonthPath(data.month))} />
            <MetricCard label="수주 총액" value={data.totalAmount} unit="원" hint="부가세 포함 · 매출액과 구분"
              icon={<ReceiptLongOutlined fontSize="small" />} onClick={() => navigate(salesMonthPath(data.month))} />
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.15fr 1fr' }, gap: 2.5 }}>
            <OverviewPanel title="수주 흐름" caption={`${data.trend[0].month} — ${data.month} · 공급가액 기준`}
              icon={<TrendingUpRounded fontSize="small" />}
              action={<Chip size="small" variant="outlined" label="최근 6개월" sx={{ fontSize: '0.68rem' }} />}>
              <SalesTrend rows={data.trend} selectedMonth={data.month} />
              <Typography sx={{ mt: 2, color: 'text.secondary', fontSize: '0.7rem' }}>
                월별 막대를 선택하면 해당 기간의 수주현황으로 이동합니다.
              </Typography>
            </OverviewPanel>
            <OverviewPanel title="다가오는 납기" caption="오늘부터 7일 · 등록 기준 / 출하 미반영"
              icon={<EventAvailableOutlined fontSize="small" />}
              action={<Button size="small" onClick={() => navigate(salesDuePath(data.asOfDate))} aria-label="납기 예정 수주 전체 보기">
                {formatNumber(data.upcomingCount)}건 <ArrowOutwardRounded sx={{ ml: 0.5, fontSize: 14 }} />
              </Button>}>
              {data.upcoming.length === 0 ? <OverviewEmpty>예정된 납기가 없습니다.</OverviewEmpty> : (
                <Stack spacing={0.5}>
                  {data.upcoming.map((item) => (
                    <ButtonBase key={item.salesOrderId}
                      onClick={() => navigate(salesDuePath(data.asOfDate, item.orderNo))}
                      aria-label={`${item.orderNo} 납기 예정 수주 보기`}
                      sx={(theme) => ({
                        width: '100%', display: 'flex', gap: 1.5, textAlign: 'left', py: 1.35, px: 1, borderRadius: 2,
                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.06) },
                        '&.Mui-focusVisible': { outline: `2px solid ${theme.palette.primary.main}` },
                      })}>
                      <Box sx={(theme) => ({ flexShrink: 0, p: 1, minWidth: 50, borderRadius: 2,
                        textAlign: 'center', bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main' })}>
                        <Typography sx={{ fontSize: '0.67rem' }}>{Number(item.deliveryDt.slice(5, 7))}월</Typography>
                        <Typography sx={{ fontSize: '1.1rem', fontWeight: 800 }}>{Number(item.deliveryDt.slice(8))}</Typography>
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, overflowWrap: 'anywhere' }}>{item.orderNo}</Typography>
                        <Typography sx={{ fontSize: '0.73rem', color: 'text.secondary', mt: 0.4, overflowWrap: 'anywhere' }}>
                          {item.customerName || '거래처 정보 없음'}
                        </Typography>
                      </Box>
                      <ArrowOutwardRounded sx={{ color: 'text.secondary', fontSize: 16, flexShrink: 0 }} />
                    </ButtonBase>
                  ))}
                </Stack>
              )}
              {data.upcomingCount > data.upcoming.length && <Typography sx={{ mt: 1, fontSize: '0.7rem', color: 'text.secondary' }}>
                가까운 납기 {data.upcoming.length}건 표시 · 전체 {formatNumber(data.upcomingCount)}건
              </Typography>}
            </OverviewPanel>
          </Box>
          <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', textAlign: 'right' }}>
            수주 조회 {new Date(data.fetchedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
          </Typography>
        </Stack>
      )}
    </Box>
  );
}
