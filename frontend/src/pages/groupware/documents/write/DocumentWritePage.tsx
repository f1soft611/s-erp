import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import { Box, Container } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { PageHeader } from '../../../../shared/components/PageHeader';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { ContentSplitLayout } from '../../../../shared/components/view-mode/ContentSplitLayout';
import { FeedView } from '../../../../shared/components/view-mode/FeedView';
import { ListView } from '../../../../shared/components/view-mode/ListView';
import { PinnedItemsPanel } from '../../../../shared/components/view-mode/PinnedItemsPanel';
import { PinnedViewToolbar } from '../../../../shared/components/view-mode/PinnedViewToolbar';
import { NoticeFilterMenu } from '../../community/notice/components/NoticeFilterMenu';
import { ApprovalSummaryPanel } from './components/ApprovalSummaryPanel';
import { DocumentComposerDialog } from './components/DocumentComposerDialog';
import { DocumentFeedItem } from './components/DocumentFeedItem';
import { EmptyDocumentList } from './components/EmptyDocumentList';
import { documentKinds, sampleDocuments } from './data/documentWriteData';
import { useDocumentWritePage } from './hooks/useDocumentWritePage';
import type { DocumentKind, DocumentWritePageProps } from './types/documentWrite.types';

export function DocumentWritePage({
  selectedModule,
  currentMenuName,
  content,
}: DocumentWritePageProps) {
  const theme = useTheme();
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
    pinnedViewItems,
    unpinnedViewItems,
  } = useDocumentWritePage();

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
                {pinnedDocuments.length > 0 && (
                  <Box sx={{ mb: 1.5 }}>
                    <PinnedItemsPanel
                      items={pinnedViewItems}
                      ariaLabel="상단 고정 문서"
                    />
                  </Box>
                )}
                {viewMode === 'feed' ? (
                  <Box data-testid="document-feed">
                    {unpinnedDocuments.length > 0 ? (
                      <FeedView
                        items={unpinnedDocuments}
                        renderItem={(item) => (
                          <DocumentFeedItem
                            item={item}
                            isDark={theme.palette.mode === 'dark'}
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
                      />
                    ) : (
                      <EmptyDocumentList onCreate={openComposer} />
                    )}
                  </Box>
                )}
              </>
            }
            right={<ApprovalSummaryPanel items={sampleDocuments} />}
          />
        </Container>
      </Box>

      <DocumentComposerDialog
        open={isComposerOpen}
        onClose={closeComposer}
      />
    </Box>
  );
}
