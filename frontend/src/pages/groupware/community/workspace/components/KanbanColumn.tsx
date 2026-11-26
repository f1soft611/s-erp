import { useState, type DragEvent } from 'react';
import UnfoldMoreRounded from '@mui/icons-material/UnfoldMoreRounded';
import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import type { WorkspaceColumn, WorkspacePost } from '../types/workspace.types';
import { PostCard } from './PostCard';

type KanbanColumnProps = {
  column: WorkspaceColumn;
  posts: WorkspacePost[];
  /** 이동 메뉴에 보여줄 다른 컬럼(보이는 컬럼 기준). */
  otherColumns: WorkspaceColumn[];
  collapsed: boolean;
  canWrite: boolean;
  onMovePost: (postId: string, columnId: string) => void;
  onOpenPost: (postId: string) => void;
  onToggleCollapse?: (columnId: string) => void;
  /** 좁은 화면의 탭 보기에서 한 컬럼을 화면 폭 전체로 보여준다. */
  fullWidth?: boolean;
};

export function KanbanColumn({
  column,
  posts,
  otherColumns,
  collapsed,
  canWrite,
  onMovePost,
  onOpenPost,
  onToggleCollapse,
  fullWidth = false,
}: KanbanColumnProps) {
  const theme = useTheme();
  const [dragOver, setDragOver] = useState(false);
  const accent = column.color;

  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    if (!canWrite) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  };

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    if (!canWrite) return;
    event.preventDefault();
    setDragOver(false);
    const postId = event.dataTransfer.getData('text/plain');
    if (postId && !posts.some((post) => post.id === postId)) onMovePost(postId, column.id);
  };

  return (
    <Box
      data-column-id={column.id}
      data-column-color={accent}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      sx={{
        flex: fullWidth ? '1 1 auto' : collapsed ? '0 0 auto' : '0 0 250px',
        width: fullWidth ? '100%' : collapsed ? 56 : 250,
        // 가로 스크롤 보드에서 컬럼이 한 칸씩 맞게 멈춘다.
        scrollSnapAlign: 'start',
        maxHeight: '100%',
        minHeight: 160,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 1.5,
        // 컬럼 색이 있으면 옅은 배경과 위쪽 띠로 보여주고, 없으면 기본 모양을 쓴다.
        bgcolor: accent ? alpha(accent, theme.palette.mode === 'dark' ? 0.2 : 0.1) : 'action.hover',
        border: 2,
        borderStyle: dragOver ? 'dashed' : 'solid',
        borderColor: dragOver ? 'primary.main' : 'transparent',
        borderTopColor: dragOver ? 'primary.main' : (accent ?? 'transparent'),
        transition: 'width 120ms ease',
      }}
    >
      <Stack
        direction={collapsed ? 'column' : 'row'}
        spacing={collapsed ? 1 : 0}
        sx={{ alignItems: 'center', justifyContent: 'space-between', px: 1.25, py: 1 }}
      >
        <Typography
          component="h3"
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            ...(collapsed ? { writingMode: 'vertical-rl', order: 2 } : {}),
            overflowWrap: 'anywhere',
          }}
        >
          {column.name}
          <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: collapsed ? 0 : 0.75, mt: collapsed ? 0.5 : 0 }}>
            {posts.length}
          </Typography>
        </Typography>
        {onToggleCollapse ? (
          <ButtonBase
            aria-label={collapsed ? `${column.name} 컬럼 펼치기` : `${column.name} 컬럼 접기`}
            onClick={() => onToggleCollapse(column.id)}
            sx={{ borderRadius: 1, p: 0.25, color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
          >
            <UnfoldMoreRounded fontSize="small" />
          </ButtonBase>
        ) : null}
      </Stack>
      {collapsed ? null : (
        <Stack spacing={1} sx={{ px: 1, pb: 1, overflowY: 'auto', minHeight: 0, flex: 1 }}>
          {posts.length === 0 ? (
            <Typography variant="caption" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
              {canWrite ? '카드를 여기로 끌어 놓으세요' : '카드가 없습니다'}
            </Typography>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                canWrite={canWrite}
                moveTargets={otherColumns}
                onOpen={onOpenPost}
                onMove={(columnId) => onMovePost(post.id, columnId)}
              />
            ))
          )}
        </Stack>
      )}
    </Box>
  );
}
