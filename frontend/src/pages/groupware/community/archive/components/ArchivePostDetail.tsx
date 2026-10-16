import {
  Box,
  Chip,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import MoreVertOutlined from '@mui/icons-material/MoreVertOutlined';
import { useState } from 'react';
import { AttachmentList } from '../../../../../shared/components/feed/AttachmentList';
import { PostDetailPanel } from '../../../../../shared/components/feed/PostDetailPanel';
import type {
  ArchiveAttachment,
  ArchiveCategory,
  ArchivePost,
} from '../types/archive.types';

type ArchivePostDetailProps = {
  post: ArchivePost;
  categories: ArchiveCategory[];
  onClose: () => void;
  onDownload: (attachment: ArchiveAttachment) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isDeletePending?: boolean;
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
  isDeletePending = false,
}: ArchivePostDetailProps) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const category =
    categories.find((item) => item.code === post.categoryCode)?.name ??
    post.categoryCode;
  const attachments = post.attachments ?? [];

  return (
    <PostDetailPanel onClose={onClose} title="자료 상세">
      <Stack spacing={2.5}>
        <Box>
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" color="text.secondary">
                {post.writerName ?? post.writerId ?? '—'} ·{' '}
                {formatDate(post.createdAt)}
              </Typography>
            </Box>
            <Stack
              direction="row"
              spacing={0.5}
              sx={{ alignItems: 'center' }}
            >
              <Chip label={category} size="small" variant="outlined" />
              {(onEdit || onDelete) && (
                <>
                  <IconButton
                    type="button"
                    size="small"
                    aria-label="자료 더보기"
                    aria-haspopup="menu"
                    aria-expanded={menuAnchor !== null}
                    onClick={(event) => setMenuAnchor(event.currentTarget)}
                  >
                    <MoreVertOutlined fontSize="small" />
                  </IconButton>
                  <Menu
                    anchorEl={menuAnchor}
                    open={menuAnchor !== null}
                    onClose={() => setMenuAnchor(null)}
                  >
                    {onEdit && (
                      <MenuItem
                        onClick={() => {
                          setMenuAnchor(null);
                          onEdit();
                        }}
                      >
                        수정
                      </MenuItem>
                    )}
                    {onDelete && (
                      <MenuItem
                        disabled={isDeletePending}
                        onClick={() => {
                          setMenuAnchor(null);
                          onDelete();
                        }}
                      >
                        삭제
                      </MenuItem>
                    )}
                  </Menu>
                </>
              )}
            </Stack>
          </Stack>
          <Typography
            component="h3"
            variant="h5"
            sx={{ mt: 1.5, fontWeight: 700, overflowWrap: 'anywhere' }}
          >
            {post.title}
          </Typography>
        </Box>
        <Divider />
        <Typography
          component="div"
          variant="body1"
          aria-label="자료 설명"
          sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', minHeight: 48 }}
        >
          {post.contents}
        </Typography>
        {attachments.length > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              첨부파일
            </Typography>
            <AttachmentList
              files={attachments.map((attachment) => ({
                id: String(attachment.boardFileId),
                name: attachment.fileName,
              }))}
              onDownload={(id) => {
                const attachment = attachments.find(
                  (item) => String(item.boardFileId) === id,
                );
                if (attachment) onDownload(attachment);
              }}
              testId="archive-attachment-list"
            />
          </Box>
        )}
      </Stack>
    </PostDetailPanel>
  );
}
