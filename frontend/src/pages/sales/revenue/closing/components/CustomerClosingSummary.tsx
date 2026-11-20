import { alpha, Box, ButtonBase, Paper, Skeleton, Stack, Typography, useTheme } from '@mui/material';
import type { RevenueClosingCustomerSummaryRow } from '../types/revenueClosing.types';

type Props = {
  rows: RevenueClosingCustomerSummaryRow[];
  loading?: boolean;
  selectedCustomerId?: number | null;
  onSelectCustomer: (customerId: number | null) => void;
};

function formatCount(value: number) {
  return value.toLocaleString('ko-KR');
}

function CustomerRow({
  row,
  selected,
  onSelect,
}: {
  row: RevenueClosingCustomerSummaryRow;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <ButtonBase
      component="div"
      role="button"
      aria-label={`${row.customerName} 거래처 요약`}
      aria-pressed={selected}
      onClick={onSelect}
      sx={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 42px 49px 55px',
        alignItems: 'center',
        width: '100%',
        minHeight: 48,
        px: 1,
        py: 0.6,
        borderBottom: '1px solid',
        borderColor: 'divider',
        borderLeft: '3px solid',
        borderLeftColor: selected ? 'primary.main' : 'transparent',
        bgcolor: selected ? 'action.selected' : 'transparent',
        textAlign: 'left',
        '&:hover': { bgcolor: selected ? 'action.selected' : 'action.hover' },
      }}
    >
      <Box sx={{ minWidth: 0, pr: 0.5 }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: selected ? 700 : 600, lineHeight: 1.3 }}>
          {row.customerName}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap sx={{ lineHeight: 1.2 }}>
          {row.customerCode}
        </Typography>
      </Box>
      <Typography variant="body2" align="right" sx={{ fontWeight: 700 }}>
        {formatCount(row.totalCount)}
      </Typography>
      <Typography variant="caption" align="right" sx={{ color: 'success.main', fontWeight: 700 }}>
        {formatCount(row.closedCount)}
      </Typography>
      <Typography variant="caption" align="right" sx={{ color: 'warning.dark', fontWeight: 700 }}>
        {formatCount(row.openCount)}
      </Typography>
    </ButtonBase>
  );
}

export function CustomerClosingSummary({
  rows,
  loading = false,
  selectedCustomerId = null,
  onSelectCustomer,
}: Props) {
  const theme = useTheme();
  const totals = rows.reduce(
    (result, row) => ({
      totalCount: result.totalCount + row.totalCount,
      closedCount: result.closedCount + row.closedCount,
      openCount: result.openCount + row.openCount,
    }),
    { totalCount: 0, closedCount: 0, openCount: 0 },
  );

  return (
    <Paper
      component="section"
      aria-label="거래처별 매출마감 요약"
      aria-busy={loading}
      variant="outlined"
      sx={{
        height: '100%',
        minWidth: 0,
        minHeight: 0,
        p: 1.25,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 750, lineHeight: 1.3 }}>
            거래처 요약
          </Typography>
          {!loading && rows.length > 0 ? (
            <Typography variant="caption" color="text.secondary">출하 상세 기준</Typography>
          ) : null}
        </Box>
        {!loading && rows.length > 0 ? (
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            {formatCount(rows.length)}곳
          </Typography>
        ) : null}
      </Stack>

      {loading ? (
        <Stack role="status" aria-label="거래처 요약 불러오는 중" spacing={0.75} sx={{ minHeight: 0 }}>
          <Paper variant="outlined" sx={{ p: 0.75, borderRadius: 1.5 }}>
            <Skeleton variant="text" width="38%" />
            <Skeleton variant="text" width="76%" height={26} />
          </Paper>
          {[0, 1, 2, 3, 4].map((item) => (
            <Box key={item} sx={{ py: 0.55, px: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Skeleton variant="text" width={item % 2 === 0 ? '68%' : '52%'} />
              <Skeleton variant="text" width="88%" />
            </Box>
          ))}
        </Stack>
      ) : rows.length === 0 ? (
        <Typography role="status" variant="body2" color="text.secondary">
          거래처 요약 데이터가 없습니다.
        </Typography>
      ) : (
        <>
          <ButtonBase
            component="div"
            role="button"
            aria-label="전체"
            aria-pressed={selectedCustomerId === null}
            onClick={() => onSelectCustomer(null)}
            sx={{
              display: 'block',
              width: '100%',
              mb: 0.85,
              p: 0.8,
              borderRadius: 1.5,
              border: '1px solid',
              borderColor: selectedCustomerId === null ? 'primary.main' : 'divider',
              bgcolor: alpha(theme.palette.primary.main, selectedCustomerId === null ? 0.09 : 0.035),
              textAlign: 'left',
            }}
          >
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">전체 매출대상</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 750, lineHeight: 1.2 }}>
                  {formatCount(totals.totalCount)}건
                </Typography>
              </Box>
              <Stack direction="row" spacing={1.25}>
                <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 700 }}>
                  마감 {formatCount(totals.closedCount)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'warning.dark', fontWeight: 700 }}>
                  미마감 {formatCount(totals.openCount)}
                </Typography>
              </Stack>
            </Stack>
          </ButtonBase>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) 42px 49px 55px',
              px: 1,
              pb: 0.45,
              color: 'text.secondary',
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700 }}>거래처</Typography>
            <Typography variant="caption" align="right" sx={{ fontWeight: 700 }}>전체</Typography>
            <Typography variant="caption" align="right" sx={{ fontWeight: 700 }}>마감</Typography>
            <Typography variant="caption" align="right" sx={{ fontWeight: 700 }}>미마감</Typography>
          </Box>
          <Box
            data-testid="customer-summary-list"
            aria-label="거래처 목록"
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
            {rows.map((row) => (
              <CustomerRow
                key={row.customerId}
                row={row}
                selected={selectedCustomerId === row.customerId}
                onSelect={() => onSelectCustomer(row.customerId)}
              />
            ))}
          </Box>
        </>
      )}
    </Paper>
  );
}
