import {
  Box,
  Button,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import DownloadOutlined from '@mui/icons-material/DownloadOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined';
import { PostDetailPanel } from '../../../../../shared/components/feed/PostDetailPanel';
import type {
  ArchiveCategory,
  ArchivePost,
} from '../types/archive.types';

type ArchivePostDetailProps = {
  post: ArchivePost;
  categories: ArchiveCategory[];
  onClose: () => void;
  onDownload: (post: ArchivePost, fileIndex: number) => void;
  onEdit?: () => void;
  onDelete?: () => void;
};

function formatDate(value?: string | Date | null) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString('ko-KR');
}

export function ArchivePostDetail({
  post,
  categories,
  onClose,
  onDownload,
  onEdit,
  onDelete,
}: ArchivePostDetailProps) {
  const category =
    categories.find((item) => item.code === post.categoryCode)?.name ??
    post.categoryCode;

  return (
    <PostDetailPanel onClose={onClose} title="자료 상세">
      <Stack spacing={2}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
            {post.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {category} · {post.writerName ?? post.writerId ?? '—'} ·{' '}
            {formatDate(post.createdAt)}
          </Typography>
        </Box>
        {(onEdit || onDelete) && (
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            {onEdit && (
              <Button
                type="button"
                size="small"
                startIcon={<EditOutlined />}
                onClick={onEdit}
              >
                수정
              </Button>
            )}
            {onDelete && (
              <Button
                type="button"
                size="small"
                color="error"
                startIcon={<DeleteOutlineOutlined />}
                onClick={onDelete}
              >
                삭제
              </Button>
            )}
          </Stack>
        )}
        <Divider />
        <Typography
          component="div"
          variant="body1"
          aria-label="자료 설명"
          sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', minHeight: 48 }}
        >
          {post.contents}
        </Typography>
        {Boolean(post.attachments?.length) && (
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              첨부파일
            </Typography>
            <Stack spacing={0.75}>
              {post.attachments?.map((attachment, index) => (
                <Box
                  key={attachment.boardFileId}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    minWidth: 0,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 1,
                  }}
                >
                  <Typography sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                    {attachment.fileName}
                  </Typography>
                  <Button
                    type="button"
                    size="small"
                    startIcon={<DownloadOutlined />}
                    aria-label={`다운로드 ${attachment.fileName}`}
                    onClick={() => onDownload(post, index)}
                  >
                    다운로드
                  </Button>
                </Box>
              ))}
            </Stack>
          </Box>
        )}
      </Stack>
    </PostDetailPanel>
  );
}
