import { Button, Card, CardContent, Stack, Typography } from '@mui/material';
import type {
  DocumentApprovalScope,
  DocumentApprovalSummary,
} from '../types/documentWrite.types';

type ApprovalSummaryPanelProps = {
  summary: DocumentApprovalSummary | null;
  onSelectScope: (scope: DocumentApprovalScope) => void;
};

export function ApprovalSummaryPanel({
  summary,
  onSelectScope,
}: ApprovalSummaryPanelProps) {
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
          결재 요약
        </Typography>
        <Stack spacing={1}>
          {[
            ['내가 처리할 결재', summary?.actionRequiredCount ?? 0, 'MY_PENDING'],
            ['결재 진행 중', summary?.inProgressCount ?? 0, 'IN_PROGRESS'],
            ['작성 중 문서', summary?.draftCount ?? 0, 'DRAFT'],
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
