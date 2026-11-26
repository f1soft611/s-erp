import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import { edgeScrollStep, scrollEdges } from '../data/workspaceKanbanScroll';
import type { WorkspacePost, WorkspaceRoom, WorkspaceViewPrefs } from '../types/workspace.types';
import { KanbanColumn } from './KanbanColumn';

type KanbanBoardProps = {
  room: WorkspaceRoom;
  /** 필터가 이미 적용된 글 목록 */
  posts: WorkspacePost[];
  prefs: WorkspaceViewPrefs;
  canWrite: boolean;
  onMovePost: (postId: string, columnId: string) => void;
  onOpenPost: (postId: string) => void;
  /** 작성자 본인 카드의 더보기 메뉴에 수정을 보여준다. */
  currentUserId?: string;
  onEditPost?: (postId: string) => void;
  onToggleCollapse?: (columnId: string) => void;
  /** board: 가로 스크롤 보드, tabs: 좁은 화면에서 컬럼 탭으로 한 컬럼씩 보기 */
  layout?: 'board' | 'tabs';
  /** 남은 높이를 채운다. 컬럼이 아래까지 늘어나고 가로 스크롤바가 보드 아래(화면 아래)에 놓인다. */
  fillHeight?: boolean;
};

const FADE = 28;

// 스크롤할 내용이 남은 쪽만 가장자리를 흐리게 해서 더 있다는 걸 알려 준다.
const edgeMask = (edges: { left: boolean; right: boolean }) => {
  if (!edges.left && !edges.right) return 'none';
  const start = edges.left ? `transparent 0, black ${FADE}px` : 'black 0';
  const end = edges.right ? `black calc(100% - ${FADE}px), transparent 100%` : 'black 100%';
  return `linear-gradient(to right, ${start}, ${end})`;
};

export function KanbanBoard({
  room,
  posts,
  prefs,
  canWrite,
  onMovePost,
  onOpenPost,
  currentUserId,
  onEditPost,
  onToggleCollapse,
  layout = 'board',
  fillHeight = false,
}: KanbanBoardProps) {
  const visibleColumns = prefs.columnOrder
    .map((id) => room.columns.find((column) => column.id === id))
    .filter((column): column is NonNullable<typeof column> => column !== undefined)
    .filter((column) => !prefs.hiddenColumnIds.includes(column.id));

  const boardRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);

  const updateEdges = useCallback(() => {
    const board = boardRef.current;
    if (!board) return;
    const next = scrollEdges(board.scrollLeft, board.clientWidth, board.scrollWidth);
    setEdges((current) => (current.left === next.left && current.right === next.right ? current : next));
  }, []);

  useEffect(() => {
    if (layout !== 'board') return undefined;
    updateEdges();
    const board = boardRef.current;
    if (!board || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(updateEdges);
    observer.observe(board);
    return () => observer.disconnect();
  }, [layout, updateEdges, visibleColumns.length, prefs.collapsedColumnIds.length]);

  // 카드를 끌어 가장자리에 가져가면 보드를 가로로 스크롤해 화면 밖 컬럼으로도 옮길 수 있게 한다.
  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    const board = boardRef.current;
    if (!board || !canWrite) return;
    const rect = board.getBoundingClientRect();
    const step = edgeScrollStep(event.clientX, rect.left, rect.right);
    if (step !== 0) board.scrollBy({ left: step });
  };

  const columnPosts = (columnId: string) => posts.filter((post) => post.columnId === columnId);

  if (layout === 'tabs') {
    const active = visibleColumns.find((column) => column.id === activeColumnId) ?? visibleColumns[0];
    return (
      <Box data-kanban-board data-kanban-layout="tabs" sx={{ minWidth: 0 }}>
        <Tabs
          value={active?.id ?? false}
          onChange={(_, value: string) => setActiveColumnId(value)}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="칸반 컬럼"
          sx={{ mb: 1.5, minHeight: 40, borderBottom: 1, borderColor: 'divider' }}
        >
          {visibleColumns.map((column) => (
            <Tab
              key={column.id}
              value={column.id}
              label={`${column.name} ${columnPosts(column.id).length}`}
              sx={{ minHeight: 40, textTransform: 'none' }}
            />
          ))}
        </Tabs>
        {active ? (
          <KanbanColumn
            fullWidth
            column={active}
            posts={columnPosts(active.id)}
            otherColumns={visibleColumns.filter((other) => other.id !== active.id)}
            collapsed={false}
            canWrite={canWrite}
            onMovePost={onMovePost}
            onOpenPost={onOpenPost}
            currentUserId={currentUserId}
            onEditPost={onEditPost}
          />
        ) : null}
      </Box>
    );
  }

  return (
    <Box
      ref={boardRef}
      data-kanban-board
      data-kanban-layout="board"
      data-kanban-fill={fillHeight ? 'true' : undefined}
      data-scroll-left={edges.left}
      data-scroll-right={edges.right}
      onScroll={updateEdges}
      onDragOver={handleDragOver}
      sx={{
        minWidth: 0,
        display: 'flex',
        gap: 1.5,
        alignItems: fillHeight ? 'stretch' : 'flex-start',
        overflowX: 'auto',
        overflowY: 'hidden',
        scrollSnapType: 'x proximity',
        // 세로로는 보드 안에서 스크롤해 컬럼 제목 줄이 항상 보이게 한다.
        ...(fillHeight ? { flex: 1, minHeight: 320 } : { maxHeight: 'calc(100vh - 260px)', minHeight: 240 }),
        pb: 1,
        maskImage: edgeMask(edges),
        WebkitMaskImage: edgeMask(edges),
      }}
    >
      {visibleColumns.map((column) => (
        <KanbanColumn
          key={column.id}
          column={column}
          posts={columnPosts(column.id)}
          otherColumns={visibleColumns.filter((other) => other.id !== column.id)}
          collapsed={prefs.collapsedColumnIds.includes(column.id)}
          canWrite={canWrite}
          onMovePost={onMovePost}
          onOpenPost={onOpenPost}
            currentUserId={currentUserId}
            onEditPost={onEditPost}
          onToggleCollapse={onToggleCollapse}
        />
      ))}
    </Box>
  );
}
