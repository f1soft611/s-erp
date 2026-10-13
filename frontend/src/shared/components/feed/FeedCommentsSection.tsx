import type { ReactNode } from 'react';
import { Box, Button } from '@mui/material';

type FeedCommentsSectionProps = {
  children: ReactNode;
  showPrevious?: boolean;
  isLoadingPrevious?: boolean;
  onLoadPrevious?: () => void;
};

export function FeedCommentsSection({
  children,
  showPrevious = false,
  isLoadingPrevious = false,
  onLoadPrevious,
}: FeedCommentsSectionProps) {
  return (
    <Box data-testid="feed-comments-section">
      {showPrevious && (
        <Button
          size="small"
          variant="text"
          aria-label="이전 댓글 보기"
          disabled={isLoadingPrevious}
          onClick={() => void onLoadPrevious?.()}
          sx={{ mt: 1.5 }}
        >
          {isLoadingPrevious ? '이전 댓글 불러오는 중...' : '이전 댓글 보기'}
        </Button>
      )}
      {children}
    </Box>
  );
}
