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
import type { NoticeFeedItem } from './data/noticeData';
import {
  createNoticePost,
  deleteNoticePost,
  downloadNoticeAttachment,
  fetchNoticePostDetail,
  fetchNoticePosts,
  updateNoticePost,
  uploadNoticeAttachment,
} from './services/noticeBoardService';
import type { NoticeBoardPostApi } from './services/noticeBoardService';

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
    commentCount: 0,
    likeCount: 0,
    liked: false,
    bookmarked: false,
    highlight: post.isNotice === 'Y',
  };
};

const noticeFailureMessage =
  '공지사항 목록을 불러오지 못했습니다.\n잠시 후 다시 시도해 주세요.';

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
      } catch (error) {
        setErrorMessage(noticeFailureMessage);
        if (!silent) {
          setNoticeItems([]);
        }
      } finally {
        if (silent) {
          setIsRefreshing(false);
        } else {
          setIsInitialLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    void loadNoticePosts();
  }, [loadNoticePosts]);

  const handleCreateNotice = async ({
    title,
    body,
    bodyJson,
    bodyText,
    attachments,
  }: {
    title: string;
    body: string;
    bodyJson?: string;
    bodyText?: string;
    attachments: NoticeComposerDraftAttachment[];
  }) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return;
    }

    const safeHtml = body || '<p></p>';
    const safeJson = bodyJson || JSON.stringify({ type: 'doc', content: [] });
    const safeText = (bodyText ?? toPlainText(safeHtml)).trim();

    const updatedDraft = { title: trimmedTitle, body: safeHtml, attachments };
    const existingId = editorDraft.id;

    try {
      if (existingId) {
        await updateNoticePost(existingId, {
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

        for (const file of uploadableFiles) {
          await uploadNoticeAttachment(existingId, file);
        }

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
        if (createdId > 0) {
          const uploadableFiles = attachments
            .map((attachment) => attachment.file)
            .filter((file): file is File => Boolean(file));

          for (const file of uploadableFiles) {
            await uploadNoticeAttachment(createdId, file);
          }
        }

        showSuccess('공지사항이 등록되었습니다.');
      }
    } catch (error) {
      showError('공지사항 저장에 실패했습니다.');
      throw error;
    }

    setEditorDraft({ title: '', body: '', attachments: [] });
    setIsComposerOpen(false);
    await loadNoticePosts({ silent: true });
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
    await deleteNoticePost(noticeId);
    setNoticeItems((current) => current.filter((item) => item.id !== noticeId));
    showSuccess('공지가 삭제되었습니다.');
    await loadNoticePosts({ silent: true });
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
    (noticeId: number, content: string) => {
      const trimmed = content.trim();
      if (!trimmed) {
        return;
      }

      setNoticeItems((current) =>
        current.map((item) => {
          if (item.id !== noticeId) {
            return item;
          }

          const createdAt = new Date().toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          });

          return {
            ...item,
            commentCount: (item.commentCount ?? 0) + 1,
            comments: [
              ...(item.comments ?? []),
              {
                id: Date.now(),
                author: '나',
                time: createdAt,
                content: trimmed,
              },
            ],
          };
        }),
      );
      showSuccess('댓글이 등록되었습니다.');
    },
    [showSuccess],
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
                onDelete={handleDeleteNotice}
                onEdit={async (item) => {
                  try {
                    const detail = await fetchNoticePostDetail(item.id);
                    const mappedAttachments = (detail.attachments ?? []).map(
                      (attachment) => ({
                        id: String(
                          attachment.boardFileId ??
                            attachment.fileName ??
                            attachment.objectKey ??
                            `${item.id}-${Math.random()}`,
                        ),
                        name: attachment.fileName ?? '첨부파일',
                        size: Number(attachment.fileSize ?? 0) || undefined,
                        extension:
                          attachment.fileName
                            ?.split('.')
                            .pop()
                            ?.toUpperCase() || undefined,
                        boardFileId: attachment.boardFileId,
                        objectKey: attachment.objectKey,
                        bucketName: attachment.bucketName,
                      }),
                    );

                    setEditorDraft({
                      id: item.id,
                      title: detail.title ?? item.title,
                      body: detail.contentsHtml ?? detail.contents ?? item.body,
                      attachments: mappedAttachments,
                    });
                    setIsComposerOpen(true);
                  } catch {
                    setEditorDraft({
                      id: item.id,
                      title: item.title,
                      body: item.body,
                      attachments: [],
                    });
                    setIsComposerOpen(true);
                  }
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
                      await downloadNoticeAttachment(nextAttachment);
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
