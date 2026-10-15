import { Stack } from '@mui/material';
import { DocumentApprovalDetailFeed } from './DocumentApprovalDetailFeed';
import type {
  DocumentApprovalDetail,
  DocumentFeedWriteItem,
} from '../types/documentWrite.types';

type DocumentFeedItemProps = {
  item: DocumentFeedWriteItem;
  employeeId: string;
  detailRefreshToken: number;
  onActionComplete: () => void;
  onEditDocument: (detail: DocumentApprovalDetail) => void;
};

export function DocumentFeedItem({
  item,
  employeeId,
  detailRefreshToken,
  onActionComplete,
  onEditDocument,
}: DocumentFeedItemProps) {
  return (
    <Stack spacing={1}>
      <DocumentApprovalDetailFeed
        key={item.id}
        presentation="feed"
        feedItem={item}
        employeeId={employeeId}
        open
        electronicApprovalId={item.id}
        onActionComplete={onActionComplete}
        onEditDocument={onEditDocument}
        detailRefreshToken={detailRefreshToken}
      />
    </Stack>
  );
}
