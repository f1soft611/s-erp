import { Chip } from '@mui/material';
import { FeedCard } from '../../../../../shared/components/feed/FeedCard';
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
    <FeedCard
      author={item.author}
      meta={item.date}
      badges={
        <>
          <Chip label={item.kind} size="small" color="primary" />
          <DocumentStatusChip status={item.status} />
        </>
      }
      title={item.title}
      summary={item.summary}
      isDark={isDark}
      onClick={onClick}
      testId="document-write-item"
    />
  );
}
