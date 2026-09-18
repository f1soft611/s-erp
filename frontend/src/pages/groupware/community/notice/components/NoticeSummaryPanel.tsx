import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import type { SummaryStat } from '../data/noticeData';

type NoticeSummaryPanelProps = {
  stats: SummaryStat[];
  isDark: boolean;
};

export function NoticeSummaryPanel({ stats, isDark }: NoticeSummaryPanelProps) {
  return (
    <Stack spacing={2}>
      <Card
        sx={{
          borderRadius: 3,
          border: `1px solid ${
            isDark ? 'rgba(148,163,184,0.18)' : 'rgba(148,163,184,0.18)'
          }`,
          boxShadow: 'none',
          bgcolor: isDark ? 'rgba(15, 23, 42, 0.75)' : '#ffffff',
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              공지 요약
            </Typography>
            <Chip label="LIVE" size="small" color="warning" />
          </Box>

          <Stack spacing={1.5}>
            {stats.map((stat) => (
              <Box
                key={stat.label}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 1,
                  borderBottom: `1px solid ${
                    isDark ? 'rgba(148,163,184,0.12)' : 'rgba(148,163,184,0.16)'
                  }`,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {stat.label}
                </Typography>
                <Typography sx={{ fontWeight: 800 }}>{stat.value}</Typography>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Card
        sx={{
          borderRadius: 3,
          border: `1px solid ${
            isDark ? 'rgba(148,163,184,0.18)' : 'rgba(148,163,184,0.18)'
          }`,
          boxShadow: 'none',
          bgcolor: isDark ? 'rgba(15, 23, 42, 0.75)' : '#ffffff',
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
            최근 이슈
          </Typography>
          <Stack spacing={1.5}>
            {['보안 점검 예정', '업무 일정 조정', '새 규정 반영'].map(
              (item) => (
                <Box
                  key={item}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    p: 1.2,
                    borderRadius: 2,
                    bgcolor: isDark ? 'rgba(148,163,184,0.06)' : '#f8fafc',
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {item}
                  </Typography>
                  <Divider orientation="vertical" flexItem />
                  <Chip
                    label="확인"
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </Box>
              ),
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
