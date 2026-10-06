import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import type { DocumentWriteItem } from '../types/documentWrite.types';

export function ApprovalSummaryPanel({ items }: { items: DocumentWriteItem[] }) {
  const pendingCount = items.filter(
    (item) => item.status === '결재대기' || item.status === '보완요청',
  ).length;
  const inProgressCount = items.filter(
    (item) => item.status === '결재중',
  ).length;
  const draftCount = items.filter((item) => item.status === '임시저장').length;

  return (
    <Stack spacing={2}>
      <Card
        sx={{
          borderRadius: 3,
          border: '1px solid rgba(148,163,184,0.18)',
          boxShadow: 'none',
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
              결재 요약
            </Typography>
            <Chip label="LIVE" size="small" color="warning" />
          </Box>
          <Stack spacing={1.5}>
            {[
              ['내가 처리할 결재', pendingCount],
              ['결재 진행 중', inProgressCount],
              ['작성 중 문서', draftCount],
            ].map(([label, count]) => (
              <Box
                key={label}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 1,
                  py: 1,
                  borderBottom: '1px solid rgba(148,163,184,0.16)',
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {label}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                  {count}건
                </Typography>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Card
        sx={{
          borderRadius: 3,
          border: '1px solid rgba(148,163,184,0.18)',
          boxShadow: 'none',
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
            놓치지 마세요
          </Typography>
          <Stack spacing={1.5}>
            {items
              .filter(
                (item) =>
                  item.status === '결재대기' || item.status === '보완요청',
              )
              .slice(0, 3)
              .map((item) => (
                <Box
                  key={item.id}
                  sx={{
                    display: 'grid',
                    gap: 0.5,
                    p: 1.2,
                    borderRadius: 2,
                    bgcolor: 'action.hover',
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}
                  >
                    {item.status === '보완요청'
                      ? '보완 요청 문서'
                      : '결재 요청 도착'}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ overflowWrap: 'anywhere' }}
                  >
                    {item.title}
                  </Typography>
                </Box>
              ))}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
