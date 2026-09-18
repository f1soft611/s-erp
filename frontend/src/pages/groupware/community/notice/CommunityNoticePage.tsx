import {
  Box,
  Card,
  CardContent,
  Container,
  Skeleton,
  Stack,
  useTheme,
} from '@mui/material';
import AddOutlined from '@mui/icons-material/AddOutlined';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { useNotification } from '../../../../shared/context/NotificationContext';
import type {
  ModuleItem,
  PageContent,
} from '../../../dashboard/types/dashboard';
import {
  NoticeComposerDialog,
  type NoticeComposerDraftAttachment,
} from './components/NoticeComposerDialog';
import { NoticeFeedList } from './components/NoticeFeedList';
import { NoticeFilterBar } from './components/NoticeFilterBar';
import { NoticeSummaryPanel } from './components/NoticeSummaryPanel';
import { summaryStats } from './data/noticeData';
import type { NoticeCommentItem, NoticeFeedItem } from './data/noticeData';
import {
  createNoticePost,
  deleteNoticePost,
  downloadNoticeAttachment,
  fetchNoticePostDetail,
  fetchNoticePosts,
  deleteNoticeAttachment,
  updateNoticePost,
  uploadNoticeAttachment,
} from './services/noticeBoardService';
import type { NoticeBoardPostApi } from './services/noticeBoardService';
import type { NoticeBoardAttachmentApi } from './services/noticeBoardService';
import {
  createCommonComment,
  deleteCommonComment,
  deleteCommonFile,
  downloadCommonFile,
  fetchCommonComments,
  uploadCommonFile,
  updateCommonComment,
} from '../../../../shared/services/commonContentApi';
import type { CommonFileItem } from '../../../../shared/services/commonContentApi';
import { sanitizeHtml } from '../../../../shared/utils/sanitizeHtml';

type CommunityNoticePageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
};

export const toPlainText = (value = '') =>
  value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?p\s*>/gi, '\n')
    .replace(/<\/?li\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const formatNoticeMeta = (post: NoticeBoardPostApi): string => {
  const writerName = post.writerName || '관리자';
  const createdAt = post.createdAt
    ? new Date(post.createdAt).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    : '날짜 미상';
  const viewCount = Number(post.viewCount ?? 0);
  return `${writerName} · ${createdAt} · 조회 ${viewCount}`;
};

const formatCommentTime = (value: string | Date | null | undefined): string => {
  if (!value) {
    return '방금';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '방금';
  }

  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const countNestedComments = (comments: NoticeCommentItem[] = []): number =>
  comments.reduce(
    (total, comment) =>
      total +
      (comment.isDeleted ? 0 : 1) +
      countNestedComments(comment.replies ?? []),
    0,
  );

const adjustCommentCount = (item: NoticeFeedItem, delta: number): number => {
  const currentCount =
    item.commentCount == null
      ? countNestedComments(item.comments ?? [])
      : Number(item.commentCount) || 0;
  return Math.max(0, currentCount + delta);
};

const toNoticeCommentTree = (
  records: Array<{
    commentId?: number | string | null;
    parentCommentId?: number | string | null;
    deletedYn?: string | null;
    writerName?: string | null;
    writerId?: string | null;
    content?: string | null;
    createdAt?: string | Date | null;
    attachments?: CommonFileItem[];
  }> = [],
): NoticeCommentItem[] => {
  const commentMap = new Map<number, NoticeCommentItem>();
  const roots: NoticeCommentItem[] = [];

  records.forEach((record) => {
    const commentId = Number(record.commentId ?? 0);
    if (!commentId) {
      return;
    }

    const item: NoticeCommentItem = {
      id: commentId,
      author:
        record.deletedYn === 'Y'
          ? '삭제된 댓글'
          : record.writerName || record.writerId || '사용자',
      time: formatCommentTime(record.createdAt),
      content:
        record.deletedYn === 'Y'
          ? '[삭제된 댓글입니다.]'
          : (record.content ?? ''),
      isDeleted: record.deletedYn === 'Y',
      isEditable: record.deletedYn !== 'Y',
      attachments: (record.attachments ?? []).map((file) => ({
        id: String(file.fileId ?? file.objectKey ?? file.fileName ?? ''),
        name: file.fileName ?? '첨부파일',
        size: Number(file.fileSize ?? 0) || undefined,
      })),
      replies: [],
    };

    commentMap.set(commentId, item);
  });

  records.forEach((record) => {
    const commentId = Number(record.commentId ?? 0);
    const item = commentMap.get(commentId);
    if (!item) {
      return;
    }

    const parentCommentId =
      record.parentCommentId == null ? null : Number(record.parentCommentId);

    if (parentCommentId && commentMap.has(parentCommentId)) {
      const parent = commentMap.get(parentCommentId);
      if (parent) {
        parent.replies = [...(parent.replies ?? []), item];
        return;
      }
    }

    roots.push(item);
  });

  return roots;
};

const toNoticeFeedItem = (post: NoticeBoardPostApi): NoticeFeedItem => {
  const editorHtml = post.contentsHtml ?? post.contents ?? '';
  const bodyText = toPlainText(editorHtml || post.contentsText || '');
  const normalizedSummary = bodyText.replace(/\s+/g, ' ').trim();
  const summaryText = normalizedSummary || '공지 내용을 확인해 주세요.';
  const bodyHtml = editorHtml.trim();
  const attachments = (post.attachments ?? []).map((attachment) => ({
    id: String(
      attachment.boardFileId ??
        attachment.fileName ??
        attachment.objectKey ??
        Math.random(),
    ),
    name: attachment.fileName ?? '첨부파일',
    size: Number(attachment.fileSize ?? 0) || undefined,
    boardFileId: attachment.boardFileId,
    objectKey: attachment.objectKey,
    bucketName: attachment.bucketName,
  }));
  const comments = toNoticeCommentTree(post.comments ?? []);

  return {
    id: Number(post.postId ?? 0),
    title: post.title ?? '제목 없음',
    meta: formatNoticeMeta(post),
    state: post.isNotice === 'Y' ? '중요 공지' : '공지',
    summary: summaryText,
    summaryHtml: bodyHtml,
    body: bodyText || '공지 내용을 확인해 주세요.',
    bodyHtml,
    attachments: attachments.map((attachment) => attachment.name),
    attachmentDetails: attachments,
    comments,
    commentCount:
      post.commentCount == null
        ? countNestedComments(comments)
        : Number(post.commentCount) || 0,
    hasPreviousComments: post.hasPreviousComments,
    nextBeforeCommentId: post.nextBeforeCommentId,
    likeCount: 0,
    liked: false,
    bookmarked: false,
    highlight: post.isNotice === 'Y',
  };
};

const toNoticeAttachmentApi = (
  attachment: NonNullable<NoticeFeedItem['attachmentDetails']>[number],
): NoticeBoardPostApi['attachments'] extends Array<infer T> | undefined
  ? T
  : never => ({
  boardFileId: attachment.boardFileId,
  fileName: attachment.name,
  fileSize: attachment.size,
  objectKey: attachment.objectKey,
  bucketName: attachment.bucketName,
});

const appendCommentToTree = (
  comments: NoticeCommentItem[] = [],
  parentCommentId: number | string | null | undefined,
  comment: NoticeCommentItem,
): NoticeCommentItem[] => {
  if (parentCommentId == null) {
    return [comment, ...comments];
  }

  return comments.map((current) =>
    String(current.id) === String(parentCommentId)
      ? { ...current, replies: [...(current.replies ?? []), comment] }
      : {
          ...current,
          replies: appendCommentToTree(
            current.replies ?? [],
            parentCommentId,
            comment,
          ),
        },
  );
};

export const insertNoticeReplyAfter = (
  comments: NoticeCommentItem[] = [],
  targetCommentId: number | string,
  comment: NoticeCommentItem,
): NoticeCommentItem[] => {
  const nextComments: NoticeCommentItem[] = [];

  comments.forEach((current) => {
    nextComments.push(current);
    if (String(current.id) === String(targetCommentId)) {
      nextComments.push({ ...comment, replies: [] });
      return;
    }

    if (current.replies?.length) {
      nextComments[nextComments.length - 1] = {
        ...current,
        replies: insertNoticeReplyAfter(
          current.replies,
          targetCommentId,
          comment,
        ),
      };
    }
  });

  return nextComments;
};

const updateCommentInTree = (
  comments: NoticeCommentItem[] = [],
  commentId: number | string,
  content: string,
  attachments?: NoticeCommentItem['attachments'],
): NoticeCommentItem[] =>
  comments.map((comment) =>
    String(comment.id) === String(commentId)
      ? {
          ...comment,
          content,
          ...(attachments
            ? { attachments: [...(comment.attachments ?? []), ...attachments] }
            : {}),
        }
      : {
          ...comment,
          replies: updateCommentInTree(
            comment.replies ?? [],
            commentId,
            content,
            attachments,
          ),
        },
  );

const deleteCommentFromTree = (
  comments: NoticeCommentItem[] = [],
  commentId: number | string,
): NoticeCommentItem[] =>
  comments.map((comment) => {
    if (String(comment.id) === String(commentId)) {
      return {
        ...comment,
        author: '삭제된 댓글',
        content: '[삭제된 댓글입니다.]',
        isDeleted: true,
        isEditable: false,
        attachments: [],
      };
    }

    return {
      ...comment,
      replies: deleteCommentFromTree(comment.replies ?? [], commentId),
    };
  });

const removeAttachmentFromCommentTree = (
  comments: NoticeCommentItem[] = [],
  commentId: number | string,
  attachmentId: string,
): NoticeCommentItem[] =>
  comments.map((comment) =>
    String(comment.id) === String(commentId)
      ? {
          ...comment,
          attachments: (comment.attachments ?? []).filter(
            (attachment) => String(attachment.id) !== String(attachmentId),
          ),
        }
      : {
          ...comment,
          replies: removeAttachmentFromCommentTree(
            comment.replies ?? [],
            commentId,
            attachmentId,
          ),
        },
  );

const toNoticeCommentItem = (
  comment: NonNullable<NoticeBoardPostApi['comments']>[number],
): NoticeCommentItem | undefined => {
  const mapped = toNoticeCommentTree([comment]);
  return mapped[0];
};

const noticeFailureMessage =
  '공지사항 목록을 불러오지 못했습니다.\n잠시 후 다시 시도해 주세요.';

const deleteUploadedNoticeAttachments = async (
  postId: number,
  attachments: NoticeBoardAttachmentApi[],
) => {
  await Promise.allSettled(
    attachments
      .map((attachment) => attachment.boardFileId)
      .filter((fileId): fileId is number | string => fileId != null)
      .map((fileId) => deleteNoticeAttachment(fileId, postId)),
  );
};

const deleteUploadedCommentFiles = async (
  commentId: number | string,
  files: CommonFileItem[],
) => {
  await Promise.allSettled(
    files
      .map((file) => file.fileId)
      .filter((fileId): fileId is number | string => fileId != null)
      .map((fileId) => deleteCommonFile('NOTICE_COMMENT', commentId, fileId)),
  );
};

export function CommunityNoticePage({
  selectedModule,
  currentMenuName,
  content,
}: CommunityNoticePageProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { showError, showSuccess } = useNotification();
  const hasCreatePermission = true;
  const [expandedNoticeId, setExpandedNoticeId] = useState<number | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [editorDraft, setEditorDraft] = useState<{
    id?: number;
    title: string;
    body: string;
    attachments: NoticeComposerDraftAttachment[];
  }>({
    title: '',
    body: '',
    attachments: [],
  });
  const [noticeItems, setNoticeItems] = useState<NoticeFeedItem[]>([]);
  const [serverItemRevision, setServerItemRevision] = useState(0);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadNoticePosts = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsInitialLoading(true);
      }
      setErrorMessage(null);

      try {
        const posts = await fetchNoticePosts(1, 20, '');
        setNoticeItems(posts.map(toNoticeFeedItem));
        setServerItemRevision((revision) => revision + 1);
      } catch (error) {
        setErrorMessage(noticeFailureMessage);
        if (!silent) {
          setNoticeItems([]);
        }
      } finally {
        if (silent) {
          setIsRefreshing(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    const initialLoadingTimer = window.setTimeout(() => {
      setIsInitialLoading(false);
    }, 1500);

    void loadNoticePosts();

    return () => {
      window.clearTimeout(initialLoadingTimer);
    };
  }, [loadNoticePosts]);

  const handleCreateNotice = async ({
    title,
    body,
    bodyJson,
    bodyText,
    attachments,
    removedAttachmentIds,
  }: {
    title: string;
    body: string;
    bodyJson?: string;
    bodyText?: string;
    attachments: NoticeComposerDraftAttachment[];
    removedAttachmentIds: Array<number | string>;
  }) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return;
    }

    const safeHtml = sanitizeHtml(body || '<p></p>');
    const safeJson = bodyJson || JSON.stringify({ type: 'doc', content: [] });
    const safeText = (bodyText ?? toPlainText(safeHtml)).trim();

    const updatedDraft = { title: trimmedTitle, body: safeHtml, attachments };
    const existingId = editorDraft.id;
    let attachmentDeletionFailed = false;

    try {
      if (existingId) {
        const updated = await updateNoticePost(existingId, {
          title: trimmedTitle,
          contents: safeHtml,
          contentsHtml: safeHtml,
          contentsJson: safeJson,
          contentsText: safeText,
          writerId: 'admin01',
          writerName: '관리자',
          isNotice: 'Y',
        });

        const uploadableFiles = attachments
          .map((attachment) => attachment.file)
          .filter((file): file is File => Boolean(file));

        const uploadedAttachments: NoticeBoardAttachmentApi[] = [];
        try {
          for (const file of uploadableFiles) {
            uploadedAttachments.push(
              await uploadNoticeAttachment(existingId, file),
            );
          }
        } catch (error) {
          await deleteUploadedNoticeAttachments(
            existingId,
            uploadedAttachments,
          );
          throw error;
        }

        try {
          for (const boardFileId of removedAttachmentIds) {
            await deleteNoticeAttachment(boardFileId, existingId);
          }
        } catch (error) {
          attachmentDeletionFailed = true;
          throw error;
        }

        setNoticeItems((current) =>
          current.map((item) => {
            if (item.id !== existingId) {
              return item;
            }

            const nextPost: NoticeBoardPostApi = {
              ...updated,
              postId: existingId,
              attachments: [
                ...attachments
                  .filter((attachment) => !attachment.file)
                  .map(toNoticeAttachmentApi),
                ...uploadedAttachments,
              ],
              comments: updated.comments,
              commentCount: updated.commentCount ?? item.commentCount,
            };
            const nextItem = toNoticeFeedItem(nextPost);

            return {
              ...nextItem,
              comments: updated.comments ? nextItem.comments : item.comments,
              commentCount: updated.comments
                ? nextItem.commentCount
                : item.commentCount,
            };
          }),
        );
        setServerItemRevision((revision) => revision + 1);

        showSuccess('공지사항이 수정되었습니다.');
      } else {
        const created = await createNoticePost({
          title: trimmedTitle,
          contents: safeHtml,
          contentsHtml: safeHtml,
          contentsJson: safeJson,
          contentsText: safeText,
          writerId: 'admin01',
          writerName: '관리자',
          isNotice: 'Y',
        });

        const createdId = Number(created.postId ?? 0);
        const uploadedAttachments: NoticeBoardAttachmentApi[] = [];
        if (createdId > 0) {
          const uploadableFiles = attachments
            .map((attachment) => attachment.file)
            .filter((file): file is File => Boolean(file));

          try {
            for (const file of uploadableFiles) {
              uploadedAttachments.push(
                await uploadNoticeAttachment(createdId, file),
              );
            }
          } catch (error) {
            await deleteUploadedNoticeAttachments(
              createdId,
              uploadedAttachments,
            );
            throw error;
          }
        }

        if (createdId > 0) {
          await loadNoticePosts({ silent: true });
        }

        showSuccess('공지사항이 등록되었습니다.');
      }
    } catch (error) {
      showError(
        attachmentDeletionFailed
          ? '공지사항 첨부파일 삭제에 실패했습니다.'
          : '공지사항 저장에 실패했습니다.',
      );
      throw error;
    }

    setEditorDraft({ title: '', body: '', attachments: [] });
    setIsComposerOpen(false);
    return updatedDraft;
  };

  const hasVisibleNoticeList = noticeItems.length > 0 || !errorMessage;

  const pageActionGroups: PermissionActionGroupDefinition[] = useMemo(
    () => [
      {
        key: 'write',
        actions: [
          {
            key: 'create-notice',
            label: '새 공지 작성',
            icon: AddOutlined,
            visible: hasCreatePermission,
            onClick: () => setIsComposerOpen(true),
          },
        ],
      },
    ],
    [hasCreatePermission],
  );

  const handleDeleteNotice = async (noticeId: number) => {
    try {
      await deleteNoticePost(noticeId);
      setNoticeItems((current) =>
        current.filter((item) => item.id !== noticeId),
      );
      showSuccess('공지가 삭제되었습니다.');
    } catch (error) {
      showError('공지 삭제에 실패했습니다.');
    }
  };

  const handleToggleLike = useCallback(
    (noticeId: number) => {
      setNoticeItems((current) =>
        current.map((item) => {
          if (item.id !== noticeId) {
            return item;
          }

          const nextLiked = !item.liked;
          return {
            ...item,
            liked: nextLiked,
            likeCount: Math.max(
              0,
              (item.likeCount ?? 0) + (nextLiked ? 1 : -1),
            ),
          };
        }),
      );
      showSuccess('좋아요 상태가 반영되었습니다.');
    },
    [showSuccess],
  );

  const handleToggleBookmark = useCallback(
    (noticeId: number) => {
      setNoticeItems((current) =>
        current.map((item) =>
          item.id === noticeId
            ? { ...item, bookmarked: !item.bookmarked }
            : item,
        ),
      );
      showSuccess('북마크 상태가 반영되었습니다.');
    },
    [showSuccess],
  );

  const handleAddComment = useCallback(
    async (
      noticeId: number,
      content: string,
      parentCommentId?: number | string,
      files: File[] = [],
      displayParentCommentId?: number | string,
    ) => {
      if (!toPlainText(content).trim()) {
        return;
      }

      try {
        const created = await createCommonComment(
          'NOTICE',
          noticeId,
          content,
          parentCommentId,
        );
        const createdId = Number(created.commentId ?? 0);
        const uploadedFiles: CommonFileItem[] = [];
        try {
          for (const file of files) {
            if (createdId > 0) {
              uploadedFiles.push(
                await uploadCommonFile('NOTICE_COMMENT', createdId, file),
              );
            }
          }
        } catch (error) {
          if (createdId > 0) {
            await deleteUploadedCommentFiles(createdId, uploadedFiles);
          }
          throw error;
        }
        const nextComment = toNoticeCommentItem({
          ...created,
          attachments: uploadedFiles,
        });
        if (nextComment) {
          setNoticeItems((current) =>
            current.map((item) => {
              if (item.id !== noticeId) {
                return item;
              }

              const comments =
                displayParentCommentId != null &&
                String(displayParentCommentId) !== String(parentCommentId)
                  ? insertNoticeReplyAfter(
                      item.comments ?? [],
                      displayParentCommentId,
                      nextComment,
                    )
                  : appendCommentToTree(
                      item.comments ?? [],
                      parentCommentId,
                      nextComment,
                    );
              return {
                ...item,
                comments,
                commentCount: adjustCommentCount(item, 1),
              };
            }),
          );
        }
        showSuccess(
          parentCommentId != null
            ? '답글이 등록되었습니다.'
            : '댓글이 등록되었습니다.',
        );
      } catch (error) {
        showError(
          parentCommentId != null
            ? '답글 저장에 실패했습니다.'
            : '댓글 저장에 실패했습니다.',
        );
        throw error;
      }
    },
    [showError, showSuccess],
  );

  const handleUpdateComment = useCallback(
    async (
      noticeId: number,
      commentId: number | string,
      content: string,
      files: File[] = [],
    ) => {
      if (!toPlainText(content).trim()) {
        return;
      }

      try {
        const updated = await updateCommonComment(
          'NOTICE',
          noticeId,
          commentId,
          content,
        );
        const uploadedFiles: CommonFileItem[] = [];
        try {
          for (const file of files) {
            uploadedFiles.push(
              await uploadCommonFile('NOTICE_COMMENT', commentId, file),
            );
          }
        } catch (error) {
          await deleteUploadedCommentFiles(commentId, uploadedFiles);
          throw error;
        }
        const nextAttachments = uploadedFiles.map((file) => ({
          id: String(file.fileId ?? file.objectKey ?? file.fileName ?? ''),
          name: file.fileName ?? '첨부파일',
          size: Number(file.fileSize ?? 0) || undefined,
        }));
        const nextContent = updated.content ?? content;
        setNoticeItems((current) =>
          current.map((item) =>
            item.id === noticeId
              ? {
                  ...item,
                  comments: updateCommentInTree(
                    item.comments ?? [],
                    commentId,
                    nextContent,
                    nextAttachments,
                  ),
                }
              : item,
          ),
        );
        showSuccess('댓글이 수정되었습니다.');
      } catch (error) {
        showError('댓글 수정에 실패했습니다.');
        throw error;
      }
    },
    [showError, showSuccess],
  );

  const handleDeleteComment = useCallback(
    async (noticeId: number, commentId: number | string) => {
      try {
        await deleteCommonComment('NOTICE', noticeId, commentId);
        setNoticeItems((current) =>
          current.map((item) => {
            if (item.id !== noticeId) {
              return item;
            }

            const comments = deleteCommentFromTree(
              item.comments ?? [],
              commentId,
            );
            return {
              ...item,
              comments,
              commentCount: adjustCommentCount(item, -1),
            };
          }),
        );
        showSuccess('댓글이 삭제되었습니다.');
      } catch (error) {
        showError('댓글 삭제에 실패했습니다.');
        throw error;
      }
    },
    [showError, showSuccess],
  );

  const handleLoadPreviousComments = useCallback(
    async (noticeId: number, beforeCommentId: number | string) => {
      const records = await fetchCommonComments('NOTICE', noticeId, {
        limit: 3,
        beforeCommentId,
      });
      return {
        comments: toNoticeCommentTree(records.comments),
        hasPrevious: records.hasPrevious,
        nextBeforeCommentId: records.nextBeforeCommentId,
      };
    },
    [],
  );

  const handleDownloadCommentAttachment = useCallback(
    (commentId: number | string, attachmentId: string) => {
      void downloadCommonFile('NOTICE_COMMENT', commentId, attachmentId);
    },
    [],
  );

  const handleDeleteCommentAttachment = useCallback(
    async (
      noticeId: number,
      commentId: number | string,
      attachmentId: string,
    ) => {
      try {
        await deleteCommonFile('NOTICE_COMMENT', commentId, attachmentId);
        setNoticeItems((current) =>
          current.map((item) =>
            item.id === noticeId
              ? {
                  ...item,
                  comments: removeAttachmentFromCommentTree(
                    item.comments ?? [],
                    commentId,
                    attachmentId,
                  ),
                }
              : item,
          ),
        );
        showSuccess('댓글 첨부파일이 삭제되었습니다.');
      } catch (error) {
        showError('댓글 첨부파일 삭제에 실패했습니다.');
        throw error;
      }
    },
    [showError, showSuccess],
  );

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <PageHeader
        breadcrumbItems={[selectedModule.name, '커뮤니티', currentMenuName]}
        description={content.description}
        actionGroups={hasCreatePermission ? pageActionGroups : undefined}
      />

      <NoticeFilterBar isDark={isDark} />
      <PageMessageArea
        message={errorMessage ?? ''}
        onClose={() => setErrorMessage(null)}
      />

      <Box
        sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}
      >
        <Container maxWidth="xl" sx={{ py: 3 }}>
          {isInitialLoading ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1.7fr 0.9fr' },
                gap: 2,
              }}
            >
              <Stack spacing={2} data-testid="notice-feed-skeleton">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Card
                    key={`notice-skeleton-${index}`}
                    sx={{
                      borderRadius: 3,
                      border: `1px solid ${
                        isDark
                          ? 'rgba(148,163,184,0.18)'
                          : 'rgba(148,163,184,0.18)'
                      }`,
                    }}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          mb: 2,
                        }}
                      >
                        <Skeleton variant="circular" width={36} height={36} />
                        <Box sx={{ flex: 1 }}>
                          <Skeleton variant="text" width="28%" height={20} />
                          <Skeleton
                            variant="text"
                            width="48%"
                            height={18}
                            sx={{ mt: 0.5 }}
                          />
                        </Box>
                        <Skeleton
                          variant="rectangular"
                          width={72}
                          height={28}
                          sx={{ borderRadius: 999 }}
                        />
                      </Box>
                      <Skeleton
                        variant="text"
                        width="60%"
                        height={28}
                        sx={{ mb: 1.5 }}
                      />
                      <Skeleton variant="text" height={20} />
                      <Skeleton variant="text" height={20} width="92%" />
                      <Skeleton variant="text" height={20} width="86%" />
                      <Box sx={{ display: 'flex', gap: 1, mt: 2.5 }}>
                        <Skeleton
                          variant="rectangular"
                          width={90}
                          height={30}
                          sx={{ borderRadius: 1 }}
                        />
                        <Skeleton
                          variant="rectangular"
                          width={90}
                          height={30}
                          sx={{ borderRadius: 1 }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>

              <Stack spacing={2} data-testid="notice-summary-skeleton">
                <Card
                  sx={{
                    borderRadius: 3,
                    border: `1px solid ${
                      isDark
                        ? 'rgba(148,163,184,0.18)'
                        : 'rgba(148,163,184,0.18)'
                    }`,
                  }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 2,
                      }}
                    >
                      <Skeleton variant="text" width="36%" height={28} />
                      <Skeleton
                        variant="rectangular"
                        width={52}
                        height={24}
                        sx={{ borderRadius: 999 }}
                      />
                    </Box>
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Box
                        key={`summary-row-${index}`}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          py: 1.2,
                        }}
                      >
                        <Skeleton variant="text" width="38%" height={20} />
                        <Skeleton variant="text" width="18%" height={20} />
                      </Box>
                    ))}
                  </CardContent>
                </Card>

                <Card
                  sx={{
                    borderRadius: 3,
                    border: `1px solid ${
                      isDark
                        ? 'rgba(148,163,184,0.18)'
                        : 'rgba(148,163,184,0.18)'
                    }`,
                  }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Skeleton
                      variant="text"
                      width="38%"
                      height={28}
                      sx={{ mb: 1.5 }}
                    />
                    {Array.from({ length: 3 }).map((_, index) => (
                      <Box
                        key={`issue-row-${index}`}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 1,
                          p: 1.2,
                          borderRadius: 2,
                          mb: 1.25,
                          bgcolor: isDark
                            ? 'rgba(148,163,184,0.06)'
                            : '#f8fafc',
                        }}
                      >
                        <Skeleton variant="text" width="58%" height={20} />
                        <Skeleton
                          variant="rectangular"
                          width={52}
                          height={24}
                          sx={{ borderRadius: 999 }}
                        />
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Stack>
            </Box>
          ) : errorMessage &&
            !isRefreshing &&
            !hasVisibleNoticeList ? null : noticeItems.length === 0 ? (
            <Box
              sx={{
                py: 6,
                textAlign: 'center',
                color: 'text.secondary',
                border: `1px dashed ${isDark ? 'rgba(148,163,184,0.38)' : 'rgba(148,163,184,0.6)'}`,
                borderRadius: 2,
                bgcolor: isDark
                  ? 'rgba(15,23,42,0.35)'
                  : 'rgba(248,250,252,0.8)',
              }}
            >
              등록된 공지가 없습니다.
            </Box>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1.7fr 0.9fr' },
                gap: 2,
              }}
            >
              <NoticeFeedList
                items={noticeItems}
                isDark={isDark}
                isRefreshing={isRefreshing}
                expandedNoticeId={expandedNoticeId}
                onToggleExpand={(id) =>
                  setExpandedNoticeId((current) => (current === id ? null : id))
                }
                onToggleLike={handleToggleLike}
                onToggleBookmark={handleToggleBookmark}
                onAddComment={handleAddComment}
                onEditComment={handleUpdateComment}
                onDeleteComment={handleDeleteComment}
                onLoadPreviousComments={handleLoadPreviousComments}
                onLoadPreviousCommentsError={() =>
                  showError('이전 댓글을 불러오지 못했습니다.')
                }
                onDownloadCommentAttachment={handleDownloadCommentAttachment}
                onDeleteCommentAttachment={handleDeleteCommentAttachment}
                serverItemRevision={serverItemRevision}
                onDelete={handleDeleteNotice}
                onEdit={async (item) => {
                  const mappedAttachments = (item.attachmentDetails ?? []).map(
                    (attachment) => ({
                      id: String(
                        attachment.boardFileId ??
                          attachment.objectKey ??
                          `${item.id}-${Math.random()}`,
                      ),
                      name: attachment.name,
                      size: attachment.size,
                      extension:
                        attachment.name.split('.').pop()?.toUpperCase() ||
                        undefined,
                      boardFileId: attachment.boardFileId,
                      objectKey: attachment.objectKey,
                      bucketName: attachment.bucketName,
                      postId: item.id,
                    }),
                  );

                  setEditorDraft({
                    id: item.id,
                    title: item.title,
                    body: item.bodyHtml ?? item.body,
                    attachments: mappedAttachments,
                  });
                  setIsComposerOpen(true);
                }}
                onDownload={(noticeId, file) => {
                  void (async () => {
                    const detail = await fetchNoticePostDetail(noticeId);
                    const nextAttachment = (detail.attachments ?? []).find(
                      (attachment) =>
                        String(attachment.boardFileId ?? '') ===
                          String(file.boardFileId ?? '') ||
                        (attachment.fileName ?? '') === file.name,
                    );

                    if (nextAttachment) {
                      await downloadNoticeAttachment({
                        ...nextAttachment,
                        postId: noticeId,
                      });
                    }
                  })();
                }}
              />
              <NoticeSummaryPanel stats={summaryStats} isDark={isDark} />
            </Box>
          )}
        </Container>
      </Box>

      <NoticeComposerDialog
        open={isComposerOpen}
        isDark={isDark}
        onClose={() => {
          setEditorDraft({ title: '', body: '', attachments: [] });
          setIsComposerOpen(false);
        }}
        onSubmit={handleCreateNotice}
        defaultTitle={editorDraft.title}
        defaultBody={editorDraft.body}
        defaultAttachments={editorDraft.attachments}
      />
    </Box>
  );
}
