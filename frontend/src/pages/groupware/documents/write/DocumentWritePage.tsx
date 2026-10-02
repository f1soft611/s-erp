import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined';
import FormatBoldOutlinedIcon from '@mui/icons-material/FormatBoldOutlined';
import FormatItalicOutlinedIcon from '@mui/icons-material/FormatItalicOutlined';
import StrikethroughSOutlinedIcon from '@mui/icons-material/StrikethroughSOutlined';
import FormatListBulletedOutlinedIcon from '@mui/icons-material/FormatListBulletedOutlined';
import FormatListNumberedOutlinedIcon from '@mui/icons-material/FormatListNumberedOutlined';
import FormatQuoteOutlinedIcon from '@mui/icons-material/FormatQuoteOutlined';
import RedoOutlinedIcon from '@mui/icons-material/RedoOutlined';
import UndoOutlinedIcon from '@mui/icons-material/UndoOutlined';
import { EditorContent, useEditor } from '@tiptap/react';
import Placeholder from '@tiptap/extension-placeholder';
import StarterKit from '@tiptap/starter-kit';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  IconButton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useRef, useState, type ChangeEvent } from 'react';
import { CommonDialog } from '../../../../shared/components/CommonDialog';
import { ContentSplitLayout } from '../../../../shared/components/view-mode/ContentSplitLayout';
import { FeedView } from '../../../../shared/components/view-mode/FeedView';
import { ListView } from '../../../../shared/components/view-mode/ListView';
import { PinnedItemsPanel } from '../../../../shared/components/view-mode/PinnedItemsPanel';
import { PinnedViewToolbar } from '../../../../shared/components/view-mode/PinnedViewToolbar';
import type { CommonViewMode } from '../../../../shared/components/view-mode/commonViewTypes';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { NoticeFilterMenu } from '../../community/notice/components/NoticeFilterMenu';
import { richTextContentStyles } from '../../../../shared/components/rich-text-editor/contentStyles';
import type {
  ModuleItem,
  PageContent,
} from '../../../dashboard/types/dashboard';

type DocumentKind = '기안서' | '업무연락' | '지출결의서' | '근태신청';
type ApprovalStatus = '임시저장' | '결재대기' | '결재중' | '보완요청' | '완료';

type DocumentWriteItem = {
  id: number;
  title: string;
  kind: DocumentKind;
  status: ApprovalStatus;
  author: string;
  date: string;
  summary: string;
  isPinned?: boolean;
};

type DocumentWritePageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
};

const documentKinds: DocumentKind[] = [
  '기안서',
  '업무연락',
  '지출결의서',
  '근태신청',
];

const sampleDocuments: DocumentWriteItem[] = [
  {
    id: 1,
    title: '월간 업무 계획 승인 요청',
    kind: '기안서',
    status: '결재대기',
    author: '김민수',
    date: '2026.10.02',
    summary: '10월 업무 계획 검토 및 승인을 요청합니다.',
    isPinned: true,
  },
  {
    id: 2,
    title: '생산 일정 변경 안내',
    kind: '업무연락',
    status: '결재중',
    author: '김민수',
    date: '2026.10.01',
    summary: '생산 일정 변경 내용을 공유합니다.',
    isPinned: true,
  },
  {
    id: 3,
    title: '작업 장비 교체 검토',
    kind: '기안서',
    status: '임시저장',
    author: '김민수',
    date: '2026.09.30',
    summary: '작업 장비 교체 필요 사항을 정리했습니다.',
  },
  {
    id: 4,
    title: '현장 점검 결과 공유',
    kind: '업무연락',
    status: '보완요청',
    author: '김민수',
    date: '2026.09.29',
    summary: '현장 점검 결과와 조치 사항을 공유합니다.',
  },
  {
    id: 5,
    title: '교육 참석 신청',
    kind: '근태신청',
    status: '완료',
    author: '박서연',
    date: '2026.09.28',
    summary: '외부 교육 참석을 신청했습니다.',
  },
  {
    id: 6,
    title: '현장 소모품 구입 정산',
    kind: '지출결의서',
    status: '결재중',
    author: '이도윤',
    date: '2026.09.26',
    summary: '현장 소모품 구입 비용 정산을 요청했습니다.',
  },
  {
    id: 7,
    title: '품질 점검 계획 승인 요청',
    kind: '기안서',
    status: '결재대기',
    author: '박서연',
    date: '2026.09.25',
    summary: '다음 주 품질 점검 계획 검토를 요청합니다.',
  },
];

const statusColor = (
  status: ApprovalStatus,
): 'default' | 'warning' | 'success' | 'info' => {
  if (status === '결재대기' || status === '보완요청') {
    return 'warning';
  }
  if (status === '완료') {
    return 'success';
  }
  if (status === '결재중') {
    return 'info';
  }
  return 'default';
};

function DocumentStatusChip({ status }: { status: ApprovalStatus }) {
  return (
    <Chip
      label={status}
      size="small"
      color={statusColor(status)}
      variant={status === '임시저장' ? 'outlined' : 'filled'}
      sx={{ height: 22, fontWeight: 700 }}
    />
  );
}

function DocumentFeedItem({
  item,
  isDark,
}: {
  item: DocumentWriteItem;
  isDark: boolean;
}) {
  return (
    <Card
      component="article"
      data-testid="document-write-item"
      sx={{
        width: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        borderRadius: 3,
        border: '1px solid rgba(148,163,184,0.18)',
        boxShadow: 'none',
        bgcolor: isDark ? 'rgba(15, 23, 42, 0.75)' : '#ffffff',
      }}
    >
      <CardContent sx={{ p: 2.5, minWidth: 0, overflow: 'hidden' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            mb: 2,
            minWidth: 0,
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              flexShrink: 0,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8rem',
              fontWeight: 700,
              bgcolor: isDark ? 'rgba(96,165,250,0.2)' : '#dbeafe',
              color: isDark ? '#eff6ff' : '#1f2937',
            }}
          >
            {item.author.slice(0, 1)}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {item.author}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {item.date}
            </Typography>
          </Box>
          <Stack
            direction="row"
            spacing={0.75}
            sx={{
              alignItems: 'center',
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
            }}
          >
            <Chip label={item.kind} size="small" color="primary" />
            <DocumentStatusChip status={item.status} />
          </Stack>
        </Box>
        <Typography
          variant="h6"
          sx={{
            fontSize: '1.25rem',
            lineHeight: 1.4,
            fontWeight: 700,
            mb: 1.5,
            overflowWrap: 'anywhere',
          }}
        >
          {item.title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {item.summary}
        </Typography>
      </CardContent>
    </Card>
  );
}

function ApprovalSummaryPanel({ items }: { items: DocumentWriteItem[] }) {
  const pendingCount = items.filter(
    (item) => item.status === '결재대기' || item.status === '보완요청',
  ).length;
  const inProgressCount = items.filter(
    (item) => item.status === '결재중',
  ).length;
  const draftCount = items.filter((item) => item.status === '임시저장').length;

  return (
    <Stack spacing={2}>
      <Card
        sx={{
          borderRadius: 3,
          border: '1px solid rgba(148,163,184,0.18)',
          boxShadow: 'none',
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              결재 요약
            </Typography>
            <Chip label="LIVE" size="small" color="warning" />
          </Box>
          <Stack spacing={1.5}>
            {[
              ['내가 처리할 결재', pendingCount],
              ['결재 진행 중', inProgressCount],
              ['작성 중 문서', draftCount],
            ].map(([label, count]) => (
              <Box
                key={label}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 1,
                  py: 1,
                  borderBottom: '1px solid rgba(148,163,184,0.16)',
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {label}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                  {count}건
                </Typography>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Card
        sx={{
          borderRadius: 3,
          border: '1px solid rgba(148,163,184,0.18)',
          boxShadow: 'none',
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
            놓치지 마세요
          </Typography>
          <Stack spacing={1.5}>
            {items
              .filter(
                (item) =>
                  item.status === '결재대기' || item.status === '보완요청',
              )
              .slice(0, 3)
              .map((item) => (
                <Box
                  key={item.id}
                  sx={{
                    display: 'grid',
                    gap: 0.5,
                    p: 1.2,
                    borderRadius: 2,
                    bgcolor: 'action.hover',
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}
                  >
                    {item.status === '보완요청'
                      ? '보완 요청 문서'
                      : '결재 요청 도착'}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ overflowWrap: 'anywhere' }}
                  >
                    {item.title}
                  </Typography>
                </Box>
              ))}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

export function DocumentWritePage({
  selectedModule,
  currentMenuName,
  content,
}: DocumentWritePageProps) {
  const theme = useTheme();
  const [viewMode, setViewMode] = useState<CommonViewMode>('list');
  const [selectedKind, setSelectedKind] = useState<DocumentKind | ''>('');
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [activeDocumentKind, setActiveDocumentKind] =
    useState<DocumentKind>('기안서');
  const [composerTitle, setComposerTitle] = useState('');
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const isDark = theme.palette.mode === 'dark';
  const editorSurfaceBackground = isDark ? '#0f172a' : '#ffffff';
  const fieldSurfaceBackground = isDark ? '#1e293b' : '#ffffff';
  const panelBorder = theme.palette.divider;
  const panelBackground = theme.palette.background.paper;
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: '본문을 입력하세요.',
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-label': '본문',
        'aria-multiline': 'true',
        spellcheck: 'true',
        style: `background-color: ${editorSurfaceBackground}; outline: none; line-height: 1.7;`,
      },
    },
  });
  const visibleDocuments = sampleDocuments.filter((item) => {
    return !selectedKind || item.kind === selectedKind;
  });
  const pinnedDocuments = visibleDocuments.filter((item) => item.isPinned);
  const unpinnedDocuments = visibleDocuments.filter((item) => !item.isPinned);
  const pinnedViewItems = pinnedDocuments.map((item) => ({
    id: item.id,
    title: item.title,
    authorLabel: item.author,
    dateLabel: item.date,
    isPinned: item.isPinned,
  }));
  const unpinnedViewItems = unpinnedDocuments.map((item) => ({
    id: item.id,
    title: item.title,
    authorLabel: item.author,
    dateLabel: item.date,
    categoryLabel: item.kind,
    statusLabel: item.status,
    statusColor: statusColor(item.status),
  }));

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'document-write',
      actions: [
        {
          key: 'create-document',
          label: '문서 작성',
          icon: AddOutlinedIcon,
          visible: true,
          onClick: () => setIsComposerOpen(true),
        },
      ],
    },
  ];

  const closeComposer = () => {
    setIsComposerOpen(false);
    setComposerTitle('');
    setAttachments([]);
    setToolbarOpen(false);
    editor?.commands.clearContent();
  };

  const handleAttachmentSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files ?? []);
    if (nextFiles.length > 0) {
      setAttachments((current) => [...current, ...nextFiles]);
    }
    event.target.value = '';
  };

  const toolbarItems = [
    {
      label: '굵게',
      icon: <FormatBoldOutlinedIcon fontSize="small" />,
      onClick: () => editor?.chain().focus().toggleBold().run(),
    },
    {
      label: '기울임',
      icon: <FormatItalicOutlinedIcon fontSize="small" />,
      onClick: () => editor?.chain().focus().toggleItalic().run(),
    },
    {
      label: '취소선',
      icon: <StrikethroughSOutlinedIcon fontSize="small" />,
      onClick: () => editor?.chain().focus().toggleStrike().run(),
    },
    {
      label: '글머리 기호',
      icon: <FormatListBulletedOutlinedIcon fontSize="small" />,
      onClick: () => editor?.chain().focus().toggleBulletList().run(),
    },
    {
      label: '번호 목록',
      icon: <FormatListNumberedOutlinedIcon fontSize="small" />,
      onClick: () => editor?.chain().focus().toggleOrderedList().run(),
    },
    {
      label: '인용',
      icon: <FormatQuoteOutlinedIcon fontSize="small" />,
      onClick: () => editor?.chain().focus().toggleBlockquote().run(),
    },
    {
      label: '되돌리기',
      icon: <UndoOutlinedIcon fontSize="small" />,
      onClick: () => editor?.chain().focus().undo().run(),
    },
    {
      label: '다시 실행',
      icon: <RedoOutlinedIcon fontSize="small" />,
      onClick: () => editor?.chain().focus().redo().run(),
    },
  ];

  const composerFooterStart = (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <IconButton
        size="small"
        aria-label="툴바 열기"
        aria-expanded={toolbarOpen}
        onClick={() => setToolbarOpen((open) => !open)}
        sx={{
          border: `1px solid ${panelBorder}`,
          borderRadius: 1,
          width: 32,
          height: 32,
          bgcolor: panelBackground,
          color: theme.palette.text.primary,
        }}
      >
        <FormatBoldOutlinedIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        aria-label="첨부 링크"
        onClick={() => attachmentInputRef.current?.click()}
        sx={{
          border: `1px solid ${panelBorder}`,
          borderRadius: 1,
          width: 32,
          height: 32,
          bgcolor: panelBackground,
          color: theme.palette.text.primary,
        }}
      >
        <AttachFileOutlinedIcon fontSize="small" />
      </IconButton>
      {toolbarOpen && (
        <Box
          data-testid="document-composer-toolbar-popup"
          sx={{
            position: 'absolute',
            left: 0,
            bottom: 'calc(100% + 8px)',
            zIndex: 2,
            display: 'flex',
            flexWrap: 'nowrap',
            alignItems: 'center',
            gap: 0.75,
            p: 1,
            borderRadius: 2,
            border: `1px solid ${panelBorder}`,
            bgcolor: isDark
              ? 'rgba(15, 23, 42, 0.96)'
              : 'rgba(255, 255, 255, 0.98)',
            boxShadow: '0 10px 25px rgba(15, 23, 42, 0.16)',
            maxWidth: 'min(520px, calc(100vw - 180px))',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
          }}
        >
          {toolbarItems.map(({ label, icon, onClick }) => (
            <Button
              key={label}
              size="small"
              variant="contained"
              aria-label={label}
              onClick={() => {
                onClick();
                setToolbarOpen(false);
              }}
              sx={{
                minWidth: 0,
                width: 32,
                height: 32,
                borderRadius: 1,
                p: 0,
                bgcolor: isDark
                  ? 'rgba(59, 130, 246, 0.18)'
                  : 'rgba(59, 130, 246, 0.08)',
                color: isDark ? '#e2e8f0' : '#0f172a',
              }}
            >
              {icon}
            </Button>
          ))}
        </Box>
      )}
      <input
        ref={attachmentInputRef}
        type="file"
        multiple
        hidden
        onChange={handleAttachmentSelect}
        aria-label="첨부 파일 선택"
      />
    </Box>
  );

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

      <Box
        sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}
      >
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
                      <EmptyDocumentList
                        onCreate={() => setIsComposerOpen(true)}
                      />
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
                      <EmptyDocumentList
                        onCreate={() => setIsComposerOpen(true)}
                      />
                    )}
                  </Box>
                )}
              </>
            }
            right={<ApprovalSummaryPanel items={sampleDocuments} />}
          />
        </Container>
      </Box>

      <CommonDialog
        open={isComposerOpen}
        onClose={closeComposer}
        title="문서 작성"
        size="md"
        bodyMode="fill"
        footerStart={composerFooterStart}
        actions={
          <>
            <Button
              variant="contained"
              disabled
              sx={{
                borderRadius: 1.5,
                fontWeight: 700,
                minWidth: 96,
                px: 2.5,
                boxShadow: 'none',
              }}
            >
              저장
            </Button>
            <Button
              variant="text"
              color="primary"
              onClick={closeComposer}
              sx={{ borderRadius: 1.5, fontWeight: 600, px: 2 }}
            >
              취소
            </Button>
          </>
        }
        dialogProps={{ 'data-testid': 'document-composer-dialog-root' }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
            height: '100%',
            minHeight: 0,
          }}
        >
          <Tabs
            value={activeDocumentKind}
            onChange={(_, value: DocumentKind) => setActiveDocumentKind(value)}
            aria-label="결재문서 구분"
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              flexShrink: 0,
              mb: 0,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Tab value="기안서" label="기안서" />
            <Tab value="업무연락" label="업무연락" />
            <Tab value="지출결의서" label="지출결의서" disabled />
            <Tab value="근태신청" label="근태신청" disabled />
          </Tabs>
          <TextField
            value={composerTitle}
            onChange={(event) => setComposerTitle(event.target.value)}
            fullWidth
            margin="none"
            placeholder="제목을 입력하세요."
            slotProps={{ input: { 'aria-label': '제목' } }}
            sx={{
              flexShrink: 0,
              '& .MuiOutlinedInput-root': {
                bgcolor: fieldSurfaceBackground,
                borderRadius: 1.5,
                border: 'none',
                '& fieldset': { border: 'none' },
              },
              '& .MuiInputBase-root': {
                bgcolor: fieldSurfaceBackground,
                borderRadius: 1.5,
              },
              '& .MuiInputBase-input::placeholder': {
                color: theme.palette.text.disabled,
                opacity: 1,
              },
              '& .MuiInputBase-input': {
                fontSize: '1.25rem',
                lineHeight: 1.4,
                fontWeight: 700,
                letterSpacing: '-0.02em',
              },
            }}
          />
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              width: '100%',
              minWidth: 0,
              bgcolor: editorSurfaceBackground,
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                width: '100%',
                minWidth: 0,
                borderTop: `1px solid ${panelBorder}`,
                borderBottom: `1px solid ${panelBorder}`,
              }}
            >
              <Box
                sx={{
                  flex: 1,
                  minHeight: 180,
                  display: 'flex',
                  width: '100%',
                  minWidth: 0,
                  overflow: 'hidden',
                  bgcolor: editorSurfaceBackground,
                  '& .document-composer-editor': {
                    width: '100%',
                    minWidth: 0,
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                  },
                  '& .document-composer-editor .ProseMirror': {
                    ...richTextContentStyles,
                    display: 'block',
                    width: '100%',
                    minWidth: 0,
                    flex: 1,
                    minHeight: 180,
                    maxHeight: '100%',
                    overflowY: 'auto',
                    overflowX: 'auto',
                    outline: 'none',
                    px: 2,
                    py: 1.5,
                    color: theme.palette.text.primary,
                    bgcolor: editorSurfaceBackground,
                    boxSizing: 'border-box',
                    '& p.is-editor-empty:first-of-type::before': {
                      content: 'attr(data-placeholder)',
                      color: theme.palette.text.disabled,
                      float: 'left',
                      height: 0,
                      pointerEvents: 'none',
                    },
                  },
                }}
              >
                <EditorContent
                  editor={editor}
                  className="document-composer-editor"
                />
              </Box>
              {attachments.length > 0 && (
                <Box
                  data-testid="document-composer-attachments"
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 1,
                    borderTop: `1px solid ${panelBorder}`,
                    p: 1.5,
                    bgcolor: editorSurfaceBackground,
                  }}
                >
                  {attachments.map((file, index) => (
                    <Chip
                      key={`${file.name}-${file.lastModified}-${index}`}
                      label={file.name}
                      onDelete={() =>
                        setAttachments((current) =>
                          current.filter((_, fileIndex) => fileIndex !== index),
                        )
                      }
                    />
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </CommonDialog>
    </Box>
  );
}

function EmptyDocumentList({ onCreate }: { onCreate: () => void }) {
  return (
    <Box sx={{ py: 6, textAlign: 'center' }}>
      <Typography variant="body2" color="text.secondary">
        조건에 맞는 문서가 없습니다.
      </Typography>
      <Button sx={{ mt: 1 }} onClick={onCreate} startIcon={<AddOutlinedIcon />}>
        문서 작성
      </Button>
    </Box>
  );
}
