import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import { Alert, Box, Button, Container, Stack } from '@mui/material';
import { useState } from 'react';
import { PageHeader } from '../../../../shared/components/PageHeader';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { ContentSplitLayout } from '../../../../shared/components/view-mode/ContentSplitLayout';
import { FeedView } from '../../../../shared/components/view-mode/FeedView';
import { ListView } from '../../../../shared/components/view-mode/ListView';
import { FeedViewSkeleton } from '../../../../shared/components/view-mode/FeedViewSkeleton';
import { ListViewSkeleton } from '../../../../shared/components/view-mode/ListViewSkeleton';
import { PinnedItemsPanel } from '../../../../shared/components/view-mode/PinnedItemsPanel';
import { PinnedViewToolbar } from '../../../../shared/components/view-mode/PinnedViewToolbar';
import { PageAreaOverlay } from '../../../../shared/components/view-mode/PageAreaOverlay';
import { NoticeFilterMenu } from '../../community/notice/components/NoticeFilterMenu';
import { ApprovalSummaryPanel } from './components/ApprovalSummaryPanel';
import { ApprovalNoticePanel } from './components/ApprovalNoticePanel';
import { DocumentComposerDialog } from './components/DocumentComposerDialog';
import { DocumentApprovalDetailFeed } from './components/DocumentApprovalDetailFeed';
import { DocumentFeedItem } from './components/DocumentFeedItem';
import { DocumentStatusPanel } from './components/DocumentStatusPanel';
import { EmptyDocumentList } from './components/EmptyDocumentList';
import { documentKinds } from './data/documentWriteData';
import { useDocumentWritePage } from './hooks/useDocumentWritePage';
import type {
  DocumentApprovalDetail,
  DocumentKind,
  DocumentWritePageProps,
} from './types/documentWrite.types';

export function DocumentWritePage({
  selectedModule,
  currentMenuName,
  content,
}: DocumentWritePageProps) {
  const [editingDocument, setEditingDocument] =
    useState<DocumentApprovalDetail | null>(null);
  const [detailRefreshToken, setDetailRefreshToken] = useState(0);
  const {
    viewMode,
    setViewMode,
    selectedKind,
    setSelectedKind,
    isComposerOpen,
    openComposer,
    closeComposer,
    pinnedDocuments,
    unpinnedDocuments,
    feedDocuments,
    pinnedViewItems,
    unpinnedViewItems,
    summary,
    notices,
    isLoading,
    loadError,
    feedEmployeeId,
    feedEmployeeError,
    retryFeedEmployee,
    retry,
    selectScope,
    selectNotice,
    openDetail,
    closeDetail,
    detailDocumentId,
    refresh,
  } = useDocumentWritePage();
  const hasVisibleDocuments =
    viewMode === 'feed'
      ? feedDocuments.length > 0
      : pinnedDocuments.length + unpinnedDocuments.length > 0;
  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'document-write',
      actions: [
        {
          key: 'create-document',
          label: '문서 작성',
          icon: AddOutlinedIcon,
          visible: true,
          onClick: openComposer,
        },
      ],
    },
  ];

  return (
    <Box
      data-testid="document-write-page"
      sx={{
        flex: 1,
        position: 'relative',
        minWidth: 0,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <PageHeader
        breadcrumbItems={[selectedModule.name, '문서관리', currentMenuName]}
        description={content.description}
        actionGroups={pageActionGroups}
      />

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
        <Container
          maxWidth="xl"
          sx={{
            py: { xs: 1.5, sm: 2.5 },
            minHeight: '100%',
            boxSizing: 'border-box',
          }}
        >
          <ContentSplitLayout
            left={
              <>
                <PinnedViewToolbar
                  pinnedCount={pinnedDocuments.length}
                  mode={viewMode}
                  onChange={setViewMode}
                  countLabel="상단고정"
                  modeLabel="문서 보기 방식"
                  filterAction={
                    <NoticeFilterMenu
                      ariaLabel="문서 업무구분 필터"
                      filters={documentKinds.map((kind) => ({
                        code: kind,
                        name: kind,
                      }))}
                      selectedCode={selectedKind}
                      onChange={(code) =>
                        setSelectedKind(code as DocumentKind | '')
                      }
                    />
                  }
                />
                {loadError && (
                  <Alert
                    severity="error"
                    sx={{ mb: 1.5 }}
                    action={
                      <Button color="inherit" size="small" onClick={retry}>
                        다시 시도
                      </Button>
                    }
                  >
                    {loadError}
                  </Alert>
                )}
                {viewMode === 'feed' && feedEmployeeError && (
                  <Alert
                    severity="error"
                    sx={{ mb: 1.5 }}
                    action={
                      <Button
                        color="inherit"
                        size="small"
                        onClick={retryFeedEmployee}
                      >
                        사원 정보 다시 시도
                      </Button>
                    }
                  >
                    {feedEmployeeError}
                  </Alert>
                )}
                {isLoading ? (
                  <Box
                    role="status"
                    aria-label="문서 목록 불러오는 중"
                    sx={{ width: '100%', py: 2 }}
                  >
                    {viewMode === 'list' ? (
                      <ListViewSkeleton />
                    ) : loadError && !hasVisibleDocuments ? null : (
                      <Box data-testid="document-feed-skeleton">
                        <FeedViewSkeleton />
                      </Box>
                    )}
                  </Box>
                ) : (
                  <>
                {viewMode === 'list' && pinnedDocuments.length > 0 && (
                  <Box sx={{ mb: 1.5 }}>
                    <PinnedItemsPanel
                      items={pinnedViewItems}
                      ariaLabel="상단 고정 문서"
                    />
                  </Box>
                )}
                {viewMode === 'feed' ? (
                  <Box data-testid="document-feed">
                  {feedDocuments.length > 0 ? (
                      <FeedView
                        items={feedDocuments}
                        renderItem={(item) => (
                          <DocumentFeedItem
                            key={item.id}
                            item={item}
                            employeeId={feedEmployeeId}
                            detailRefreshToken={detailRefreshToken}
                            onActionComplete={refresh}
                            onEditDocument={(document) => {
                              setEditingDocument(document);
                              openComposer();
                            }}
                          />
                        )}
                      />
                    ) : (
                      <EmptyDocumentList onCreate={openComposer} />
                    )}
                  </Box>
                ) : (
                  <Box data-testid="document-list">
                    {unpinnedViewItems.length > 0 ? (
                      <ListView
                        items={unpinnedViewItems}
                        ariaLabel="리스트형 문서 목록"
                        badgeOrder="status-category"
                        onItemClick={(item) => openDetail(Number(item.id))}
                      />
                    ) : (
                      <EmptyDocumentList onCreate={openComposer} />
                    )}
                  </Box>
                )}
                  </>
                )}
              </>
            }
            right={
              <Stack spacing={2}>
                <ApprovalSummaryPanel summary={summary} onSelectScope={selectScope} />
                <DocumentStatusPanel summary={summary} onSelectScope={selectScope} />
                <ApprovalNoticePanel items={notices} onSelect={selectNotice} />
              </Stack>
            }
          />
        </Container>
      </Box>

      <DocumentComposerDialog
        open={isComposerOpen}
        initialDocument={editingDocument}
        onClose={() => {
          closeComposer();
          setEditingDocument(null);
          refresh({ quiet: true });
          setDetailRefreshToken((token) => token + 1);
        }}
      />
      {detailDocumentId !== null && (
        <PageAreaOverlay onClose={closeDetail}>
          <DocumentApprovalDetailFeed
            open
            electronicApprovalId={detailDocumentId}
            onClose={closeDetail}
            onActionComplete={refresh}
            onEditDocument={(document) => {
              setEditingDocument(document);
              openComposer();
            }}
            detailRefreshToken={detailRefreshToken}
          />
        </PageAreaOverlay>
      )}
    </Box>
  );
}
