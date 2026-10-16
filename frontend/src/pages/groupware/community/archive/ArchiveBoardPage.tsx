import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import AddOutlined from '@mui/icons-material/AddOutlined';
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageAreaOverlay } from '../../../../shared/components/view-mode/PageAreaOverlay';
import { PostDetailPanel } from '../../../../shared/components/feed/PostDetailPanel';
import {
  toPageSearchFields,
  type PageSearchFieldValue,
} from '../../../../shared/components/page-search/searchFields';
import type { F1GridDataSource } from '../../../../shared/components/f1-grid';
import { useNotification } from '../../../../shared/context/NotificationContext';
import type {
  MenuPermission,
  ModuleItem,
  PageContent,
} from '../../../dashboard/types/dashboard';
import { ArchiveComposerDialog } from './components/ArchiveComposerDialog';
import { ArchivePostDetail } from './components/ArchivePostDetail';
import {
  ArchivePostGrid,
  createArchivePostColumns,
} from './components/ArchivePostGrid';
import { useArchiveCategories } from './hooks/useArchiveCategories';
import { useArchiveList } from './hooks/useArchiveList';
import { useArchiveMutations } from './hooks/useArchiveMutations';
import {
  downloadArchiveAttachment,
  fetchArchivePostDetail,
} from './services/archiveBoardService';
import type {
  ArchiveAttachment,
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
  const [searchDraft, setSearchDraft] = useState('');
  const [detailValues, setDetailValues] = useState<
    Record<string, PageSearchFieldValue>
  >({});
  const [listError, setListError] = useState<Error | null>(null);
  const [listErrorDismissed, setListErrorDismissed] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [totalRowCount, setTotalRowCount] = useState(0);
  const { dataSource, setKeyword, setCategoryCode } = useArchiveList({
    retryToken,
  });
  const {
    categories,
    isLoading: categoriesLoading,
    error: categoriesError,
    loadCategories,
  } = useArchiveCategories();
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

  const loadDetail = useCallback(
    async (postId: ArchiveId) => {
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
    },
    [showError],
  );

  const closeDetail = useCallback(() => {
    detailRequest.current += 1;
    setSelectedPost(null);
    setDetailError(null);
    setIsDetailLoading(false);
  }, []);

  const handleSelectPost = useCallback(
    (post: ArchivePost) => {
      setSelectedPost(post);
      void loadDetail(post.postId);
    },
    [loadDetail],
  );

  const columns = useMemo(
    () => createArchivePostColumns(categories, handleSelectPost),
    [categories, handleSelectPost],
  );
  const detailFields = useMemo(() => toPageSearchFields(columns), [columns]);
  const gridDataSource = useMemo<F1GridDataSource<ArchivePost>>(
    () => ({
      pageSize: dataSource.pageSize,
      async load(query) {
        const result = await dataSource.load(query);
        setHasLoaded(true);
        setTotalRowCount(result.totalRowCount);
        return result;
      },
    }),
    [dataSource],
  );

  useEffect(() => {
    setHasLoaded(false);
    setTotalRowCount(0);
    setListError(null);
    setListErrorDismissed(false);
  }, [gridDataSource]);

  const reloadList = useCallback(async () => {
    setListError(null);
    setListErrorDismissed(false);
    setRetryToken((current) => current + 1);
  }, []);
  const handleDataSourceError = useCallback((error: Error) => {
    setHasLoaded(false);
    setListErrorDismissed(false);
    setListError(error);
  }, []);
  const handleListErrorClose = useCallback(
    () => setListErrorDismissed(true),
    [],
  );

  const mutations = useArchiveMutations({
    reloadList,
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

  const handleDownload = async (attachment: ArchiveAttachment) => {
    try {
      await downloadArchiveAttachment(attachment);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      showError(`파일 다운로드에 실패했습니다: ${message}`);
    }
  };

  const handleSearch = () => setKeyword(searchDraft.trim());
  const handleDetailSearch = (
    values: Record<string, PageSearchFieldValue>,
  ) => {
    const value = values.categoryCode;
    setCategoryCode(
      value == null || typeof value === 'object' ? '' : String(value).trim(),
    );
  };
  const showReadDenied =
    selectedMenuPermissions != null && !selectedMenuPermissions.read;

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        maxWidth: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
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
              <TextField
                size="small"
                margin="none"
                placeholder="제목, 본문, 작성자 통합검색"
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                slotProps={{
                  htmlInput: { 'aria-label': '자료 검색' },
                  input: {
                    endAdornment: searchDraft ? (
                      <InputAdornment position="end">
                        <IconButton
                          type="button"
                          size="small"
                          edge="end"
                          aria-label="자료 검색어 초기화"
                          onClick={() => setSearchDraft('')}
                          sx={{ p: 0.25 }}
                        >
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                  },
                }}
                sx={{ width: '100%', height: 40 }}
              />
            }
            onDefaultSearch={handleSearch}
            detailFields={detailFields}
            detailValues={detailValues}
            onDetailValuesChange={setDetailValues}
            onDetailSearch={handleDetailSearch}
          >
            <Button
              type="button"
              variant="contained"
              size="small"
              startIcon={<SearchIcon fontSize="small" />}
              onClick={handleSearch}
              sx={{ minHeight: 40, whiteSpace: 'nowrap' }}
            >
              검색
            </Button>
          </PageSearchArea>
          {categoriesLoading && (
            <Box
              role="status"
              aria-label="분류 불러오는 중"
              sx={{ px: 3, pt: 1 }}
            >
              <CircularProgress size={20} />
            </Box>
          )}
          {categoriesError && (
            <Box sx={{ px: { xs: 1.5, sm: 3 }, pt: 1 }}>
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
              >
                분류를 불러오지 못했습니다: {categoriesError.message}
              </Alert>
            </Box>
          )}
          <PageMessageArea
            message={
              listError && !listErrorDismissed
                ? `자료 목록을 불러오지 못했습니다: ${listError.message}`
                : ''
            }
            onClose={handleListErrorClose}
          />
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              minWidth: 0,
              px: { xs: 1, sm: 2 },
              pb: 2,
              pt: 1,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {listError && (
              <Button
                type="button"
                size="small"
                onClick={() => void reloadList()}
                aria-label="다시 시도"
                sx={{ alignSelf: 'flex-start', mb: 1 }}
              >
                다시 시도
              </Button>
            )}
            <ArchivePostGrid
              columns={columns}
              dataSource={gridDataSource}
              onDataSourceError={handleDataSourceError}
            />
            {hasLoaded && totalRowCount === 0 && !listError && (
              <Box
                role="status"
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  px: 2,
                  py: 1.5,
                  mt: 1,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  등록된 자료가 없습니다.
                </Typography>
              </Box>
            )}
          </Box>
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
                  isDeletePending={mutations.isDeleting}
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
            onClose={
              mutations.isDeleting ? undefined : () => setDeleteTarget(null)
            }
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
