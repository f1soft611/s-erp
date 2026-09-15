import { Box, Container, useTheme } from '@mui/material';
import AddOutlined from '@mui/icons-material/AddOutlined';
import { useState } from 'react';
import { PageHeader } from '../../../../shared/components/PageHeader';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import type {
  ModuleItem,
  PageContent,
} from '../../../dashboard/types/dashboard';
import { NoticeComposerDialog } from './components/NoticeComposerDialog';
import { NoticeFeedList } from './components/NoticeFeedList';
import { NoticeFilterBar } from './components/NoticeFilterBar';
import { NoticeSummaryPanel } from './components/NoticeSummaryPanel';
import { noticeFeed, summaryStats } from './data/noticeData';

type CommunityNoticePageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
};

export function CommunityNoticePage({
  selectedModule,
  currentMenuName,
  content,
}: CommunityNoticePageProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const hasCreatePermission = true;
  const [expandedNoticeId, setExpandedNoticeId] = useState<number | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'write',
      actions: [
        {
          key: 'create-notice',
          label: '새 공지 작성',
          icon: AddOutlined,
          visible: hasCreatePermission,
          onClick: () => setIsComposerOpen(true),
        },
      ],
    },
  ];

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <PageHeader
        breadcrumbItems={[selectedModule.name, '커뮤니티', currentMenuName]}
        description={content.description}
        actionGroups={hasCreatePermission ? pageActionGroups : undefined}
      />

      <NoticeFilterBar isDark={isDark} />

      <Box
        sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}
      >
        <Container maxWidth="xl" sx={{ py: 3 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1.7fr 0.9fr' },
              gap: 2,
            }}
          >
            <NoticeFeedList
              items={noticeFeed}
              isDark={isDark}
              expandedNoticeId={expandedNoticeId}
              onToggleExpand={(id) =>
                setExpandedNoticeId((current) => (current === id ? null : id))
              }
            />
            <NoticeSummaryPanel stats={summaryStats} isDark={isDark} />
          </Box>
        </Container>
      </Box>

      <NoticeComposerDialog
        open={isComposerOpen}
        isDark={isDark}
        onClose={() => setIsComposerOpen(false)}
      />
    </Box>
  );
}
