import { Button, Card, CardContent, Stack, Typography } from '@mui/material';
import type {
  DocumentApprovalScope,
  DocumentApprovalSummary,
} from '../types/documentWrite.types';

type DocumentStatusPanelProps = {
  summary: DocumentApprovalSummary | null;
  onSelectScope: (scope: DocumentApprovalScope) => void;
};

export function DocumentStatusPanel({
  summary,
  onSelectScope,
}: DocumentStatusPanelProps) {
  return (
    <Card
      sx={{
        borderRadius: 3,
        border: '1px solid rgba(148,163,184,0.18)',
        boxShadow: 'none',
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          문서 상태
        </Typography>
        <Stack spacing={1}>
          {[
            ['승인', summary?.completedCount ?? 0, 'COMPLETED'],
            ['보완요청', summary?.revisionRequestedCount ?? 0, 'REVISION_REQUESTED'],
            ['반려', summary?.rejectedCount ?? 0, 'REJECTED'],
          ].map(([label, count, scope]) => (
            <Button
              key={String(label)}
              variant="text"
              onClick={() => onSelectScope(scope as DocumentApprovalScope)}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 1,
                py: 1,
                px: 1,
                borderBottom: '1px solid rgba(148,163,184,0.16)',
                borderRadius: 1,
                color: 'text.primary',
                textTransform: 'none',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {label}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>
                {count}건
              </Typography>
            </Button>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
