import { useMemo, useState } from 'react';
import MoreVert from '@mui/icons-material/MoreVert';
import { Alert, Chip, IconButton, Menu, MenuItem, Stack } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { AttachmentList } from '../../../../../shared/components/feed/AttachmentList';
import { CommentThread } from '../../../../../shared/components/feed/CommentThread';
import { FeedBodyContent } from '../../../../../shared/components/feed/FeedBodyContent';
import { FeedCard } from '../../../../../shared/components/feed/FeedCard';
import { FEED_COMMENT_LIST_SX, FeedEngagementSection } from '../../../../../shared/components/feed/FeedEngagementSection';
import { ImageViewerDialog } from '../../../../../shared/components/ImageViewerDialog';
import { formatInboxDateTime } from '../../../shared/utils/formatInboxDateTime';
import { buildBodyView, countComments, toFeedComments } from '../data/workspaceFeedAdapter';
import { getUserName } from '../data/workspaceSamples';
import { useWorkspaceAttachmentUrls } from '../hooks/useWorkspaceAttachmentUrls';
import { columnChipProps } from './columnColorStyles';
import type { WorkspaceAttachment, WorkspaceComment, WorkspacePost, WorkspaceRoom } from '../types/workspace.types';

// 피드 목록과 우측 상세 패널이 같은 카드를 쓴다(상세가 피드와 달라 보이지 않도록 분기를 두지 않는다).
type WorkspaceFeedPostProps = {
  room: WorkspaceRoom;
  post: WorkspacePost;
  currentUserId: string;
  canWrite: boolean;
  onAddComment: (postId: string, parentCommentId: string | null, html: string, files: File[]) => Promise<void> | void;
  onEditComment: (postId: string, commentId: string, html: string, files: File[]) => Promise<void> | void;
  onDeleteComment: (postId: string, commentId: string) => Promise<void> | void;
  onDownloadAttachment: (attachment: WorkspaceAttachment) => void;
  /** 작성자 본인의 글에만 수정 버튼을 보여준다. */
  onEditPost?: (post: WorkspacePost) => void;
  commentError?: string;
};

const findComment = (comments: WorkspaceComment[], id: string): WorkspaceComment | undefined => {
  for (const comment of comments) {
    if (comment.id === id) return comment;
    const nested = findComment(comment.replies, id);
    if (nested) return nested;
  }
  return undefined;
};

export function WorkspaceFeedPost({
  room,
  post,
  currentUserId,
  canWrite,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onDownloadAttachment,
  onEditPost,
  commentError,
}: WorkspaceFeedPostProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const getAttachmentUrl = useWorkspaceAttachmentUrls();
  const [isBodyExpanded, setIsBodyExpanded] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [selectedImage, setSelectedImage] = useState<{ src: string; alt: string } | null>(null);

  const bodyView = useMemo(() => buildBodyView(post.body), [post.body]);
  const postColumn = room.columns.find((column) => column.id === post.columnId);
  const columnName = postColumn?.name;
  const statusChip = columnName ? <Chip size="small" variant="outlined" label={columnName} {...columnChipProps(postColumn?.color)} /> : null;
  const commentCount = countComments(post.comments);
  const author = getUserName(post.authorId);
  const date = formatInboxDateTime(post.createdAt);
  const feedComments = toFeedComments(post.comments, { currentUserId, canEdit: canWrite, getAttachmentUrl });

  // spacing 대신 useFlexGap(gap)을 써야 아래 구분선에 준 음수 여백이 Stack의 margin 규칙에 덮어써지지 않는다.
  const content = (
    <Stack spacing={1.5} useFlexGap sx={{ minWidth: 0 }}>
      {bodyView.expandedHtml ? (
        <FeedBodyContent
          hasMore={bodyView.hasMore}
          isExpanded={isBodyExpanded}
          onToggleExpand={() => setIsBodyExpanded((expanded) => !expanded)}
          contentTestId="workspace-post-body"
          richText={{
            collapsedHtml: bodyView.collapsedHtml,
            expandedHtml: bodyView.expandedHtml,
            images: bodyView.images,
            onOpenImage: setSelectedImage,
          }}
        />
      ) : null}
      <AttachmentList
        testId="workspace-attachment-list"
        files={post.attachments.map((attachment, index) => ({
          id: String(index),
          name: attachment.name,
          size: attachment.size,
          mimeType: attachment.type,
          previewUrl: getAttachmentUrl(attachment),
        }))}
        showActions
        onDownload={(id) => {
          const attachment = post.attachments[Number(id)];
          if (attachment) onDownloadAttachment(attachment);
        }}
      />
      {/* 반응 줄 → 좌우 끝까지 닿는 구분선 → 댓글. 문서관리·공지사항과 같은 공통 컴포넌트를 쓴다. 위쪽은 Stack gap(12px) 때문에 4px 줄여 8px로 맞춘다. */}
      <FeedEngagementSection
        sx={{ mt: -0.5 }}
        reaction={{
          liked: isLiked,
          likeCount: 0,
          bookmarked: isBookmarked,
          commentCount,
          onToggleLike: () => setIsLiked((value) => !value),
          onToggleBookmark: () => setIsBookmarked((value) => !value),
          isDark,
        }}
        comments={{}}
      >
        {commentError ? (
          <Alert severity="error" sx={{ mb: 1 }}>
            {commentError}
          </Alert>
        ) : null}
        <CommentThread
          comments={feedComments}
          showComposer={canWrite}
          onSubmitComment={(html, files) => onAddComment(post.id, null, html, files)}
          onSubmitReply={(commentId, html, files) => onAddComment(post.id, String(commentId), html, files)}
          onEditComment={(commentId, html, files) => onEditComment(post.id, String(commentId), html, files)}
          onDeleteComment={(commentId) => onDeleteComment(post.id, String(commentId))}
          onDownloadAttachment={(commentId, attachmentId) => {
            const attachment = findComment(post.comments, String(commentId))?.attachments?.[Number(attachmentId)];
            if (attachment) onDownloadAttachment(attachment);
          }}
          onOpenAttachmentImage={setSelectedImage}
          commentListSx={FEED_COMMENT_LIST_SX}
        />
      </FeedEngagementSection>
      <ImageViewerDialog
        open={selectedImage !== null}
        src={selectedImage?.src ?? ''}
        alt={selectedImage?.alt}
        onClose={() => setSelectedImage(null)}
      />
    </Stack>
  );

  return (
    <FeedCard
      author={author}
      meta={date}
      badges={statusChip}
      actions={
        onEditPost && canWrite && post.authorId === currentUserId ? (
          <>
            <IconButton aria-label="글 더보기" size="small" onClick={(event) => setMenuAnchor(event.currentTarget)}>
              <MoreVert fontSize="small" />
            </IconButton>
            <Menu anchorEl={menuAnchor} open={menuAnchor !== null} onClose={() => setMenuAnchor(null)}>
              <MenuItem
                onClick={() => {
                  setMenuAnchor(null);
                  onEditPost(post);
                }}
              >
                글 수정
              </MenuItem>
            </Menu>
          </>
        ) : undefined
      }
      title={post.title}
      isDark={isDark}
      testId="workspace-feed-card"
    >
      {content}
    </FeedCard>
  );
}
