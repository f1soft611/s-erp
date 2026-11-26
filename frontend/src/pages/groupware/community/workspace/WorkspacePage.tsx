import { useMemo, useState } from 'react';
import AddOutlined from '@mui/icons-material/AddOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import { Alert, Box, Button, Card, CardContent, Container, Stack, TextField, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { PageHeader } from '../../../../shared/components/PageHeader';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PostDetailPanel } from '../../../../shared/components/feed/PostDetailPanel';
import { ContentSplitLayout } from '../../../../shared/components/view-mode/ContentSplitLayout';
import type { CommonViewMode } from '../../../../shared/components/view-mode/commonViewTypes';
import { FeedView } from '../../../../shared/components/view-mode/FeedView';
import { FeedViewSkeleton } from '../../../../shared/components/view-mode/FeedViewSkeleton';
import { FileView } from '../../../../shared/components/view-mode/FileView';
import { ListView } from '../../../../shared/components/view-mode/ListView';
import { ListViewSkeleton } from '../../../../shared/components/view-mode/ListViewSkeleton';
import { PageAreaOverlay } from '../../../../shared/components/view-mode/PageAreaOverlay';
import { PinnedViewToolbar } from '../../../../shared/components/view-mode/PinnedViewToolbar';
import { useNotification } from '../../../../shared/context/notification';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { KanbanBoard } from './components/KanbanBoard';
import { PostComposerDialog } from './components/PostComposerDialog';
import { RoomList } from './components/RoomList';
import { RoomSettingsDialog } from './components/RoomSettingsDialog';
import { WorkspaceFeedPost } from './components/WorkspaceFeedPost';
import { WorkspaceColumnSettings } from './components/WorkspaceColumnSettings';
import { WorkspaceFilterMenu } from './components/WorkspaceFilterMenu';
import { toFileItems, toListItems, type WorkspaceFileItem } from './data/workspaceFeedAdapter';
import { applyColumnColors } from './data/workspacePrefs';
import { downloadAttachmentFile, fileToAttachment } from './data/workspaceFiles';
import { can, resolveLevel } from './data/workspacePermissions';
import { SAMPLE_USERS } from './data/workspaceSamples';
import { useWorkspacePosts, type NewPostInput } from './hooks/useWorkspacePosts';
import { useWorkspaceRooms } from './hooks/useWorkspaceRooms';
import { useWorkspaceViewPrefs } from './hooks/useWorkspaceViewPrefs';
import type { WorkspaceAttachment, WorkspaceComment, WorkspaceRoom } from './types/workspace.types';

type WorkspacePageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  selectedMenuPermissions?: MenuPermission;
};

const errorMessage = (reason: unknown, fallback: string) => (reason instanceof Error ? reason.message : fallback);

const findComment = (comments: WorkspaceComment[], id: string): WorkspaceComment | undefined => {
  for (const comment of comments) {
    if (comment.id === id) return comment;
    const nested = findComment(comment.replies, id);
    if (nested) return nested;
  }
  return undefined;
};

export function WorkspacePage({ selectedModule, currentMenuName, content, selectedMenuPermissions }: WorkspacePageProps) {
  const { showSuccess, showWarning, showError } = useNotification();
  const theme = useTheme();
  // 좁은 화면에서는 가로 스크롤 대신 컬럼 탭으로 한 컬럼씩 본다.
  const isNarrow = useMediaQuery(theme.breakpoints.down('sm'));
  // 좌우로 나뉘는 넓이(900px 이상)에서만 칸반이 남은 높이를 채운다. 그보다 좁으면 우측 패널이 아래로 내려간다.
  const isSplit = useMediaQuery(theme.breakpoints.up('md'));
  // 백엔드 연동 전까지 샘플 사용자를 전환해 권한별 화면을 확인한다. 연동 시 로그인 사용자로 교체한다.
  const [userId, setUserId] = useState(SAMPLE_USERS[0].id);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [viewByRoom, setViewByRoom] = useState<Record<string, CommonViewMode>>({});
  const [composerOpen, setComposerOpen] = useState(false);
  const [settingsTarget, setSettingsTarget] = useState<'edit' | 'new' | null>(null);
  const [detailPostId, setDetailPostId] = useState<string | null>(null);

  const readDenied = selectedMenuPermissions != null && !selectedMenuPermissions.read;
  const canCreateRoom = selectedMenuPermissions ? Boolean(selectedMenuPermissions.create) : true;

  const roomsState = useWorkspaceRooms(userId);
  const room: WorkspaceRoom | null =
    roomsState.rooms.find((item) => item.id === selectedRoomId) ?? roomsState.rooms[0] ?? null;
  const level = room ? resolveLevel(room, userId) : null;
  // 메뉴 권한이 바깥 관문이다. 방 권한이 있어도 메뉴 권한이 없으면 쓰기·방 설정은 막는다.
  const menuCanWrite = selectedMenuPermissions ? Boolean(selectedMenuPermissions.create || selectedMenuPermissions.update) : true;
  const menuCanAdmin = selectedMenuPermissions ? Boolean(selectedMenuPermissions.update) : true;
  const canWrite = can(level, 'write') && menuCanWrite;
  const canAdmin = can(level, 'admin') && menuCanAdmin;

  const postsState = useWorkspacePosts(room?.id ?? null, userId);
  const { prefs, update: updatePrefs } = useWorkspaceViewPrefs(userId, room);

  // 사용자별 컬럼 색을 방 설정의 색 위에 덮어씌운 방. 칸반·피드·상세는 이 방으로 그린다.
  const viewRoom = useMemo<WorkspaceRoom | null>(
    () => (room ? { ...room, columns: applyColumnColors(room.columns, prefs) } : null),
    [room, prefs],
  );
  const hasColumns = (room?.columns.length ?? 0) > 0;
  const requestedView = room ? (viewByRoom[room.id] ?? room.defaultView) : 'feed';
  const view: CommonViewMode = requestedView === 'kanban' && !hasColumns ? 'feed' : requestedView;

  // 칸반(보드) 보기에서는 보드가 남은 높이를 채워 가로 스크롤바가 화면 아래에 놓이게 한다.
  const fillKanban = view === 'kanban' && isSplit && room !== null && !readDenied;

  const visiblePosts = useMemo(() => {
    const keyword = prefs.keyword.trim().toLowerCase();
    return postsState.posts.filter((post) => {
      if (prefs.onlyMine && post.authorId !== userId) return false;
      if (!keyword) return true;
      return `${post.title} ${post.body.replace(/<[^>]+>/g, ' ')}`.toLowerCase().includes(keyword);
    });
  }, [postsState.posts, prefs.keyword, prefs.onlyMine, userId]);

  // 변경 함수는 실패를 알림으로 보여주고, 입력 내용을 유지할 수 있게 오류를 다시 던진다.
  const guarded = async (action: () => Promise<unknown>, success: string | null, failure: string) => {
    try {
      await action();
      if (success) showSuccess(success);
    } catch (reason) {
      showError(errorMessage(reason, failure));
      throw reason;
    }
  };

  const toAttachments = (files: File[]): Promise<WorkspaceAttachment[]> => Promise.all(files.map(fileToAttachment));

  const handleMovePost = (postId: string, columnId: string) => {
    guarded(() => postsState.movePost(postId, columnId), null, '카드를 이동하지 못했습니다.').catch(() => undefined);
  };

  const handleCreatePost = (input: NewPostInput) =>
    guarded(() => postsState.createPost(input), '글을 등록했습니다.', '글을 등록하지 못했습니다.');

  const handleAddComment = (postId: string, parentId: string | null, html: string, files: File[]) =>
    guarded(
      async () => postsState.addComment(postId, parentId, html, await toAttachments(files)),
      null,
      '댓글을 등록하지 못했습니다.',
    );

  const handleEditComment = (postId: string, commentId: string, html: string, files: File[]) =>
    guarded(
      async () => {
        const existing = findComment(postsState.posts.find((post) => post.id === postId)?.comments ?? [], commentId);
        const merged = [...(existing?.attachments ?? []), ...(await toAttachments(files))];
        await postsState.updateComment(postId, commentId, html, merged);
      },
      null,
      '댓글을 수정하지 못했습니다.',
    );

  const handleDeleteComment = (postId: string, commentId: string) =>
    guarded(() => postsState.deleteComment(postId, commentId), null, '댓글을 삭제하지 못했습니다.');

  const handleDownload = (attachment: WorkspaceAttachment) => {
    if (!downloadAttachmentFile(attachment)) {
      showWarning('백엔드 연동 전에는 이 파일을 내려받을 수 없습니다. (1MB 이하 파일만 보관됩니다)');
    }
  };

  const handleSaveRoom = async (next: WorkspaceRoom) => {
    const saved = await roomsState.saveRoom(next);
    setSelectedRoomId(saved.id);
    showSuccess('방 설정을 저장했습니다.');
  };

  const detailPost = postsState.posts.find((post) => post.id === detailPostId) ?? null;
  const closeDetail = () => setDetailPostId(null);

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    ...(room && canWrite
      ? [
          {
            key: 'workspace-post',
            actions: [{ key: 'create-post', label: '새 글', icon: AddOutlined, onClick: () => setComposerOpen(true) }],
          },
        ]
      : []),
    ...(room && canAdmin
      ? [
          {
            key: 'workspace-room',
            actions: [{ key: 'room-settings', label: '방 설정', icon: SettingsOutlined, onClick: () => setSettingsTarget('edit') }],
          },
        ]
      : []),
  ];

  const renderEmpty = () => (
    <Box sx={{ py: 6, textAlign: 'center' }}>
      <Typography color="text.secondary">표시할 글이 없습니다.</Typography>
      {canWrite ? (
        <Button size="small" variant="outlined" startIcon={<AddOutlined />} sx={{ mt: 1.5 }} onClick={() => setComposerOpen(true)}>
          첫 글 작성
        </Button>
      ) : null}
    </Box>
  );

  const renderPosts = (activeRoom: WorkspaceRoom) => {
    if (postsState.loading) {
      return (
        <Box role="status" aria-label="글 불러오는 중" sx={{ width: '100%', py: 2 }}>
          {view === 'list' ? <ListViewSkeleton /> : <FeedViewSkeleton />}
        </Box>
      );
    }
    if (view === 'kanban') {
      return (
        <KanbanBoard
          room={activeRoom}
          posts={visiblePosts}
          prefs={prefs}
          canWrite={canWrite}
          layout={isNarrow ? 'tabs' : 'board'}
          fillHeight={fillKanban}
          onMovePost={handleMovePost}
          onOpenPost={setDetailPostId}
          onToggleCollapse={(columnId) =>
            updatePrefs({
              collapsedColumnIds: prefs.collapsedColumnIds.includes(columnId)
                ? prefs.collapsedColumnIds.filter((id) => id !== columnId)
                : [...prefs.collapsedColumnIds, columnId],
            })
          }
        />
      );
    }
    if (visiblePosts.length === 0) return renderEmpty();
    if (view === 'list') {
      return (
        <ListView
          items={toListItems(visiblePosts, activeRoom)}
          ariaLabel="리스트형 글 목록"
          badgeOrder="status-category"
          onItemClick={(item) => setDetailPostId(String(item.id))}
        />
      );
    }
    if (view === 'file') {
      const files = toFileItems(visiblePosts);
      return (
        <FileView<WorkspaceFileItem>
          items={files}
          isLoading={false}
          hasNext={false}
          error=""
          onLoadMore={() => undefined}
          onRetry={() => undefined}
          onDownload={(item) => handleDownload(item.attachment)}
          onOpenSource={(item) => setDetailPostId(item.postId)}
        />
      );
    }
    return (
      <FeedView
        items={visiblePosts}
        renderItem={(post) => (
          <WorkspaceFeedPost
            key={post.id}
            room={activeRoom}
            post={post}
            currentUserId={userId}
            canWrite={canWrite}
            onAddComment={handleAddComment}
            onEditComment={handleEditComment}
            onDeleteComment={handleDeleteComment}
            onDownloadAttachment={handleDownload}
          />
        )}
      />
    );
  };

  const renderLeft = () => {
    if (readDenied) return <Alert severity="warning">조회 권한이 없어 협업공간을 볼 수 없습니다.</Alert>;
    if (roomsState.error) {
      return (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void roomsState.reload()}>
              재시도
            </Button>
          }
        >
          {roomsState.error}
        </Alert>
      );
    }
    if (roomsState.loading) {
      return (
        <Box role="status" aria-label="협업방 불러오는 중" sx={{ width: '100%', py: 2 }}>
          <FeedViewSkeleton />
        </Box>
      );
    }
    if (!room) {
      return (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography>참여 중인 협업방이 없습니다.</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {canCreateRoom ? '오른쪽 \x27방 만들기\x27로 새 협업방을 시작하거나, 방 관리자에게 참여를 요청하세요.' : '방 관리자에게 참여를 요청하세요.'}
          </Typography>
        </Box>
      );
    }
    return (
      <>
        <PinnedViewToolbar
          enableKanbanView
          enableFileView
          pinnedCount={visiblePosts.length}
          mode={view}
          onChange={(next) => setViewByRoom((current) => ({ ...current, [room.id]: next }))}
          countLabel="글"
          modeLabel="글 보기 방식"
          filterAction={
            <>
              <WorkspaceFilterMenu prefs={prefs} onPrefsChange={updatePrefs} />
              {view === 'kanban' && hasColumns ? (
                <WorkspaceColumnSettings prefs={prefs} columns={room.columns} onPrefsChange={updatePrefs} />
              ) : null}
            </>
          }
        />
        {level === 'read' ? (
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1 }}>
            조회 전용 권한입니다.
          </Typography>
        ) : null}
        {postsState.error ? (
          <Alert
            severity="error"
            sx={{ mb: 1.5 }}
            action={
              <Button color="inherit" size="small" onClick={() => void postsState.reload()}>
                재시도
              </Button>
            }
          >
            {postsState.error}
          </Alert>
        ) : null}
        {renderPosts(viewRoom ?? room)}
      </>
    );
  };

  // 우측 패널: 개발용 사용자 전환을 맨 위에, 그 아래에 내 협업방 목록과 방 만들기를 둔다.
  const renderRight = () => (
    <Stack spacing={2}>
      <Card sx={{ borderRadius: 1, border: '1px dashed rgba(148,163,184,0.4)', boxShadow: 'none' }}>
        <CardContent sx={{ p: 2 }}>
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1 }}>
            사용자 전환(개발용)
          </Typography>
          <TextField
            select
            size="small"
            fullWidth
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            slotProps={{ select: { native: true }, htmlInput: { 'aria-label': '사용자 전환' } }}
          >
            {SAMPLE_USERS.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </TextField>
        </CardContent>
      </Card>
      {readDenied ? null : (
        <Card sx={{ borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
              내 협업방
            </Typography>
            <RoomList
              rooms={roomsState.rooms}
              selectedRoomId={room?.id ?? null}
              onSelect={setSelectedRoomId}
              onCreate={() => setSettingsTarget('new')}
              canCreate={canCreateRoom}
            />
          </CardContent>
        </Card>
      )}
    </Stack>
  );

  return (
    <Box
      data-testid="workspace-page"
      sx={{ flex: 1, position: 'relative', minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <PageHeader
        breadcrumbItems={[selectedModule.name, '커뮤니티', currentMenuName]}
        description={content.description}
        actionGroups={pageActionGroups}
      />

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
        <Container maxWidth="xl" sx={{ p: 2, boxSizing: 'border-box', ...(fillKanban ? { height: '100%' } : { minHeight: '100%' }) }}>
          {/* 왼쪽은 칸반 4컬럼(250px×4 + 간격 36px)이 들어갈 폭까지만 쓰고, 남는 폭은 오른쪽 패널(최소 320px)이 가져간다. */}
          <ContentSplitLayout left={renderLeft()} right={renderRight()} leftMaxWidth={1036} rightMinWidth={320} fillHeight={fillKanban} />
        </Container>
      </Box>

      {room ? (
        <PostComposerDialog open={composerOpen} room={room} onClose={() => setComposerOpen(false)} onSubmit={handleCreatePost} />
      ) : null}
      {room && detailPost ? (
        <PageAreaOverlay onClose={closeDetail}>
          <PostDetailPanel title="글 상세" onClose={closeDetail}>
            <WorkspaceFeedPost
              room={viewRoom ?? room}
              post={detailPost}
              currentUserId={userId}
              canWrite={canWrite}
              onAddComment={handleAddComment}
              onEditComment={handleEditComment}
              onDeleteComment={handleDeleteComment}
              onDownloadAttachment={handleDownload}
            />
          </PostDetailPanel>
        </PageAreaOverlay>
      ) : null}
      <RoomSettingsDialog
        open={settingsTarget !== null}
        room={settingsTarget === 'edit' ? room : null}
        users={SAMPLE_USERS}
        currentUserId={userId}
        onClose={() => setSettingsTarget(null)}
        onSave={handleSaveRoom}
      />
    </Box>
  );
}
