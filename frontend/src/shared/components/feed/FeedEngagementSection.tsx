import type { ReactNode } from 'react';
import { Box, Divider } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { FeedCommentsSection, type FeedCommentsSectionProps } from './FeedCommentsSection';
import { FeedReactionBar, type FeedReactionBarProps } from './FeedReactionBar';

/** 공통 댓글(`CommentThread`)의 `commentListSx`로 넘겨, 목록 위의 기본 여백·구분선·안쪽 여백을 없앤다. */
export const FEED_COMMENT_LIST_SX: SxProps<Theme> = { mt: 0, borderTop: 0, pt: 0 };

type FeedEngagementSectionProps = {
  reaction: FeedReactionBarProps;
  comments: Omit<FeedCommentsSectionProps, 'children'>;
  /** 공통 댓글 컴포넌트 */
  children: ReactNode;
  sx?: SxProps<Theme>;
  /**
   * 구분선이 좌우로 번지는 폭(spacing 단위). 들어 있는 컨테이너의 안쪽 여백과 같아야 끝에 딱 맞는다.
   * 기본값은 피드 카드(`FeedCard`)의 안쪽 여백(xs 1.5 / sm 2.5)이다.
   */
  bleed?: number | { xs: number; sm: number };
};

const FEED_CARD_BLEED = { xs: 1.5, sm: 2.5 };

/**
 * 피드 카드 아래쪽(반응 줄 → 구분선 → 댓글)을 문서관리·공지사항·협업공간이 같은 모양으로 쓰도록 묶었다.
 * - 반응 줄 위에는 구분선을 두지 않고, 아래에 구분선 하나만 둔다.
 * - 구분선은 카드 안쪽 여백(xs 12px / sm 20px)만큼 음수 여백을 줘 카드 좌우 끝까지 닿는다.
 * - 간격: 위쪽 8px(호출하는 쪽에서 조정 가능) · 반응 줄 → 구분선 8px · 구분선 → 첫 댓글 12px.
 */
export function FeedEngagementSection({
  reaction,
  comments,
  children,
  sx,
  bleed = FEED_CARD_BLEED,
}: FeedEngagementSectionProps) {
  const marginX = typeof bleed === 'number' ? -bleed : { xs: -bleed.xs, sm: -bleed.sm };
  return (
    <Box data-testid="feed-engagement-section" sx={[{ mt: 1 }, ...(Array.isArray(sx) ? sx : [sx])]}>
      <FeedReactionBar {...reaction} />
      <Divider
        data-testid="feed-engagement-divider"
        sx={{ mt: 1, mb: '2px', mx: marginX }}
      />
      <FeedCommentsSection {...comments}>{children}</FeedCommentsSection>
    </Box>
  );
}
