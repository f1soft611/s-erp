import { useState, type DragEvent, type MouseEvent } from 'react';
import AttachFileOutlined from '@mui/icons-material/AttachFileOutlined';
import ChatBubbleOutlineRounded from '@mui/icons-material/ChatBubbleOutlineRounded';
import MoreVertRounded from '@mui/icons-material/MoreVertRounded';
import { Box, ButtonBase, IconButton, Divider, ListSubheader, Menu, MenuItem, Paper, Stack, Typography } from '@mui/material';
import { formatInboxDateTime } from '../../../shared/utils/formatInboxDateTime';
import { countComments } from '../data/workspaceFeedAdapter';
import { getUserName } from '../data/workspaceSamples';
import type { WorkspaceColumn, WorkspacePost } from '../types/workspace.types';

type PostCardProps = {
  post: WorkspacePost;
  canWrite: boolean;
  /** 이동 가능한 다른 컬럼. 비어 있으면 이동 메뉴를 그리지 않는다. */
  moveTargets: WorkspaceColumn[];
  onOpen: (postId: string) => void;
  onMove: (columnId: string) => void;
  /** 있으면 더보기 메뉴에 수정을 보여준다(작성자 본인 카드). */
  onEdit?: () => void;
};

export function PostCard({ post, canWrite, moveTargets, onOpen, onMove, onEdit }: PostCardProps) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const commentCount = countComments(post.comments);

  const handleDragStart = (event: DragEvent<HTMLElement>) => {
    event.dataTransfer.setData('text/plain', post.id);
    event.dataTransfer.effectAllowed = 'move';
  };

  const openMenu = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
  };

  return (
    <Paper
      variant="outlined"
      data-post-id={post.id}
      draggable={canWrite || undefined}
      onDragStart={canWrite ? handleDragStart : undefined}
      onClick={() => onOpen(post.id)}
      sx={{
        p: 1.25,
        cursor: canWrite ? 'grab' : 'pointer',
        '&:hover': { borderColor: 'primary.main' },
      }}
    >
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'flex-start' }}>
        {/* 키보드로도 열 수 있게 제목을 버튼으로 둔다. 드래그가 막히지 않도록 button 요소 대신 span을 쓴다. */}
        <ButtonBase
          component="span"
          onClick={(event: MouseEvent<HTMLElement>) => {
            event.stopPropagation();
            onOpen(post.id);
          }}
          sx={{ flex: 1, minWidth: 0, display: 'block', textAlign: 'left', borderRadius: 0.5 }}
        >
          <Typography
            component="span"
            variant="body2"
            sx={{
              fontWeight: 700,
              overflowWrap: 'anywhere',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {post.title}
          </Typography>
        </ButtonBase>
        {canWrite && (onEdit || moveTargets.length > 0) ? (
          <>
            <IconButton size="small" aria-label="카드 더보기" onClick={openMenu} sx={{ mt: -0.5, mr: -0.75 }}>
              <MoreVertRounded fontSize="small" />
            </IconButton>
            <Menu
              anchorEl={menuAnchor}
              open={menuAnchor !== null}
              onClose={() => setMenuAnchor(null)}
              onClick={(event) => event.stopPropagation()}
            >
              {onEdit ? (
                <MenuItem
                  onClick={() => {
                    setMenuAnchor(null);
                    onEdit();
                  }}
                >
                  글 수정
                </MenuItem>
              ) : null}
              {onEdit && moveTargets.length > 0 ? <Divider /> : null}
              {onEdit && moveTargets.length > 0 ? <ListSubheader sx={{ lineHeight: '28px' }}>다음으로 이동</ListSubheader> : null}
              {moveTargets.map((column) => (
                <MenuItem
                  key={column.id}
                  onClick={() => {
                    setMenuAnchor(null);
                    onMove(column.id);
                  }}
                >
                  {column.name}
                </MenuItem>
              ))}
            </Menu>
          </>
        ) : null}
      </Stack>
      <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
        {getUserName(post.authorId)} · {formatInboxDateTime(post.createdAt)}
      </Typography>
      {commentCount > 0 || post.attachments.length > 0 ? (
        <Box sx={{ display: 'flex', gap: 1.5, mt: 0.75, color: 'text.secondary' }}>
          {commentCount > 0 ? (
            <Stack direction="row" spacing={0.5} aria-label={`댓글 ${commentCount}개`} sx={{ alignItems: 'center' }}>
              <ChatBubbleOutlineRounded sx={{ fontSize: 14 }} />
              <Typography variant="caption">{commentCount}</Typography>
            </Stack>
          ) : null}
          {post.attachments.length > 0 ? (
            <Stack direction="row" spacing={0.5} aria-label={`첨부 ${post.attachments.length}개`} sx={{ alignItems: 'center' }}>
              <AttachFileOutlined sx={{ fontSize: 14 }} />
              <Typography variant="caption">{post.attachments.length}</Typography>
            </Stack>
          ) : null}
        </Box>
      ) : null}
    </Paper>
  );
}
