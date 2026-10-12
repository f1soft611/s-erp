import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { AttachmentList } from '../../../../../shared/components/feed/AttachmentList';
import { CommentThread } from '../../../../../shared/components/feed/CommentThread';
import type { FeedCommentItem } from '../../../../../shared/components/feed/CommentThread';
import { PostDetailPanel } from '../../../../../shared/components/feed/PostDetailPanel';
import { useNotification } from '../../../../../shared/context/NotificationContext';
import { getStoredAuth } from '../../../../../shared/services/authService';
import { fetchMyProfile } from '../../../../dashboard/services/profileSettings.service';
import {
  createApprovalComment,
  deleteApprovalComment,
  deleteApprovalCommentAttachment,
  downloadApprovalCommentAttachment,
  downloadDocumentApprovalAttachment,
  fetchApprovalCommentAttachmentBlob,
  fetchApprovalEmbeddedImageBlob,
  getDocumentApprovalDetail,
  listApprovalComments,
  processDocumentApprovalAction,
  updateApprovalComment,
  uploadApprovalCommentAttachment,
} from '../services/documentApproval.service';
import type {
  DocumentApprovalActionRequest,
  DocumentApprovalComment,
  DocumentApprovalDetail,
} from '../types/documentWrite.types';

type DocumentApprovalDetailFeedProps = {
  open: boolean;
  electronicApprovalId: number | null;
  onClose: () => void;
  onActionComplete: () => void;
  onEditDocument: (detail: DocumentApprovalDetail) => void;
};

function formatDate(value?: string | null): string {
  if (!value) return '';
  return value.slice(0, 16).replace('T', ' ');
}

function formatCommentTime(value?: string | null): string {
  if (!value) return '방금';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '방금';
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toApprovalCommentTree(
  records: DocumentApprovalComment[],
  commentImageUrls: Record<string, string>,
): FeedCommentItem[] {
  const comments = new Map<string, FeedCommentItem>();
  const roots: FeedCommentItem[] = [];
  records.forEach((record) => {
    comments.set(String(record.commentId), {
      id: record.commentId,
      author: record.deletedYn === 'Y' ? '삭제된 댓글' : record.writerName,
      time: formatCommentTime(record.createdAt),
      content: record.deletedYn === 'Y' ? '[삭제된 댓글입니다.]' : record.content,
      isDeleted: record.deletedYn === 'Y',
      isEditable: record.deletedYn !== 'Y' && record.writerId === getStoredAuth()?.userId,
      attachments: (record.attachments ?? []).map((file) => ({
        id: String(file.fileId),
        name: file.fileName ?? '첨부파일',
        size: file.fileSize,
        mimeType: file.mimeType,
        previewUrl: commentImageUrls[`${record.commentId}:${file.fileId}`],
      })),
      replies: [],
    });
  });
  records.forEach((record) => {
    const item = comments.get(String(record.commentId));
    if (!item) return;
    const parent = record.parentCommentId == null
      ? undefined
      : comments.get(String(record.parentCommentId));
    if (parent) {
      parent.replies = [...(parent.replies ?? []), item];
    } else {
      roots.push(item);
    }
  });
  return roots;
}

export function DocumentApprovalDetailFeed({
  open,
  electronicApprovalId,
  onClose,
  onActionComplete,
  onEditDocument,
}: DocumentApprovalDetailFeedProps) {
  const { showSuccess, showError } = useNotification();
  const [detail, setDetail] = useState<DocumentApprovalDetail | null>(null);
  const [bodyHtml, setBodyHtml] = useState('');
  const [bodyImageError, setBodyImageError] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionComment, setActionComment] = useState('');
  const [commentRecords, setCommentRecords] = useState<DocumentApprovalComment[]>([]);
  const [hasPreviousComments, setHasPreviousComments] = useState(false);
  const [nextBeforeCommentId, setNextBeforeCommentId] = useState<number | null>(null);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [commentImageUrls, setCommentImageUrls] = useState<Record<string, string>>({});

  const loadComments = useCallback(async (
    beforeCommentId?: number,
    append = false,
  ) => {
    if (electronicApprovalId === null) return;
    setIsLoadingComments(true);
    setCommentError('');
    try {
      const page = await listApprovalComments(electronicApprovalId, {
        limit: 20,
        beforeCommentId,
      });
      setCommentRecords((current) =>
        append ? [...page.comments, ...current] : page.comments,
      );
      setHasPreviousComments(page.hasPrevious);
      setNextBeforeCommentId(page.nextBeforeCommentId);
    } catch (error: unknown) {
      setCommentError(
        error instanceof Error ? error.message : '댓글을 불러오지 못했습니다.',
      );
    } finally {
      setIsLoadingComments(false);
    }
  }, [electronicApprovalId]);

  useEffect(() => {
    if (!open || electronicApprovalId === null) return;
    let active = true;
    setIsLoading(true);
    setLoadError('');
    setActionError('');
    setActionComment('');
    setDetail(null);
    setBodyHtml('');
    setBodyImageError('');
    setEmployeeId('');
    void Promise.all([
      getDocumentApprovalDetail(electronicApprovalId),
      fetchMyProfile(),
    ])
      .then(([nextDetail, profile]) => {
        if (!active) return;
        setDetail(nextDetail);
        const nextEmployeeId = String(profile.employeeId ?? '').trim();
        if (!nextEmployeeId) {
          setLoadError('로그인 사용자의 사원 ID를 확인할 수 없습니다.');
          return;
        }
        setEmployeeId(nextEmployeeId);
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(
            error instanceof Error
              ? error.message
              : '전자결재 상세 정보를 불러오지 못했습니다.',
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [electronicApprovalId, open]);

  useEffect(() => {
    let active = true;
    const objectUrls: string[] = [];
    if (!detail || electronicApprovalId === null) {
      setBodyHtml('');
      return () => {
        active = false;
      };
    }

    const parsed = new DOMParser().parseFromString(detail.contentsHtml, 'text/html');
    const imageElements = Array.from(parsed.querySelectorAll('img'));
    const imageRequests: Array<{ element: HTMLImageElement; fileId: number }> = [];
    imageElements.forEach((image) => {
      const source = image.getAttribute('src') ?? '';
      if (!source.startsWith('/api/v1/groupware/approvals/')) return;
      const match = source.match(
        /^\/api\/v1\/groupware\/approvals\/(\d+)\/embedded-images\/(\d+)$/,
      );
      image.removeAttribute('src');
      if (match && Number(match[1]) === electronicApprovalId) {
        imageRequests.push({ element: image, fileId: Number(match[2]) });
      }
    });
    setBodyImageError('');
    setBodyHtml(parsed.body.innerHTML);
    if (imageRequests.length === 0) {
      return () => {
        active = false;
      };
    }

    void Promise.allSettled(
      imageRequests.map(async ({ element, fileId }) => ({
        element,
        blob: await fetchApprovalEmbeddedImageBlob(electronicApprovalId, fileId),
      })),
    ).then((results) => {
      if (!active) return;
      let failed = false;
      results.forEach((result) => {
        if (result.status !== 'fulfilled') {
          failed = true;
          return;
        }
        const url = URL.createObjectURL(result.value.blob);
        objectUrls.push(url);
        result.value.element.setAttribute('src', url);
      });
      setBodyHtml(parsed.body.innerHTML);
      if (failed) setBodyImageError('일부 본문 이미지를 불러오지 못했습니다.');
    });
    return () => {
      active = false;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [detail, electronicApprovalId]);

  useEffect(() => {
    if (!open || electronicApprovalId === null) return;
    setCommentRecords([]);
    setHasPreviousComments(false);
    setNextBeforeCommentId(null);
    void loadComments();
  }, [electronicApprovalId, loadComments, open]);

  useEffect(() => {
    let active = true;
    const objectUrls: string[] = [];
    const imageAttachments = commentRecords.flatMap((comment) =>
      (comment.attachments ?? [])
        .filter((file) => file.mimeType?.startsWith('image/'))
        .map((file) => ({ commentId: comment.commentId, file })),
    );
    setCommentImageUrls({});
    if (electronicApprovalId === null || imageAttachments.length === 0) {
      return () => {
        active = false;
      };
    }

    void Promise.allSettled(
      imageAttachments.map(async ({ commentId, file }) => ({
        key: `${commentId}:${file.fileId}`,
        blob: await fetchApprovalCommentAttachmentBlob(
          electronicApprovalId,
          commentId,
          file.fileId,
        ),
      })),
    ).then((results) => {
      if (!active) return;
      const urls: Record<string, string> = {};
      results.forEach((result) => {
        if (result.status !== 'fulfilled') return;
        const url = URL.createObjectURL(result.value.blob);
        objectUrls.push(url);
        urls[result.value.key] = url;
      });
      setCommentImageUrls(urls);
    });
    return () => {
      active = false;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [commentRecords, electronicApprovalId]);

  const canProcess = useMemo(
    () =>
      Boolean(
        detail?.approvalLines.some(
          (line) =>
            line.participantUserId === employeeId &&
            line.actionStatus === 'PENDING' &&
            line.participantType !== 'REFERENCE',
        ),
      ),
    [detail, employeeId],
  );
  const canEditDraft = useMemo(
    () =>
      Boolean(
        detail &&
          (detail.documentStatus === 'DRAFT' ||
            detail.documentStatus === 'REVISION_REQUESTED') &&
          detail.approvalLines.some(
            (line) =>
              line.stageOrder === 1 &&
              line.participantType === 'APPROVAL' &&
              line.participantUserId === employeeId,
          ),
      ),
    [detail, employeeId],
  );

  const handleAction = async (action: DocumentApprovalActionRequest['action']) => {
    if (electronicApprovalId === null || isActing) return;
    const comment = actionComment.trim();
    if ((action === 'REJECTED' || action === 'RETURNED') && !comment) {
      setActionError('반려 또는 보완요청 사유를 입력해 주세요.');
      return;
    }
    setIsActing(true);
    setActionError('');
    try {
      await processDocumentApprovalAction(electronicApprovalId, {
        action,
        actionComment: comment || undefined,
      });
      showSuccess(
        action === 'APPROVED'
          ? '문서가 승인되었습니다.'
          : action === 'REJECTED'
            ? '문서가 반려되었습니다.'
            : '문서 보완을 요청했습니다.',
      );
      onActionComplete();
      onClose();
    } catch (error: unknown) {
      setActionError(
        error instanceof Error ? error.message : '결재 처리에 실패했습니다.',
      );
    } finally {
      setIsActing(false);
    }
  };

  const uploadCommentFiles = async (
    approvalId: number,
    commentId: number,
    files: File[],
  ) => {
    const uploaded: Array<{ fileId: number }> = [];
    try {
      for (const file of files) {
        uploaded.push(await uploadApprovalCommentAttachment(
          approvalId,
          commentId,
          file,
        ));
      }
    } catch (error) {
      const cleanupResults = await Promise.allSettled(
        uploaded.map((file) =>
          deleteApprovalCommentAttachment(approvalId, commentId, file.fileId),
        ),
      );
      if (cleanupResults.some((result) => result.status === 'rejected')) {
        showError('일부 댓글 첨부파일 정리에 실패했습니다.');
      }
      throw error;
    }
  };

  const handleAddComment = async (
    content: string,
    files: File[],
    parentCommentId?: number | string,
  ) => {
    if (electronicApprovalId === null) return;
    try {
      const created = await createApprovalComment(
        electronicApprovalId,
        content,
        parentCommentId == null ? undefined : Number(parentCommentId),
      );
      await uploadCommentFiles(electronicApprovalId, created.commentId, files);
      showSuccess(parentCommentId == null ? '댓글이 등록되었습니다.' : '답글이 등록되었습니다.');
      await loadComments();
    } catch (error) {
      await loadComments();
      showError(error instanceof Error ? error.message : '댓글 저장에 실패했습니다.');
      throw error;
    }
  };

  const handleUpdateComment = async (
    commentId: string | number,
    content: string,
    files: File[],
  ) => {
    if (electronicApprovalId === null) return;
    try {
      await updateApprovalComment(electronicApprovalId, Number(commentId), content);
      await uploadCommentFiles(electronicApprovalId, Number(commentId), files);
      showSuccess('댓글이 수정되었습니다.');
      await loadComments();
    } catch (error) {
      await loadComments();
      showError(error instanceof Error ? error.message : '댓글 수정에 실패했습니다.');
      throw error;
    }
  };

  const handleDeleteComment = async (commentId: string | number) => {
    if (electronicApprovalId === null) return;
    try {
      await deleteApprovalComment(electronicApprovalId, commentId);
      showSuccess('댓글이 삭제되었습니다.');
      await loadComments();
    } catch (error) {
      showError(error instanceof Error ? error.message : '댓글 삭제에 실패했습니다.');
    }
  };

  const handleLoadPreviousComments = async () => {
    if (nextBeforeCommentId === null) return;
    await loadComments(nextBeforeCommentId, true);
  };

  const handleDownloadCommentAttachment = async (
    commentId: string | number,
    attachmentId: string,
    fileName?: string,
  ) => {
    if (electronicApprovalId === null) return;
    try {
      await downloadApprovalCommentAttachment(
        electronicApprovalId,
        commentId,
        attachmentId,
        fileName,
      );
    } catch (error) {
      showError(error instanceof Error ? error.message : '댓글 첨부파일을 내려받지 못했습니다.');
    }
  };

  const handleDeleteCommentAttachment = async (
    commentId: string | number,
    attachmentId: string,
  ) => {
    if (electronicApprovalId === null) return;
    try {
      await deleteApprovalCommentAttachment(electronicApprovalId, commentId, attachmentId);
      showSuccess('댓글 첨부파일이 삭제되었습니다.');
      await loadComments();
    } catch (error) {
      showError(error instanceof Error ? error.message : '댓글 첨부파일을 삭제하지 못했습니다.');
      throw error;
    }
  };

  const handleDownloadDocumentAttachment = async (fileId: number, fileName?: string) => {
    if (electronicApprovalId === null) return;
    try {
      await downloadDocumentApprovalAttachment(electronicApprovalId, fileId, fileName);
    } catch (error) {
      showError(error instanceof Error ? error.message : '문서 첨부파일을 내려받지 못했습니다.');
    }
  };

  return (
    <PostDetailPanel title={detail?.title || '문서 상세'} onClose={onClose}>
      {isLoading ? (
        <Box
          role="status"
          aria-label="문서 상세 불러오는 중"
          sx={{ display: 'flex', justifyContent: 'center', py: 6 }}
        >
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={2}>
          {loadError && <Alert severity="error">{loadError}</Alert>}
          {detail && (
            <>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
                  {detail.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {detail.drafterName} · {formatDate(detail.submittedAt ?? detail.createdAt)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  상태: {detail.documentStatus}
                </Typography>
              </Box>
              {canEditDraft && (
                <Button
                  variant="contained"
                  onClick={() => onEditDocument(detail)}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  {detail.documentStatus === 'REVISION_REQUESTED'
                    ? '수정 후 재상신'
                    : '문서 수정'}
                </Button>
              )}
              <Divider />
              <Box
                data-testid="approval-document-body"
                sx={{
                  minWidth: 0,
                  overflowWrap: 'anywhere',
                  '& img': { maxWidth: '100%', height: 'auto' },
                  '& table': { maxWidth: '100%', overflowX: 'auto', display: 'block' },
                }}
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
              />
              {bodyImageError && <Alert severity="error">{bodyImageError}</Alert>}
              <Divider />
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                  결재선
                </Typography>
                <Stack spacing={0.75}>
                  {detail.approvalLines.map((line) => (
                    <Box
                      key={line.electronicApprovalLineId}
                      sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}
                    >
                      <Typography variant="body2">
                        {line.stageOrder}단계 · {line.participantType === 'AGREEMENT' ? '합의' : line.participantType === 'REFERENCE' ? '참조' : '결재'}
                      </Typography>
                      <Typography variant="body2">{line.participantName}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {line.actionStatus}
                        {line.actionComment ? ` · ${line.actionComment}` : ''}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
              <Divider />
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                  첨부파일
                </Typography>
                <AttachmentList
                  files={detail.attachments.map((attachment) => ({
                    id: String(attachment.fileId),
                    name: attachment.fileName ?? `파일 ${attachment.fileId}`,
                    size: attachment.fileSize,
                  }))}
                  showActions
                  onDownload={(fileId) => {
                    const attachment = detail.attachments.find(
                      (file) => String(file.fileId) === fileId,
                    );
                    if (attachment) {
                      void handleDownloadDocumentAttachment(
                        attachment.fileId,
                        attachment.fileName,
                      );
                    }
                  }}
                />
                {detail.attachments.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    첨부파일이 없습니다.
                  </Typography>
                )}
              </Box>
              <Divider />
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                  문서 이력
                </Typography>
                <Stack spacing={1}>
                  {detail.systemEvents.map((event, index) => (
                    <Box key={`${event.eventType}-${event.createdAt ?? index}`}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {event.content}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {event.writerName} · {formatDate(event.createdAt)}
                      </Typography>
                    </Box>
                  ))}
                  {detail.systemEvents.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      등록된 문서 이력이 없습니다.
                    </Typography>
                  )}
                </Stack>
              </Box>
              <Divider />
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                  댓글
                </Typography>
                {commentError && (
                  <Alert
                    severity="error"
                    sx={{ mb: 1 }}
                    action={
                      <Button
                        color="inherit"
                        size="small"
                        onClick={() => void loadComments()}
                        disabled={isLoadingComments}
                      >
                        다시 시도
                      </Button>
                    }
                  >
                    {commentError}
                  </Alert>
                )}
                {hasPreviousComments && (
                  <Button
                    size="small"
                    onClick={() => void handleLoadPreviousComments()}
                    disabled={isLoadingComments}
                  >
                    {isLoadingComments ? '이전 댓글 불러오는 중...' : '이전 댓글 불러오기'}
                  </Button>
                )}
                {isLoadingComments && commentRecords.length === 0 ? (
                  <Box role="status" aria-label="댓글 불러오는 중" sx={{ py: 2 }}>
                    <CircularProgress size={20} />
                  </Box>
                ) : commentRecords.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    등록된 댓글이 없습니다.
                  </Typography>
                ) : null}
                <CommentThread
                  comments={toApprovalCommentTree(commentRecords, commentImageUrls)}
                  onSubmitComment={(content, files) => handleAddComment(content, files)}
                  onSubmitReply={(commentId, content, files) =>
                    handleAddComment(content, files, commentId)
                  }
                  onEditComment={handleUpdateComment}
                  onDeleteComment={handleDeleteComment}
                  onDownloadAttachment={handleDownloadCommentAttachment}
                  onDeleteAttachment={handleDeleteCommentAttachment}
                  expandReplies
                />
              </Box>
              {canProcess && (
                <>
                  <Divider />
                  <TextField
                    label="처리 의견"
                    value={actionComment}
                    onChange={(event) => setActionComment(event.target.value)}
                    multiline
                    minRows={2}
                    fullWidth
                    disabled={isActing}
                  />
                  {actionError && <Alert severity="error">{actionError}</Alert>}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    <Button
                      variant="contained"
                      onClick={() => void handleAction('APPROVED')}
                      disabled={isActing}
                    >
                      승인
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => void handleAction('REJECTED')}
                      disabled={isActing}
                    >
                      반려
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => void handleAction('RETURNED')}
                      disabled={isActing}
                    >
                      보완요청
                    </Button>
                    {isActing && <CircularProgress size={24} />}
                  </Box>
                </>
              )}
            </>
          )}
        </Stack>
      )}
    </PostDetailPanel>
  );
}
