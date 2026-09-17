import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';
import BookmarkBorderOutlinedIcon from '@mui/icons-material/BookmarkBorderOutlined';
import { AttachmentList } from '../../../../../shared/components/feed/AttachmentList';
import { CommentThread } from '../../../../../shared/components/feed/CommentThread';
import { FeedList } from '../../../../../shared/components/feed/FeedList';
import type { NoticeCommentItem, NoticeFeedItem } from '../data/noticeData';
import { noticeContentStyles } from './noticeContentStyles';

type NoticeFeedListProps = {
  items: NoticeFeedItem[];
  isDark: boolean;
  expandedNoticeId?: number | null;
  isRefreshing?: boolean;
  onToggleExpand?: (id: number) => void;
  onToggleLike?: (id: number) => void;
  onToggleBookmark?: (id: number) => void;
  onAddComment?: (
    noticeId: number,
    content: string,
    parentCommentId?: number | string,
  ) => Promise<void> | void;
  onDelete?: (noticeId: number) => void;
  onEdit?: (item: NoticeFeedItem) => void;
  onDownload?: (
    noticeId: number,
    file: {
      id: string;
      name: string;
      size?: number;
      boardFileId?: number | string | null;
      objectKey?: string | null;
      bucketName?: string | null;
    },
  ) => void;
};

function normalizeCommentTree(comments: NoticeCommentItem[] = []): Array<{
  id: number;
  author: string;
  time: string;
  content: string;
  replies?: Array<{
    id: number;
    author: string;
    time: string;
    content: string;
    replies?: Array<{
      id: number;
      author: string;
      time: string;
      content: string;
    }>;
  }>;
}> {
  return comments.map((comment) => ({
    id: comment.id,
    author: comment.author,
    time: comment.time,
    content: comment.content,
    replies: normalizeCommentTree(comment.replies ?? []),
  }));
}

export function NoticeFeedList({
  items,
  isDark,
  expandedNoticeId,
  isRefreshing,
  onToggleExpand,
  onToggleLike,
  onToggleBookmark,
  onAddComment,
  onDelete,
  onEdit,
  onDownload,
}: NoticeFeedListProps) {
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>(
    {},
  );
  const [localCommentsByNoticeId, setLocalCommentsByNoticeId] = useState<
    Record<number, NoticeCommentItem[]>
  >({});

  useEffect(() => {
    setLocalCommentsByNoticeId((current) => {
      const next = { ...current };
      items.forEach((item) => {
        next[item.id] = item.comments ?? [];
      });
      return next;
    });
  }, [items]);

  const appendReplyToComments = (
    comments: NoticeCommentItem[] = [],
    parentCommentId: number | string,
    reply: NoticeCommentItem,
  ): NoticeCommentItem[] =>
    comments.map((comment) => {
      if (String(comment.id) === String(parentCommentId)) {
        return {
          ...comment,
          replies: [...(comment.replies ?? []), reply],
        };
      }

      if ((comment.replies ?? []).length > 0) {
        return {
          ...comment,
          replies: appendReplyToComments(
            comment.replies ?? [],
            parentCommentId,
            reply,
          ),
        };
      }

      return comment;
    });

  const handleLocalCommentAdd = (
    noticeId: number,
    content: string,
    parentCommentId?: number | string,
  ) => {
    const trimmed = content.trim();
    if (!trimmed) {
      return;
    }

    const createdAt = new Date().toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    const nextComment: NoticeCommentItem = {
      id: Date.now(),
      author: '나',
      time: createdAt,
      content: trimmed,
    };

    setLocalCommentsByNoticeId((current) => {
      const previous =
        current[noticeId] ??
        items.find((item) => item.id === noticeId)?.comments ??
        [];
      const nextComments =
        parentCommentId == null
          ? [...previous, nextComment]
          : appendReplyToComments(previous, parentCommentId, nextComment);

      return {
        ...current,
        [noticeId]: nextComments,
      };
    });

    onAddComment?.(noticeId, content, parentCommentId);
  };

  return (
    <FeedList
      items={items}
      renderItem={(item) => {
        const isExpanded = expandedNoticeId === item.id;
        const displayBody = isExpanded ? item.body : item.summary;
        const previewHtml = item.bodyHtml ?? item.body;
        const hasRichHtml = /<[^>]+>/.test(previewHtml);
        const itemComments =
          localCommentsByNoticeId[item.id] ?? item.comments ?? [];
        const attachmentFiles =
          item.attachmentDetails ??
          ((item.attachments ?? []).map((name, index) => ({
            id: `${item.id}-${index}`,
            name,
          })) as Array<{
            id: string;
            name: string;
            size?: number;
            boardFileId?: number | string | null;
            objectKey?: string | null;
            bucketName?: string | null;
          }>);

        return (
          <Card
            key={item.id}
            sx={{
              borderRadius: 3,
              border: `1px solid ${
                isDark ? 'rgba(148,163,184,0.18)' : 'rgba(148,163,184,0.18)'
              }`,
              boxShadow: 'none',
              bgcolor: item.highlight
                ? isDark
                  ? 'rgba(30, 41, 59, 0.9)'
                  : '#fff7ed'
                : isDark
                  ? 'rgba(15, 23, 42, 0.75)'
                  : '#ffffff',
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}
              >
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    background: isDark
                      ? 'linear-gradient(135deg, #60a5fa, #a78bfa)'
                      : 'linear-gradient(135deg, #dbeafe, #ede9fe)',
                    color: isDark ? '#eff6ff' : '#1f2937',
                  }}
                >
                  {item.meta.slice(1, 3)}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {item.meta.split('·')[0].trim()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.meta}
                  </Typography>
                </Box>
                <Stack
                  direction="row"
                  spacing={0.75}
                  sx={{ alignItems: 'center' }}
                >
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => onEdit?.(item)}
                    sx={{ minWidth: 0, px: 1 }}
                  >
                    수정
                  </Button>
                  <Button
                    size="small"
                    variant="text"
                    color="error"
                    onClick={() => onDelete?.(item.id)}
                    sx={{ minWidth: 0, px: 1 }}
                  >
                    삭제
                  </Button>
                  <Chip
                    label={item.state}
                    size="small"
                    sx={{
                      bgcolor: item.highlight
                        ? '#f59e0b'
                        : isDark
                          ? 'rgba(59,130,246,0.18)'
                          : '#dbeafe',
                      color: item.highlight ? '#fff' : '#2563eb',
                      fontWeight: 700,
                    }}
                  />
                </Stack>
              </Box>

              <Typography
                variant="h6"
                sx={{
                  fontSize: '1.25rem',
                  lineHeight: 1.4,
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  mb: 1.5,
                  color: 'text.primary',
                }}
              >
                {item.title}
              </Typography>

              {hasRichHtml ? (
                <Box
                  data-testid={`notice-preview-${item.id}`}
                  data-expanded={isExpanded}
                  sx={{
                    ...noticeContentStyles,
                    color: 'text.primary',
                    mb: 1.5,
                    overflow: isExpanded ? 'visible' : 'hidden',
                    maxHeight: isExpanded ? 'none' : '220px',
                    position: 'relative',
                    maskImage: isExpanded
                      ? 'none'
                      : 'linear-gradient(to bottom, black 72%, transparent 100%)',
                    WebkitMaskImage: isExpanded
                      ? 'none'
                      : 'linear-gradient(to bottom, black 72%, transparent 100%)',
                    '& br': { display: 'inline' },
                  }}
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              ) : (
                <Typography
                  data-testid={`notice-preview-${item.id}`}
                  data-expanded={isExpanded}
                  variant="body1"
                  sx={{
                    fontSize: '1rem',
                    fontWeight: 400,
                    color: 'text.primary',
                    lineHeight: 1.8,
                    whiteSpace: 'pre-line',
                    display: isExpanded ? 'block' : '-webkit-box',
                    WebkitLineClamp: isExpanded ? 'unset' : 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    mb: 1.5,
                  }}
                >
                  {displayBody}
                </Typography>
              )}

              {item.body !== item.summary && (
                <Button
                  variant="text"
                  size="small"
                  onClick={() => onToggleExpand?.(item.id)}
                  sx={{
                    minWidth: 0,
                    p: 0,
                    fontWeight: 700,
                    color: 'primary.main',
                    mb: 1.5,
                  }}
                >
                  {isExpanded ? '접기' : '더보기'}
                </Button>
              )}

              {attachmentFiles.length > 0 && (
                <Box sx={{ mt: 1.5 }}>
                  <Divider sx={{ my: 1.5 }} />
                  <AttachmentList
                    files={attachmentFiles.map((attachment) => ({
                      id: String(attachment.id),
                      name: attachment.name,
                      size: attachment.size,
                    }))}
                    isDark={isDark}
                    showActions
                    onDownload={(attachmentId) => {
                      const match = attachmentFiles.find(
                        (attachment) => String(attachment.id) === attachmentId,
                      );

                      if (!match) {
                        return;
                      }

                      onDownload?.(item.id, {
                        ...match,
                        name: match.name,
                      });
                    }}
                  />
                </Box>
              )}

              <Divider sx={{ my: 1.5 }} />

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                  flexWrap: 'wrap',
                  color: 'text.secondary',
                }}
              >
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<FavoriteBorderOutlinedIcon fontSize="small" />}
                    onClick={() => onToggleLike?.(item.id)}
                    sx={{
                      minWidth: 0,
                      px: 1,
                      py: 0.5,
                      borderRadius: 1.5,
                      color: isDark ? '#cbd5e1' : '#475569',
                      backgroundColor: 'transparent',
                      transition: 'all 0.2s ease',
                      '& .MuiButton-startIcon': {
                        marginRight: 0.5,
                        color: isDark ? '#f472b6' : '#ec4899',
                      },
                      '&:hover': {
                        backgroundColor: isDark
                          ? 'rgba(244, 114, 182, 0.12)'
                          : 'rgba(236, 72, 153, 0.08)',
                        color: isDark ? '#fce7f3' : '#be185d',
                        '& .MuiButton-startIcon': {
                          color: isDark ? '#f472b6' : '#db2777',
                        },
                      },
                    }}
                  >
                    {item.liked ? '좋아요 취소' : '좋아요'}{' '}
                    {item.likeCount ?? 0}
                  </Button>
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<BookmarkBorderOutlinedIcon fontSize="small" />}
                    onClick={() => onToggleBookmark?.(item.id)}
                    sx={{
                      minWidth: 0,
                      px: 1,
                      py: 0.5,
                      borderRadius: 1.5,
                      color: isDark ? '#cbd5e1' : '#475569',
                      backgroundColor: 'transparent',
                      transition: 'all 0.2s ease',
                      '& .MuiButton-startIcon': {
                        marginRight: 0.5,
                        color: isDark ? '#fbbf24' : '#f59e0b',
                      },
                      '&:hover': {
                        backgroundColor: isDark
                          ? 'rgba(251, 191, 36, 0.12)'
                          : 'rgba(245, 158, 11, 0.08)',
                        color: isDark ? '#fef3c7' : '#b45309',
                        '& .MuiButton-startIcon': {
                          color: isDark ? '#fbbf24' : '#d97706',
                        },
                      },
                    }}
                  >
                    {item.bookmarked ? '북마크 취소' : '북마크'}
                  </Button>
                </Stack>
                <Typography variant="body2">
                  댓글 {item.commentCount}
                </Typography>
              </Box>

              {itemComments.length > 0 && (
                <CommentThread
                  comments={normalizeCommentTree(itemComments)}
                  draft={commentDrafts[item.id] ?? ''}
                  onDraftChange={(value) =>
                    setCommentDrafts((current) => ({
                      ...current,
                      [item.id]: value,
                    }))
                  }
                  onSubmitComment={(content) => {
                    handleLocalCommentAdd(item.id, content);
                    setCommentDrafts((current) => ({
                      ...current,
                      [item.id]: '',
                    }));
                  }}
                  onSubmitReply={(commentId, content) => {
                    handleLocalCommentAdd(item.id, content, commentId);
                  }}
                  isDark={isDark}
                  showComposer
                  placeholder="댓글을 입력하세요"
                  composerLabel="댓글 입력"
                  submitLabel="등록"
                />
              )}

              {!itemComments.length && (
                <CommentThread
                  comments={[]}
                  draft={commentDrafts[item.id] ?? ''}
                  onDraftChange={(value) =>
                    setCommentDrafts((current) => ({
                      ...current,
                      [item.id]: value,
                    }))
                  }
                  onSubmitComment={(content) => {
                    handleLocalCommentAdd(item.id, content);
                    setCommentDrafts((current) => ({
                      ...current,
                      [item.id]: '',
                    }));
                  }}
                  onSubmitReply={(commentId, content) => {
                    handleLocalCommentAdd(item.id, content, commentId);
                  }}
                  isDark={isDark}
                  showComposer
                  placeholder="댓글을 입력하세요"
                  composerLabel="댓글 입력"
                  submitLabel="등록"
                />
              )}

              {isRefreshing && (
                <Typography variant="caption" color="text.secondary">
                  목록을 새로고침하는 중입니다...
                </Typography>
              )}
            </CardContent>
          </Card>
        );
      }}
    />
  );
}
