import { useEffect, useMemo, useState } from 'react';
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
import { CommonDialog } from '../../../../../shared/components/CommonDialog';
import { useNotification } from '../../../../../shared/context/NotificationContext';
import { fetchMyProfile } from '../../../../dashboard/services/profileSettings.service';
import {
  getDocumentApprovalDetail,
  processDocumentApprovalAction,
} from '../services/documentApproval.service';
import type {
  DocumentApprovalActionRequest,
  DocumentApprovalDetail,
} from '../types/documentWrite.types';

type DocumentApprovalDetailDialogProps = {
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

export function DocumentApprovalDetailDialog({
  open,
  electronicApprovalId,
  onClose,
  onActionComplete,
  onEditDocument,
}: DocumentApprovalDetailDialogProps) {
  const { showSuccess } = useNotification();
  const [detail, setDetail] = useState<DocumentApprovalDetail | null>(null);
  const [employeeId, setEmployeeId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionComment, setActionComment] = useState('');

  useEffect(() => {
    if (!open || electronicApprovalId === null) return;
    let active = true;
    setIsLoading(true);
    setLoadError('');
    setActionError('');
    setActionComment('');
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

  return (
    <CommonDialog
      open={open}
      onClose={onClose}
      title="문서 상세"
      description={detail ? `${detail.title} · ${detail.eabusNo}` : undefined}
      size="lg"
      bodyMode="content"
      fullScreenOnMobile
      actions={
        <Button variant="text" onClick={onClose} disabled={isActing}>
          닫기
        </Button>
      }
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
                dangerouslySetInnerHTML={{ __html: detail.contentsHtml }}
              />
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
                {detail.attachments.length > 0 ? (
                  <Stack spacing={0.5}>
                    {detail.attachments.map((attachment) => (
                      <Typography key={attachment.fileId} variant="body2">
                        {attachment.fileName ?? `파일 ${attachment.fileId}`}
                      </Typography>
                    ))}
                  </Stack>
                ) : (
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
    </CommonDialog>
  );
}
