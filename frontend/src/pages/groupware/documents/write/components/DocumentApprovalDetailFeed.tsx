import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { AttachmentList } from '../../../../../shared/components/feed/AttachmentList';
import { CommentThread } from '../../../../../shared/components/feed/CommentThread';
import type { FeedCommentItem } from '../../../../../shared/components/feed/CommentThread';
import { FeedCommentsSection } from '../../../../../shared/components/feed/FeedCommentsSection';
import { FeedReactionBar } from '../../../../../shared/components/feed/FeedReactionBar';
import { PostDetailPanel } from '../../../../../shared/components/feed/PostDetailPanel';
import { useNotification } from '../../../../../shared/context/NotificationContext';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import { getStoredAuth } from '../../../../../shared/services/authService';
import { fetchMyProfile } from '../../../../dashboard/services/profileSettings.service';
import {
  createApprovalComment,
  deleteDocumentApproval,
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

function approvalStatusLabel(status: DocumentApprovalDetail['documentStatus']): string {
  const labels: Record<DocumentApprovalDetail['documentStatus'], string> = {
    DRAFT: '임시저장',
    PENDING: '결재대기',
    IN_PROGRESS: '결재중',
    REVISION_REQUESTED: '보완요청',
    COMPLETED: '완료',
    REJECTED: '반려',
  };
  return labels[status];
}

function approvalLineStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    WAITING: '대기',
    PENDING: '처리 중',
    APPROVED: '승인',
    REJECTED: '반려',
    RETURNED: '보완요청',
  };
  return labels[status] ?? status;
}

function toApprovalCommentTree(
  records: DocumentApprovalComment[],
  systemEvents: DocumentApprovalDetail['systemEvents'],
  commentImageUrls: Record<string, string>,
): FeedCommentItem[] {
  const comments = new Map<string, FeedCommentItem>();
  const createdAtById = new Map<string, string | null | undefined>();
  const roots: FeedCommentItem[] = [];
  records.forEach((record) => {
    createdAtById.set(String(record.commentId), record.createdAt);
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
  systemEvents.forEach((event, index) => {
    const eventId = `system-${event.eventType}-${event.createdAt ?? index}`;
    createdAtById.set(eventId, event.createdAt);
    roots.push({
      id: eventId,
      author: event.writerName || '시스템',
      time: formatCommentTime(event.createdAt),
      content: event.content,
      isSystemEvent: true,
    });
  });
  roots.sort((left, right) => {
    const leftTime = new Date(createdAtById.get(String(left.id)) ?? '').getTime();
    const rightTime = new Date(createdAtById.get(String(right.id)) ?? '').getTime();
    if (Number.isNaN(leftTime)) return Number.isNaN(rightTime) ? 0 : -1;
    if (Number.isNaN(rightTime)) return 1;
    return leftTime - rightTime;
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
  const [bodyImages, setBodyImages] = useState<Array<{ url: string; alt: string }>>([]);
  const [bodyImageError, setBodyImageError] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionComment, setActionComment] = useState('');
  const [commentRecords, setCommentRecords] = useState<DocumentApprovalComment[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [hasPreviousComments, setHasPreviousComments] = useState(false);
  const [nextBeforeCommentId, setNextBeforeCommentId] = useState<number | null>(null);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [commentImageUrls, setCommentImageUrls] = useState<Record<string, string>>({});
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

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
      setCommentCount(page.resultCnt);
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
    setIsLiked(false);
    setIsBookmarked(false);
    setBodyHtml('');
    setBodyImages([]);
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
      setBodyImages([]);
      return () => {
        active = false;
      };
    }

    const parsed = new DOMParser().parseFromString(detail.contentsHtml, 'text/html');
    const imageElements = Array.from(parsed.querySelectorAll('img'));
    const imageRequests: Array<{ alt: string; fileId: number }> = [];
    imageElements.forEach((image) => {
      const source = image.getAttribute('src') ?? '';
      if (!source.startsWith('/api/v1/groupware/approvals/')) return;
      const match = source.match(
        /^\/api\/v1\/groupware\/approvals\/(\d+)\/embedded-images\/(\d+)$/,
      );
      image.removeAttribute('src');
      if (match && Number(match[1]) === electronicApprovalId) {
        const alt = image.getAttribute('alt')?.trim() || '본문 이미지';
        const imageNumber = imageRequests.length + 1;
        imageRequests.push({
          alt,
          fileId: Number(match[2]),
        });
        const reference = parsed.createElement('span');
        reference.className = 'approval-inline-image-reference';
        reference.textContent = `[본문 이미지 ${imageNumber}: ${alt}]`;
        image.replaceWith(reference);
      }
    });
    setBodyImageError('');
    setBodyImages([]);
    setBodyHtml(parsed.body.innerHTML);
    if (imageRequests.length === 0) {
      return () => {
        active = false;
      };
    }

    void Promise.allSettled(
      imageRequests.map(async ({ alt, fileId }) => ({
        alt,
        blob: await fetchApprovalEmbeddedImageBlob(electronicApprovalId, fileId),
      })),
    ).then((results) => {
      if (!active) return;
      let failed = false;
      const loadedImages: Array<{ url: string; alt: string }> = [];
      results.forEach((result) => {
        if (result.status !== 'fulfilled') {
          failed = true;
          return;
        }
        const url = URL.createObjectURL(result.value.blob);
        objectUrls.push(url);
        loadedImages.push({ url, alt: result.value.alt });
      });
      setBodyImages(loadedImages);
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
    setCommentCount(0);
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
  const approvalLineGroups = useMemo(() => {
    const orderedLines = [...(detail?.approvalLines ?? [])].sort(
      (left, right) =>
        left.stageOrder - right.stageOrder ||
        left.participantOrder - right.participantOrder,
    );
    return {
      approval: orderedLines.filter((line) => line.participantType === 'APPROVAL'),
      agreement: orderedLines.filter((line) => line.participantType === 'AGREEMENT'),
      reference: orderedLines.filter((line) => line.participantType === 'REFERENCE'),
    };
  }, [detail?.approvalLines]);
  const canEditDraft = useMemo(
    () =>
      Boolean(
        detail &&
          detail.isDrafter &&
          (detail.documentStatus === 'DRAFT' ||
            detail.documentStatus === 'REVISION_REQUESTED'),
      ),
    [detail],
  );
  const canDeleteDocument = useMemo(() => {
    if (!detail?.isDrafter) return false;
    if (detail.documentStatus === 'DRAFT') return true;
    if (detail.documentStatus !== 'PENDING') return false;
    const drafterApproval = detail.approvalLines.find(
      (line) =>
        line.stageOrder === 1 &&
        line.participantType === 'APPROVAL' &&
        line.participantUserId === employeeId,
    );
    return Boolean(
      drafterApproval?.actionStatus === 'APPROVED' &&
        drafterApproval.actionAt &&
        detail.approvalLines
          .filter((line) => line.participantType !== 'REFERENCE' && line !== drafterApproval)
          .every(
            (line) =>
              (line.actionStatus === 'WAITING' || line.actionStatus === 'PENDING') &&
              !line.actionAt &&
              !line.actionComment,
          ),
    );
  }, [detail, employeeId]);

  const handleDeleteDocument = async () => {
    if (electronicApprovalId === null || isDeleting) return;
    setIsDeleting(true);
    setActionError('');
    try {
      await deleteDocumentApproval(electronicApprovalId);
      showSuccess('문서가 삭제되었습니다.');
      setIsDeleteDialogOpen(false);
      onActionComplete();
      onClose();
    } catch (error: unknown) {
      setActionError(
        error instanceof Error ? error.message : '문서 삭제에 실패했습니다.',
      );
    } finally {
      setIsDeleting(false);
    }
  };

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
    <PostDetailPanel
      title="문서 상세"
      subtitle={electronicApprovalId === null ? undefined : `문서 ID: ${electronicApprovalId}`}
      onClose={onClose}
    >
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
                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{ alignItems: 'center', flexWrap: 'wrap' }}
                >
                  <Avatar sx={{ width: 32, height: 32, fontSize: '0.75rem', flexShrink: 0 }}>
                    {detail.drafterName.slice(0, 1)}
                  </Avatar>
                  <Box sx={{ flex: '1 1 120px', minWidth: 120 }}>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 700, wordBreak: 'keep-all' }}
                    >
                      {detail.drafterName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(detail.createdAt)}
                    </Typography>
                  </Box>
                  <IconButton aria-label="고정된 문서" disabled size="small">
                    <PushPinOutlinedIcon fontSize="small" />
                  </IconButton>
                  {detail.isDrafter && (canEditDraft || canDeleteDocument) && (
                    <>
                      <IconButton
                        aria-label="문서 더보기"
                        size="small"
                        onClick={(event) => setMenuAnchor(event.currentTarget)}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                      <Menu
                        anchorEl={menuAnchor}
                        open={Boolean(menuAnchor)}
                        onClose={() => setMenuAnchor(null)}
                      >
                        {canEditDraft && (
                          <MenuItem
                            onClick={() => {
                              setMenuAnchor(null);
                              onEditDocument(detail);
                            }}
                          >
                            {detail.documentStatus === 'REVISION_REQUESTED'
                              ? '수정 후 재상신'
                              : '문서 수정'}
                          </MenuItem>
                        )}
                        {canDeleteDocument && (
                          <MenuItem
                            onClick={() => {
                              setMenuAnchor(null);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            삭제
                          </MenuItem>
                        )}
                      </Menu>
                    </>
                  )}
                  <Typography
                    variant="caption"
                    sx={{ px: 1, py: 0.5, borderRadius: 1, bgcolor: 'action.hover' }}
                  >
                    {approvalStatusLabel(detail.documentStatus)}
                  </Typography>
                </Stack>
              </Box>
              <Box data-testid="approval-line-readonly">
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  결재선
                </Typography>
                {approvalLineGroups.approval.length === 0 &&
                approvalLineGroups.agreement.length === 0 &&
                approvalLineGroups.reference.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    결재선 정보가 없습니다.
                  </Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {approvalLineGroups.approval.length > 0 && (
                      <Box data-testid="approval-line-group-approval">
                        <Typography variant="caption" color="text.secondary">
                          결재
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={1}
                          sx={{ flexWrap: 'wrap', rowGap: 1 }}
                        >
                          {approvalLineGroups.approval.map((line) => (
                            <Box
                              key={line.electronicApprovalLineId}
                              sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                width: 104,
                                minHeight: 128,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                                overflow: 'hidden',
                              }}
                            >
                              <Box sx={{ flex: 1, minHeight: 72 }} aria-hidden="true" />
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: 0.5,
                                  p: 0.75,
                                  borderTop: '1px solid',
                                  borderColor: 'divider',
                                  minWidth: 0,
                                }}
                              >
                                <Box
                                  component="span"
                                  sx={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 16,
                                    height: 16,
                                    flexShrink: 0,
                                    borderRadius: '50%',
                                    bgcolor: 'primary.light',
                                    color: 'primary.contrastText',
                                    fontSize: '0.6rem',
                                    fontWeight: 700,
                                  }}
                                >
                                  {line.stageOrder}
                                </Box>
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography variant="caption" noWrap sx={{ display: 'block' }}>
                                    {line.participantName}
                                  </Typography>
                                  {line.participantDepartmentName && (
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      noWrap
                                      sx={{ display: 'block' }}
                                    >
                                      {line.participantDepartmentName}
                                    </Typography>
                                  )}
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ display: 'block', overflowWrap: 'anywhere' }}
                                  >
                                    {approvalLineStatusLabel(line.actionStatus)}
                                    {line.actionComment ? ` · ${line.actionComment}` : ''}
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    )}
                    {approvalLineGroups.agreement.length > 0 && (
                      <Box data-testid="approval-line-group-agreement">
                        <Typography variant="caption" color="text.secondary">
                          합의
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={1}
                          sx={{ flexWrap: 'wrap', rowGap: 1 }}
                        >
                          {approvalLineGroups.agreement.map((line) => (
                            <Box
                              key={line.electronicApprovalLineId}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.75,
                                minWidth: 120,
                                maxWidth: '100%',
                                px: 1,
                                py: 0.75,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                              }}
                            >
                              <Chip label={line.stageOrder} size="small" color="primary" />
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="caption" noWrap sx={{ display: 'block' }}>
                                  {line.participantName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {approvalLineStatusLabel(line.actionStatus)}
                                </Typography>
                              </Box>
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    )}
                    {approvalLineGroups.reference.length > 0 && (
                      <Box data-testid="approval-line-group-reference">
                        <Typography variant="caption" color="text.secondary">
                          참조
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={0.75}
                          sx={{ flexWrap: 'wrap', rowGap: 0.75 }}
                        >
                          {approvalLineGroups.reference.map((line) => (
                            <Chip
                              key={line.electronicApprovalLineId}
                              label={line.participantName}
                              title={line.participantDepartmentName ?? undefined}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                )}
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
                {detail.title}
              </Typography>
              <Box
                data-testid="approval-document-body"
                sx={{
                  minWidth: 0,
                  overflowWrap: 'anywhere',
                  '& img': { maxWidth: '100%', height: 'auto' },
                  '& table': { maxWidth: '100%', overflowX: 'auto', display: 'block' },
                  '& .approval-inline-image-reference': {
                    display: 'inline-block',
                    px: 0.75,
                    py: 0.25,
                    borderRadius: 0.75,
                    bgcolor: 'action.hover',
                    color: 'text.secondary',
                    fontSize: '0.85em',
                  },
                }}
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
              />
              {bodyImageError && <Alert severity="error">{bodyImageError}</Alert>}
              {bodyImages.length > 0 && (
                <Box data-testid="approval-document-images">
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                    본문 이미지
                  </Typography>
                  <Stack spacing={1}>
                    {bodyImages.map((image, index) => (
                      <Box key={`${image.url}-${index}`}>
                        <Typography variant="caption" color="text.secondary">
                          본문 이미지 {index + 1}: {image.alt}
                        </Typography>
                        <Box
                          component="img"
                          src={image.url}
                          alt={image.alt}
                          sx={{ display: 'block', maxWidth: '100%', height: 'auto', borderRadius: 1 }}
                        />
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}
              <Divider />
              <Box>
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
              </Box>
              <Divider />
              <FeedReactionBar
                liked={isLiked}
                likeCount={0}
                bookmarked={isBookmarked}
                commentCount={commentCount + detail.systemEvents.length}
                onToggleLike={() => setIsLiked((value) => !value)}
                onToggleBookmark={() => setIsBookmarked((value) => !value)}
              />
              <Divider />
              <FeedCommentsSection
                showPrevious={hasPreviousComments}
                isLoadingPrevious={isLoadingComments}
                onLoadPrevious={() => void handleLoadPreviousComments()}
              >
                <>
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
                {isLoadingComments && commentRecords.length === 0 ? (
                  <Box role="status" aria-label="댓글 불러오는 중" sx={{ py: 2 }}>
                    <CircularProgress size={20} />
                  </Box>
                ) : commentRecords.length === 0 && detail.systemEvents.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    등록된 댓글이 없습니다.
                  </Typography>
                ) : null}
                <CommentThread
                  comments={toApprovalCommentTree(
                    commentRecords,
                    detail.systemEvents,
                    commentImageUrls,
                  )}
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
                </>
              </FeedCommentsSection>
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
      <Dialog
        open={isDeleteDialogOpen}
        onClose={() => !isDeleting && setIsDeleteDialogOpen(false)}
        aria-labelledby="approval-delete-dialog-title"
      >
        <DialogTitle id="approval-delete-dialog-title">문서를 삭제하시겠습니까?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            삭제한 문서는 목록에서 숨겨지며 복구할 수 없습니다.
          </DialogContentText>
          {actionError && <Alert severity="error" sx={{ mt: 1 }}>{actionError}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>
            취소
          </Button>
          <Button color="error" onClick={() => void handleDeleteDocument()} disabled={isDeleting}>
            {isDeleting ? '삭제 중...' : '삭제'}
          </Button>
        </DialogActions>
      </Dialog>
    </PostDetailPanel>
  );
}
