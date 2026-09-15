import {
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import AddOutlined from '@mui/icons-material/AddOutlined';
import CloseIcon from '@mui/icons-material/Close';
import FilterListOutlined from '@mui/icons-material/FilterListOutlined';
import ImageOutlined from '@mui/icons-material/ImageOutlined';
import { useState } from 'react';
import { PageHeader } from '../../../../shared/components/PageHeader';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import type {
  ModuleItem,
  PageContent,
} from '../../../dashboard/types/dashboard';
import { NoticeFeedList } from './components/NoticeFeedList';
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

      <Box
        sx={{
          px: 3,
          pt: 1,
          pb: 1,
          borderBottom: `1px solid ${
            isDark ? 'rgba(148,163,184,0.15)' : 'rgba(148,163,184,0.18)'
          }`,
          backgroundColor: isDark
            ? 'rgba(15,23,42,0.42)'
            : 'rgba(255,255,255,0.7)',
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: '50%',
              backgroundColor: isDark ? 'rgba(30,41,59,0.9)' : '#f1f5f9',
              border: `1px solid ${
                isDark ? 'rgba(148,163,184,0.3)' : 'rgba(148,163,184,0.18)'
              }`,
            }}
            aria-label="필터 아이콘"
          >
            <FilterListOutlined
              fontSize="small"
              sx={{ color: isDark ? '#e2e8f0' : 'text.secondary' }}
            />
          </Box>
          {['전체', '중요 공지', '운영', '보안', '필독'].map((filter) => (
            <Chip
              key={filter}
              label={filter}
              size="small"
              sx={{
                borderRadius: 999,
                bgcolor:
                  filter === '중요 공지'
                    ? isDark
                      ? 'rgba(251, 191, 36, 0.18)'
                      : '#fef3c7'
                    : isDark
                      ? 'rgba(15, 23, 42, 0.9)'
                      : '#f1f5f9',
                color:
                  filter === '중요 공지'
                    ? '#fbbf24'
                    : isDark
                      ? '#e2e8f0'
                      : 'text.primary',
                fontWeight: 700,
                border: `1px solid ${
                  isDark ? 'rgba(148,163,184,0.28)' : 'rgba(148,163,184,0.18)'
                }`,
              }}
            />
          ))}
        </Stack>
      </Box>

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

      <Dialog
        open={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        maxWidth="lg"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              overflow: 'hidden',
              backgroundColor: isDark ? '#0f172a' : '#ffffff',
            },
          },
        }}
      >
        <Box sx={{ p: 2.5, bgcolor: isDark ? '#0f172a' : '#f8fafc' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 2,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              새 공지 작성
            </Typography>
            <IconButton
              onClick={() => setIsComposerOpen(false)}
              size="small"
              aria-label="닫기"
            >
              <CloseIcon />
            </IconButton>
          </Box>

          <Box
            sx={{
              border: `1px solid ${isDark ? 'rgba(148,163,184,0.18)' : 'rgba(148,163,184,0.18)'}`,
              borderRadius: 2,
              bgcolor: isDark ? '#111827' : '#ffffff',
            }}
          >
            <TextField
              label="제목"
              aria-label="제목"
              fullWidth
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': { border: 'none', borderRadius: 0 },
                '& .MuiInputLabel-root': { fontWeight: 700 },
              }}
            />
            <Divider />

            <Box
              sx={{
                px: 2,
                py: 1.5,
                borderBottom: `1px solid ${isDark ? 'rgba(148,163,184,0.18)' : 'rgba(148,163,184,0.18)'}`,
              }}
            >
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                {['B', 'I', 'A', '◦', '•', '1.'].map((tool) => (
                  <Button
                    key={tool}
                    variant="text"
                    aria-label={
                      tool === 'B'
                        ? '굵게'
                        : tool === 'I'
                          ? '기울임'
                          : tool === 'A'
                            ? '단락'
                            : '도구'
                    }
                    sx={{
                      minWidth: 0,
                      px: 1,
                      py: 0.5,
                      color: 'text.primary',
                      fontWeight: tool === 'B' ? 800 : 600,
                      fontStyle: tool === 'I' ? 'italic' : 'normal',
                    }}
                  >
                    {tool}
                  </Button>
                ))}
              </Stack>
            </Box>

            <TextField
              label="본문"
              aria-label="본문"
              multiline
              minRows={8}
              fullWidth
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': { border: 'none', borderRadius: 0 },
                '& .MuiInputLabel-root': { fontWeight: 700 },
              }}
            />

            <Box
              sx={{
                p: 2,
                borderTop: `1px solid ${isDark ? 'rgba(148,163,184,0.18)' : 'rgba(148,163,184,0.18)'}`,
              }}
            >
              <Button
                variant="outlined"
                startIcon={<ImageOutlined />}
                sx={{ mb: 2, borderRadius: 2 }}
              >
                이미지 첨부
              </Button>

              <Stack spacing={1}>
                {['2026_안내문.pdf', '3분기_일정표.xlsx', '운영가이드.png'].map(
                  (file) => {
                    const extension =
                      file.split('.').pop()?.toLowerCase() ?? '';
                    const fileMeta: Record<
                      string,
                      { bg: string; color: string; label: string }
                    > = {
                      pdf: { bg: '#fecaca', color: '#991b1b', label: 'PDF' },
                      xlsx: { bg: '#bbf7d0', color: '#166534', label: 'XLSX' },
                      png: { bg: '#ddd6fe', color: '#5b21b6', label: 'PNG' },
                    };
                    const meta = fileMeta[extension] ?? {
                      bg: '#e2e8f0',
                      color: '#475569',
                      label: 'FILE',
                    };

                    return (
                      <Box
                        key={file}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          border: `1px solid ${isDark ? 'rgba(148,163,184,0.18)' : 'rgba(148,163,184,0.18)'}`,
                          borderRadius: 2,
                          px: 1.25,
                          py: 0.9,
                          bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc',
                        }}
                      >
                        <Box
                          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                        >
                          <Box
                            sx={{
                              width: 26,
                              height: 26,
                              borderRadius: 1,
                              backgroundColor: meta.bg,
                              color: meta.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.65rem',
                              fontWeight: 800,
                            }}
                          >
                            {meta.label}
                          </Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {file}
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          variant="text"
                          sx={{ minWidth: 0 }}
                        >
                          삭제
                        </Button>
                      </Box>
                    );
                  },
                )}
              </Stack>
            </Box>

            <Box
              sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, p: 2 }}
            >
              <Button
                variant="outlined"
                onClick={() => setIsComposerOpen(false)}
              >
                취소
              </Button>
              <Button variant="contained" color="primary">
                등록
              </Button>
            </Box>
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
}
