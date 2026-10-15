import { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import AddOutlined from '@mui/icons-material/AddOutlined';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { PageAreaOverlay } from '../../../../shared/components/view-mode/PageAreaOverlay';
import { PostDetailPanel } from '../../../../shared/components/feed/PostDetailPanel';
import { useNotification } from '../../../../shared/context/NotificationContext';
import type {
  MenuPermission,
  ModuleItem,
  PageContent,
} from '../../../dashboard/types/dashboard';
import { ArchiveComposerDialog } from './components/ArchiveComposerDialog';
import { ArchivePostDetail } from './components/ArchivePostDetail';
import { ArchivePostTable } from './components/ArchivePostTable';
import { useArchiveCategories } from './hooks/useArchiveCategories';
import { useArchiveList } from './hooks/useArchiveList';
import { useArchiveMutations } from './hooks/useArchiveMutations';
import { downloadArchiveAttachment, fetchArchivePostDetail } from './services/archiveBoardService';
import type {
  ArchiveId,
  ArchivePost,
  ArchivePostSavePayload,
} from './types/archive.types';

type ArchiveBoardPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  selectedMenuPermissions?: MenuPermission;
  isTenantAdmin?: boolean;
};

export function ArchiveBoardPage({
  selectedModule,
  currentMenuName,
  content,
  selectedMenuPermissions,
  isTenantAdmin = false,
}: ArchiveBoardPageProps) {
  const { showError, showSuccess } = useNotification();
  const {
    posts,
    resultCnt,
    pageIndex,
    pageUnit,
    keyword,
    categoryCode,
    isLoading,
    error: listError,
    setPageIndex,
    setKeyword,
    setCategoryCode,
    loadArchivePosts,
  } = useArchiveList();
  const {
    categories,
    isLoading: categoriesLoading,
    error: categoriesError,
    loadCategories,
  } = useArchiveCategories();
  const [searchDraft, setSearchDraft] = useState(keyword);
  const [selectedPost, setSelectedPost] = useState<ArchivePost | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<Error | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ArchivePost | null>(null);
  const detailRequest = useRef(0);

  const canCreate = isTenantAdmin && Boolean(selectedMenuPermissions?.create);
  const canUpdate = isTenantAdmin && Boolean(selectedMenuPermissions?.update);
  const canDelete = isTenantAdmin && Boolean(selectedMenuPermissions?.delete);
  const loadDetail = useCallback(async (postId: ArchiveId) => {
    const request = ++detailRequest.current;
    setIsDetailLoading(true);
    setDetailError(null);
    try {
      const detail = await fetchArchivePostDetail(postId);
      if (request === detailRequest.current) setSelectedPost(detail);
    } catch (cause) {
      if (request === detailRequest.current) {
        const error =
          cause instanceof Error ? cause : new Error(String(cause));
        setDetailError(error);
        showError(`자료 상세를 불러오지 못했습니다: ${error.message}`);
      }
    } finally {
      if (request === detailRequest.current) setIsDetailLoading(false);
    }
  }, [showError]);

  const closeDetail = useCallback(() => {
    detailRequest.current += 1;
    setSelectedPost(null);
    setDetailError(null);
    setIsDetailLoading(false);
  }, []);

  const handleSelectPost = (post: ArchivePost) => {
    setSelectedPost(post);
    void loadDetail(post.postId);
  };

  const mutations = useArchiveMutations({
    reloadList: loadArchivePosts,
    reloadDetail: loadDetail,
    onPostDeleted: closeDetail,
    showError,
    showSuccess,
  });

  const handleSave = (
    postId: ArchiveId | null,
    payload: ArchivePostSavePayload,
    files: File[],
    removedAttachments: Parameters<typeof mutations.savePost>[3],
  ) => mutations.savePost(postId, payload, files, removedAttachments);

  const handleDownload = async (post: ArchivePost, fileIndex: number) => {
    const attachment = post.attachments?.[fileIndex];
    if (!attachment) return;
    try {
      await downloadArchiveAttachment(attachment);
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : String(cause);
      showError(`파일 다운로드에 실패했습니다: ${message}`);
    }
  };

  const handleSearch = () => setKeyword(searchDraft.trim());
  const showReadDenied =
    selectedMenuPermissions != null && !selectedMenuPermissions.read;

  return (
    <Box
      sx={{
        width: '100%',
        minWidth: 0,
        maxWidth: '100%',
        overflowX: 'hidden',
        position: 'relative',
      }}
    >
      <PageHeader
        breadcrumbItems={[selectedModule.name, currentMenuName]}
        description={content.description}
        actionGroups={
          canCreate
            ? [
                {
                  key: 'archive-create',
                  actions: [
                    {
                      key: 'create-archive',
                      label: '새 자료 등록',
                      icon: AddOutlined,
                      onClick: () => {
                        setIsEditing(false);
                        setComposerOpen(true);
                      },
                    },
                  ],
                },
              ]
            : undefined
        }
      />
      {showReadDenied ? (
        <Container maxWidth="xl" sx={{ py: 3 }}>
          <Alert severity="warning">자료실을 조회할 권한이 없습니다.</Alert>
        </Container>
      ) : (
        <>
          <PageSearchArea
            searchField={
              <Button type="button" variant="contained" onClick={handleSearch}>
                검색
              </Button>
            }
            onDefaultSearch={handleSearch}
          >
            <TextField
              label="자료 검색"
              size="small"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              sx={{ flex: '1 1 220px', minWidth: { xs: '100%', sm: 220 } }}
            />
            <TextField
              select
              label="분류 필터"
              size="small"
              value={categoryCode}
              onChange={(event) => setCategoryCode(event.target.value)}
              sx={{ flex: '1 1 180px', minWidth: { xs: '100%', sm: 180 } }}
            >
              <MenuItem value="">전체 분류</MenuItem>
              {categories.map((category) => (
                <MenuItem key={category.code} value={category.code}>
                  {category.name}
                </MenuItem>
              ))}
            </TextField>
          </PageSearchArea>
          <Container
            maxWidth="xl"
            sx={{
              py: 3,
              px: { xs: 1.5, sm: 3 },
              minWidth: 0,
              maxWidth: '100%',
            }}
          >
            <Typography
              component="h1"
              variant="h5"
              sx={{ mb: 2, fontWeight: 700, overflowWrap: 'anywhere' }}
            >
              {content.title}
            </Typography>
            {categoriesLoading && (
              <Box role="status" aria-label="분류 불러오는 중" sx={{ mb: 2 }}>
                <CircularProgress size={20} />
              </Box>
            )}
            {categoriesError && (
              <Alert
                severity="error"
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => void loadCategories()}
                  >
                    분류 다시 시도
                  </Button>
                }
                sx={{ mb: 2 }}
              >
                분류를 불러오지 못했습니다: {categoriesError.message}
              </Alert>
            )}
            {listError ? (
              <Alert
                severity="error"
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => void loadArchivePosts()}
                  >
                    다시 시도
                  </Button>
                }
              >
                자료 목록을 불러오지 못했습니다: {listError.message}
              </Alert>
            ) : (
              <ArchivePostTable
                posts={posts}
                categories={categories}
                isLoading={isLoading}
                pageIndex={pageIndex}
                pageUnit={pageUnit}
                resultCnt={resultCnt}
                onSelect={handleSelectPost}
                onPageChange={setPageIndex}
              />
            )}
          </Container>
          {selectedPost && (
            <PageAreaOverlay onClose={closeDetail}>
              {isDetailLoading ? (
                <PostDetailPanel
                  onClose={closeDetail}
                  isLoading
                  loadingLabel="자료 상세 불러오는 중"
                >
                  <span />
                </PostDetailPanel>
              ) : detailError ? (
                <PostDetailPanel onClose={closeDetail} title="자료 상세">
                  <Alert
                    severity="error"
                    action={
                      <Button
                        color="inherit"
                        size="small"
                        onClick={() => void loadDetail(selectedPost.postId)}
                      >
                        다시 시도
                      </Button>
                    }
                  >
                    상세를 불러오지 못했습니다: {detailError.message}
                  </Alert>
                </PostDetailPanel>
              ) : (
                <ArchivePostDetail
                  post={selectedPost}
                  categories={categories}
                  onClose={closeDetail}
                  onDownload={handleDownload}
                  onEdit={
                    canUpdate
                      ? () => {
                          setIsEditing(true);
                          setComposerOpen(true);
                        }
                      : undefined
                  }
                  onDelete={
                    canDelete ? () => setDeleteTarget(selectedPost) : undefined
                  }
                />
              )}
            </PageAreaOverlay>
          )}
          <ArchiveComposerDialog
            open={composerOpen}
            post={isEditing ? selectedPost : null}
            categories={categories}
            isSaving={mutations.isSaving}
            onClose={() => setComposerOpen(false)}
            onSave={handleSave}
          />
          <Dialog
            open={deleteTarget != null}
            onClose={mutations.isDeleting ? undefined : () => setDeleteTarget(null)}
            aria-labelledby="archive-delete-title"
          >
            <DialogTitle id="archive-delete-title">자료 삭제 확인</DialogTitle>
            <DialogContent>
              <Typography>이 자료를 삭제하시겠습니까?</Typography>
            </DialogContent>
            <DialogActions>
              <Button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={mutations.isDeleting}
              >
                취소
              </Button>
              <Button
                type="button"
                color="error"
                variant="contained"
                aria-label="삭제 확인"
                disabled={mutations.isDeleting}
                onClick={() => {
                  if (!deleteTarget) return;
                  const target = deleteTarget;
                  setDeleteTarget(null);
                  void mutations.deletePost(target.postId);
                }}
              >
                삭제 확인
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Box>
  );
}
