import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { statusColor } from '../data/documentWriteData';
import type {
  ApprovalStatus,
  DocumentWriteItem,
} from '../types/documentWrite.types';

function DocumentStatusChip({ status }: { status: ApprovalStatus }) {
  return (
    <Chip
      label={status}
      size="small"
      color={statusColor(status)}
      variant={status === '임시저장' ? 'outlined' : 'filled'}
      sx={{ height: 22, fontWeight: 700 }}
    />
  );
}

type DocumentFeedItemProps = {
  item: DocumentWriteItem;
  isDark: boolean;
  onClick?: () => void;
};

export function DocumentFeedItem({ item, isDark, onClick }: DocumentFeedItemProps) {
  return (
    <Card
      component={onClick ? 'button' : 'article'}
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      data-testid="document-write-item"
      sx={{
        width: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        borderRadius: 3,
        border: '1px solid rgba(148,163,184,0.18)',
        boxShadow: 'none',
        bgcolor: isDark ? 'rgba(15, 23, 42, 0.75)' : '#ffffff',
        color: 'inherit',
        textAlign: 'left',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? { borderColor: 'primary.main' } : undefined,
      }}
    >
      <CardContent sx={{ p: { xs: 1.5, sm: 2.5 }, minWidth: 0, overflow: 'hidden' }}>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 1.5,
            mb: 2,
            minWidth: 0,
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              flexShrink: 0,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8rem',
              fontWeight: 700,
              bgcolor: isDark ? 'rgba(96,165,250,0.2)' : '#dbeafe',
              color: isDark ? '#eff6ff' : '#1f2937',
            }}
          >
            {item.author.slice(0, 1)}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {item.author}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {item.date}
            </Typography>
          </Box>
          <Stack
            direction="row"
            spacing={0.75}
            sx={{
              alignItems: 'center',
              flexWrap: 'wrap',
              justifyContent: { xs: 'flex-start', sm: 'flex-end' },
              flex: { xs: '1 0 100%', sm: '0 0 auto' },
            }}
          >
            <Chip label={item.kind} size="small" color="primary" />
            <DocumentStatusChip status={item.status} />
          </Stack>
        </Box>
        <Typography
          variant="h6"
          sx={{
            fontSize: '1.25rem',
            lineHeight: 1.4,
            fontWeight: 700,
            mb: 1.5,
            overflowWrap: 'anywhere',
          }}
        >
          {item.title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {item.summary}
        </Typography>
      </CardContent>
    </Card>
  );
}
