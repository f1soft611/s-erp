import { useEffect, useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
  Chip,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { FeedBodyContent } from '../../../../../shared/components/feed/FeedBodyContent';
import { useDocumentApprovalBody } from '../../../documents/write/hooks/useDocumentApprovalBody';
import { getDocumentApprovalDetail } from '../../../documents/write/services/documentApproval.service';
import type { DocumentApprovalDetail } from '../../../documents/write/types/documentWrite.types';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: '임시저장',
  PENDING: '결재대기',
  IN_PROGRESS: '결재진행',
  REVISION_REQUESTED: '보완요청',
  COMPLETED: '완료',
  REJECTED: '반려',
};

type DocumentStatusDetailPanelProps = {
  electronicApprovalId: number | null;
  onClose: () => void;
};

export function DocumentStatusDetailPanel({
  electronicApprovalId,
  onClose,
}: DocumentStatusDetailPanelProps) {
  const [detail, setDetail] = useState<DocumentApprovalDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryToken, setRetryToken] = useState(0);
  const { expandedBodyHtml, bodyImageError } = useDocumentApprovalBody(
    electronicApprovalId,
    detail?.contentsHtml ?? '',
  );

  useEffect(() => {
    let active = true;
    if (electronicApprovalId === null) {
      setDetail(null);
      setLoading(false);
      setError('');
      return () => {
        active = false;
      };
    }

    setDetail(null);
    setLoading(true);
    setError('');
    void getDocumentApprovalDetail(electronicApprovalId)
      .then((item) => {
        if (active) setDetail(item);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : '문서 상세를 불러오지 못했습니다.',
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [electronicApprovalId, retryToken]);

  if (electronicApprovalId === null) return null;

  return (
    <Paper
      component="section"
      role="region"
      aria-label="문서 상세"
      variant="outlined"
      sx={{
        minWidth: 0,
        maxHeight: { xs: '42vh', md: 380 },
        overflow: 'auto',
        p: { xs: 1.5, sm: 2 },
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" sx={{ overflowWrap: 'anywhere' }}>
            {detail?.title ?? '문서 상세'}
          </Typography>
          {detail ? (
            <Stack
              direction="row"
              spacing={1}
              sx={{ mt: 0.5, flexWrap: 'wrap', alignItems: 'center' }}
            >
              <Typography variant="body2" color="text.secondary">
                {detail.eabusNo} · {detail.drafterName}
              </Typography>
              <Chip
                size="small"
                label={STATUS_LABELS[detail.documentStatus] ?? detail.documentStatus}
              />
            </Stack>
          ) : null}
        </Box>
        <IconButton
          aria-label="문서 상세 닫기"
          onClick={onClose}
          size="small"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>

      {loading ? (
        <Typography role="status" sx={{ py: 2 }}>
          문서 상세를 불러오는 중입니다.
        </Typography>
      ) : null}

      {error ? (
        <Stack spacing={1} sx={{ py: 2 }}>
          <Typography role="alert" color="error">
            {error}
          </Typography>
          <Box>
            <IconButton
              aria-label="문서 상세 다시 불러오기"
              onClick={() => setRetryToken((current) => current + 1)}
              size="small"
            >
              다시 시도
            </IconButton>
          </Box>
        </Stack>
      ) : null}

      {detail ? (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            문서 본문
          </Typography>
          <FeedBodyContent
            hasMore={false}
            isExpanded
            onToggleExpand={() => undefined}
            contentTestId="document-status-detail-body"
            richText={{
              collapsedHtml: expandedBodyHtml,
              expandedHtml: expandedBodyHtml,
              imageError: bodyImageError || undefined,
              images: [],
              onOpenImage: () => undefined,
            }}
          />
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
            결재선
          </Typography>
          <Stack spacing={1}>
            {[...detail.approvalLines]
              .sort(
                (left, right) =>
                  left.stageOrder - right.stageOrder ||
                  left.participantOrder - right.participantOrder,
              )
              .map((line) => (
                <Box
                  key={line.electronicApprovalLineId}
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 1,
                    alignItems: 'center',
                    borderBottom: 1,
                    borderColor: 'divider',
                    pb: 0.75,
                  }}
                >
                  <Typography variant="body2">
                    {line.participantName}
                  </Typography>
                  {line.participantDepartmentName ? (
                    <Typography variant="caption" color="text.secondary">
                      {line.participantDepartmentName}
                    </Typography>
                  ) : null}
                  <Chip size="small" variant="outlined" label={line.actionStatus} />
                </Box>
              ))}
          </Stack>
        </Box>
      ) : null}
    </Paper>
  );
}
