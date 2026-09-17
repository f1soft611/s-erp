import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';
import BookmarkBorderOutlinedIcon from '@mui/icons-material/BookmarkBorderOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { AttachmentList } from '../../../../../shared/components/feed/AttachmentList';
import { CommentThread } from '../../../../../shared/components/feed/CommentThread';
import type { FeedCommentItem } from '../../../../../shared/components/feed/CommentThread';
import { FeedList } from '../../../../../shared/components/feed/FeedList';
import type { NoticeCommentItem, NoticeFeedItem } from '../data/noticeData';
import { noticeContentStyles } from './noticeContentStyles';
import { sanitizeHtml } from '../../../../../shared/utils/sanitizeHtml';

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
    files?: File[],
  ) => Promise<void> | void;
  onEditComment?: (
    noticeId: number,
    commentId: number | string,
    content: string,
    files?: File[],
  ) => Promise<void> | void;
  onDeleteComment?: (
    noticeId: number,
    commentId: number | string,
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
  onLoadPreviousComments?: (
    noticeId: number,
    beforeCommentId: number | string,
  ) => Promise<{
    comments: NoticeCommentItem[];
    hasPrevious: boolean;
    nextBeforeCommentId?: number | string | null;
  }>;
  onDownloadCommentAttachment?: (
    commentId: number | string,
    attachmentId: string,
  ) => void;
  onDeleteCommentAttachment?: (
    noticeId: number,
    commentId: number | string,
    attachmentId: string,
  ) => void;
};

function normalizeCommentTree(
  comments: NoticeCommentItem[] = [],
): FeedCommentItem[] {
  return comments.map((comment) => ({
    id: comment.id,
    author: comment.author,
    time: comment.time,
    content: comment.content,
    isEditable: comment.isEditable,
    attachments: comment.attachments,
    replies: normalizeCommentTree(comment.replies ?? []),
  }));
}

function countComments(comments: NoticeCommentItem[]): number {
  return comments.reduce(
    (total, comment) => total + 1 + countComments(comment.replies ?? []),
    0,
  );
}

function mergeCommentTrees(
  current: NoticeCommentItem[],
  incoming: NoticeCommentItem[],
): NoticeCommentItem[] {
  const result = incoming.map((comment) => ({
    ...comment,
    replies: mergeCommentTrees([], comment.replies ?? []),
  }));
  const byId = new Map(result.map((comment) => [String(comment.id), comment]));

  current.forEach((comment) => {
    const existing = byId.get(String(comment.id));
    if (!existing) {
      const copy = {
        ...comment,
        replies: mergeCommentTrees([], comment.replies ?? []),
      };
      byId.set(String(copy.id), copy);
      result.push(copy);
      return;
    }

    existing.replies = mergeCommentTrees(
      existing.replies ?? [],
      comment.replies ?? [],
    );
  });

  return result;
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
  onEditComment,
  onDeleteComment,
  onDelete,
  onEdit,
  onDownload,
  onLoadPreviousComments,
  onDownloadCommentAttachment,
  onDeleteCommentAttachment,
}: NoticeFeedListProps) {
  const [localCommentsByNoticeId, setLocalCommentsByNoticeId] = useState<
    Record<number, NoticeCommentItem[]>
  >({});
  const [loadedPreviousByNoticeId, setLoadedPreviousByNoticeId] = useState<
    Record<number, boolean>
  >({});
  const [previousCursorByNoticeId, setPreviousCursorByNoticeId] = useState<
    Record<number, number | string | undefined>
  >({});
  const [loadingPreviousByNoticeId, setLoadingPreviousByNoticeId] = useState<
    Record<number, boolean>
  >({});
  const [exhaustedPreviousByNoticeId, setExhaustedPreviousByNoticeId] =
    useState<Record<number, boolean>>({});
  const [noticeMenuAnchor, setNoticeMenuAnchor] = useState<null | HTMLElement>(
    null,
  );
  const [noticeMenuId, setNoticeMenuId] = useState<number | null>(null);
  const serverCommentSnapshots = useRef<Record<number, string>>({});

  useEffect(() => {
    const changedByNoticeId = new Map<number, boolean>();
    items.forEach((item) => {
      const snapshot = JSON.stringify(item.comments ?? []);
      changedByNoticeId.set(
        item.id,
        serverCommentSnapshots.current[item.id] !== snapshot,
      );
    });

    setLocalCommentsByNoticeId((current) => {
      const next = { ...current };
      items.forEach((item) => {
        if (changedByNoticeId.get(item.id)) {
          next[item.id] = item.comments ?? [];
        }
      });
      return next;
    });
    setPreviousCursorByNoticeId((current) => {
      const next = { ...current };
      items.forEach((item) => {
        if (changedByNoticeId.get(item.id)) {
          next[item.id] = item.nextBeforeCommentId ?? undefined;
        }
      });
      return next;
    });

    setLoadedPreviousByNoticeId((current) => {
      const next = { ...current };
      items.forEach((item) => {
        if (changedByNoticeId.get(item.id)) {
          next[item.id] = false;
        }
      });
      return next;
    });
    setExhaustedPreviousByNoticeId((current) => {
      const next = { ...current };
      items.forEach((item) => {
        if (changedByNoticeId.get(item.id)) {
          next[item.id] = false;
        }
      });
      return next;
    });

    items.forEach((item) => {
      serverCommentSnapshots.current[item.id] = JSON.stringify(
        item.comments ?? [],
      );
    });
  }, [items]);

  const handleLocalCommentAdd = async (
    noticeId: number,
    content: string,
    parentCommentId?: number | string,
    files: File[] = [],
  ) => {
    if (!content.trim()) {
      return;
    }

    await onAddComment?.(noticeId, content, parentCommentId, files);
  };

  const handleLocalCommentEdit = async (
    noticeId: number,
    commentId: number | string,
    content: string,
    files: File[] = [],
  ) => {
    if (!content.trim()) {
      return;
    }

    await onEditComment?.(noticeId, commentId, content, files);
  };

  const handleLocalCommentDelete = async (
    noticeId: number,
    commentId: number | string,
  ) => {
    await onDeleteComment?.(noticeId, commentId);
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
        const visibleComments = loadedPreviousByNoticeId[item.id]
          ? itemComments
          : itemComments.slice(0, 3);
        const canLoadPrevious =
          !exhaustedPreviousByNoticeId[item.id] &&
          (item.hasPreviousComments === true ||
            item.commentCount > countComments(visibleComments));
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
                  <IconButton
                    size="small"
                    aria-label={`공지 메뉴 ${item.title}`}
                    onClick={(event) => {
                      setNoticeMenuId(item.id);
                      setNoticeMenuAnchor(event.currentTarget);
                    }}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                  <Menu
                    anchorEl={noticeMenuAnchor}
                    open={noticeMenuId === item.id}
                    onClose={() => {
                      setNoticeMenuAnchor(null);
                      setNoticeMenuId(null);
                    }}
                  >
                    <MenuItem
                      onClick={() => {
                        setNoticeMenuAnchor(null);
                        setNoticeMenuId(null);
                        onEdit?.(item);
                      }}
                    >
                      공지 수정
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        setNoticeMenuAnchor(null);
                        setNoticeMenuId(null);
                        onDelete?.(item.id);
                      }}
                    >
                      공지 삭제
                    </MenuItem>
                  </Menu>
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
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(previewHtml),
                  }}
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

              {canLoadPrevious && (
                <Button
                  size="small"
                  variant="text"
                  aria-label="이전 댓글 불러오기"
                  disabled={loadingPreviousByNoticeId[item.id]}
                  onClick={async () => {
                    if (loadingPreviousByNoticeId[item.id]) return;
                    const cursor =
                      previousCursorByNoticeId[item.id] ??
                      visibleComments[0]?.id;
                    if (!cursor || !onLoadPreviousComments) return;

                    setLoadingPreviousByNoticeId((current) => ({
                      ...current,
                      [item.id]: true,
                    }));
                    try {
                      const previousResult = await onLoadPreviousComments(
                        item.id,
                        cursor,
                      );
                      const previous = previousResult.comments;
                      const currentComments =
                        localCommentsByNoticeId[item.id] ?? itemComments;
                      const merged = mergeCommentTrees(
                        currentComments,
                        previous,
                      );
                      const nextCursor = previousResult.nextBeforeCommentId;
                      const hasNewComments =
                        countComments(merged) > countComments(currentComments);
                      setLocalCommentsByNoticeId((current) => ({
                        ...current,
                        [item.id]: merged,
                      }));
                      setPreviousCursorByNoticeId((cursors) => ({
                        ...cursors,
                        [item.id]: nextCursor ?? undefined,
                      }));
                      setLoadedPreviousByNoticeId((loaded) => ({
                        ...loaded,
                        [item.id]: true,
                      }));
                      if (
                        !previousResult.hasPrevious ||
                        !hasNewComments ||
                        nextCursor == null ||
                        String(nextCursor) === String(cursor)
                      ) {
                        setExhaustedPreviousByNoticeId((exhausted) => ({
                          ...exhausted,
                          [item.id]: true,
                        }));
                      }
                    } finally {
                      setLoadingPreviousByNoticeId((current) => ({
                        ...current,
                        [item.id]: false,
                      }));
                    }
                  }}
                  sx={{ mt: 1.5 }}
                >
                  이전 댓글 불러오기
                </Button>
              )}

              <CommentThread
                comments={normalizeCommentTree(visibleComments)}
                onSubmitComment={async (content, files) => {
                  await handleLocalCommentAdd(
                    item.id,
                    content,
                    undefined,
                    files,
                  );
                }}
                onSubmitReply={async (commentId, content, files) => {
                  await handleLocalCommentAdd(
                    item.id,
                    content,
                    commentId,
                    files,
                  );
                }}
                onEditComment={async (commentId, content, files) => {
                  await handleLocalCommentEdit(
                    item.id,
                    commentId,
                    content,
                    files,
                  );
                }}
                onDeleteComment={async (commentId) => {
                  await handleLocalCommentDelete(item.id, commentId);
                }}
                onDownloadAttachment={(commentId, attachmentId) =>
                  onDownloadCommentAttachment?.(commentId, attachmentId)
                }
                onDeleteAttachment={(commentId, attachmentId) =>
                  onDeleteCommentAttachment?.(item.id, commentId, attachmentId)
                }
                isDark={isDark}
                showComposer
                placeholder="댓글을 입력하세요"
                composerLabel="댓글 입력"
                submitLabel="등록"
              />

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
