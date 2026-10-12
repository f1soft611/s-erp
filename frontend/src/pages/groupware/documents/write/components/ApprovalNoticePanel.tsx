import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import type { DocumentWriteItem } from '../types/documentWrite.types';

type ApprovalNoticePanelProps = {
  items: DocumentWriteItem[];
  onSelect: (electronicApprovalId: number) => void;
};

export function ApprovalNoticePanel({ items, onSelect }: ApprovalNoticePanelProps) {
  return (
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
        <Stack spacing={1}>
          {items.slice(0, 3).map((item) => (
            <Button
              key={item.id}
              variant="text"
              onClick={() => onSelect(item.id)}
              sx={{
                display: 'grid',
                justifyItems: 'start',
                gap: 0.5,
                p: 1.2,
                borderRadius: 2,
                bgcolor: 'action.hover',
                color: 'text.primary',
                textAlign: 'left',
                textTransform: 'none',
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {item.status === '보완요청' ? '보완 요청 문서' : '결재 요청 도착'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                {item.title}
              </Typography>
            </Button>
          ))}
          {items.length === 0 && (
            <Box sx={{ py: 1 }}>
              <Typography variant="body2" color="text.secondary">
                새로운 결재 알림이 없습니다.
              </Typography>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
