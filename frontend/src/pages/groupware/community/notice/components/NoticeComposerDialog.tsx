import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined';
import CloseIcon from '@mui/icons-material/Close';
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
import { noticeContentStyles } from './noticeContentStyles';

export type NoticeComposerDraftAttachment = {
  id: string;
  name: string;
  size?: number;
  extension?: string;
  file?: File;
  boardFileId?: number | string | null;
  objectKey?: string | null;
  bucketName?: string | null;
};

type NoticeComposerDialogProps = {
  open: boolean;
  isDark: boolean;
  onClose: () => void;
  onSubmit?: (payload: {
    title: string;
    body: string;
    bodyJson?: string;
    bodyText?: string;
    attachments: NoticeComposerDraftAttachment[];
  }) => Promise<unknown> | unknown;
  defaultTitle?: string;
  defaultBody?: string;
  defaultAttachments?: NoticeComposerDraftAttachment[];
};

const emptyNoticeContent = '<p></p>';

function getFileIconMeta(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, { bg: string; color: string; label: string }> = {
    pdf: { bg: '#fecaca', color: '#991b1b', label: 'PDF' },
    xls: { bg: '#bbf7d0', color: '#166534', label: 'XLS' },
    xlsx: { bg: '#bbf7d0', color: '#166534', label: 'XLSX' },
    doc: { bg: '#bfdbfe', color: '#1d4ed8', label: 'DOC' },
    docx: { bg: '#bfdbfe', color: '#1d4ed8', label: 'DOCX' },
    ppt: { bg: '#fed7aa', color: '#b45309', label: 'PPT' },
    pptx: { bg: '#fed7aa', color: '#b45309', label: 'PPTX' },
    png: { bg: '#ddd6fe', color: '#5b21b6', label: 'PNG' },
    jpg: { bg: '#d1fae5', color: '#065f46', label: 'JPG' },
    jpeg: { bg: '#d1fae5', color: '#065f46', label: 'JPG' },
    zip: { bg: '#e5e7eb', color: '#374151', label: 'ZIP' },
    hwp: { bg: '#dbeafe', color: '#1d4ed8', label: 'HWP' },
  };

  return map[extension] ?? { bg: '#e2e8f0', color: '#475569', label: 'FILE' };
}

export function NoticeComposerDialog({
  open,
  isDark,
  onClose,
  onSubmit,
  defaultTitle = '',
  defaultBody,
  defaultAttachments = [],
}: NoticeComposerDialogProps) {
  const theme = useTheme();
  const resolvedDark = Boolean(isDark) || theme.palette.mode === 'dark';
  const panelBorder = resolvedDark
    ? 'rgba(148, 163, 184, 0.2)'
    : 'rgba(148, 163, 184, 0.22)';
  const shellBackground = resolvedDark ? '#111827' : '#ffffff';
  const panelBackground = resolvedDark ? '#0f172a' : '#f8fafc';
  const dialogContentBackground = resolvedDark ? '#0f172a' : '#f4f7fb';
  const editorSurfaceBackground = resolvedDark ? '#0f172a' : '#ffffff';
  const headerBackground = resolvedDark ? '#1f2937' : '#f8fafc';
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState(defaultTitle);
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [editorIsEmpty, setEditorIsEmpty] = useState(true);
  const [attachments, setAttachments] =
    useState<NoticeComposerDraftAttachment[]>(defaultAttachments);

  const editorConfig = useMemo(
    () => ({
      extensions: [
        StarterKit,
        Placeholder.configure({
          placeholder: '본문을 입력하세요.',
          emptyEditorClass: 'is-editor-empty',
        }),
      ],
      content:
        defaultBody && defaultBody.trim() ? defaultBody : emptyNoticeContent,
      immediatelyRender: false,
      editable: true,
      editorProps: {
        attributes: {
          role: 'textbox',
          'aria-label': '본문',
          'aria-multiline': 'true',
          spellcheck: 'true',
          style: `background-color: ${editorSurfaceBackground}; outline: none; line-height: 1.7;`,
        },
      },
    }),
    [defaultBody, editorSurfaceBackground],
  );

  const editor = useEditor(editorConfig);

  useEffect(() => {
    setTitle(defaultTitle);
  }, [defaultTitle]);

  useEffect(() => {
    setAttachments(defaultAttachments);
  }, [defaultAttachments]);

  useEffect(() => {
    if (!editor || !open) {
      return;
    }

    const nextContent =
      defaultBody && defaultBody.trim() ? defaultBody : emptyNoticeContent;
    editor.commands.clearContent();
    editor.commands.setContent(nextContent);
  }, [editor, open, defaultBody]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const syncEditorState = () => {
      setEditorIsEmpty(editor.isEmpty);
    };

    syncEditorState();
    editor.on('create', syncEditorState);
    editor.on('update', syncEditorState);
    editor.on('selectionUpdate', syncEditorState);

    return () => {
      editor.off('create', syncEditorState);
      editor.off('update', syncEditorState);
      editor.off('selectionUpdate', syncEditorState);
    };
  }, [editor]);

  const toolbarItems = [
    {
      label: '굵게',
      icon: <FormatBoldOutlinedIcon fontSize="small" />,
      active: editor?.isActive('bold') ?? false,
      onClick: () => editor?.chain().focus().toggleBold().run(),
    },
    {
      label: '기울임',
      icon: <FormatItalicOutlinedIcon fontSize="small" />,
      active: editor?.isActive('italic') ?? false,
      onClick: () => editor?.chain().focus().toggleItalic().run(),
    },
    {
      label: '취소선',
      icon: <StrikethroughSOutlinedIcon fontSize="small" />,
      active: editor?.isActive('strike') ?? false,
      onClick: () => editor?.chain().focus().toggleStrike().run(),
    },
    {
      label: '글머리 기호',
      icon: <FormatListBulletedOutlinedIcon fontSize="small" />,
      active: editor?.isActive('bulletList') ?? false,
      onClick: () => editor?.chain().focus().toggleBulletList().run(),
    },
    {
      label: '번호 목록',
      icon: <FormatListNumberedOutlinedIcon fontSize="small" />,
      active: editor?.isActive('orderedList') ?? false,
      onClick: () => editor?.chain().focus().toggleOrderedList().run(),
    },
    {
      label: '인용',
      icon: <FormatQuoteOutlinedIcon fontSize="small" />,
      active: editor?.isActive('blockquote') ?? false,
      onClick: () => editor?.chain().focus().toggleBlockquote().run(),
    },
    {
      label: '되돌리기',
      icon: <UndoOutlinedIcon fontSize="small" />,
      active: false,
      onClick: () => editor?.chain().focus().undo().run(),
    },
    {
      label: '다시 실행',
      icon: <RedoOutlinedIcon fontSize="small" />,
      active: false,
      onClick: () => editor?.chain().focus().redo().run(),
    },
  ];

  const handleAttachmentSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files ?? []);
    if (nextFiles.length === 0) {
      return;
    }

    const mapped: NoticeComposerDraftAttachment[] = nextFiles.map((file) => {
      const fileName = file.name || '첨부파일';
      const extension = fileName.includes('.')
        ? fileName.split('.').pop()?.toUpperCase() || 'FILE'
        : 'FILE';

      return {
        id: `${fileName}-${file.size}-${file.lastModified}`,
        name: fileName,
        size: file.size,
        extension,
        file,
      };
    });

    setAttachments((current) => [...current, ...mapped]);
    event.target.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments((current) => current.filter((file) => file.id !== id));
  };

  const handleSubmit = async () => {
    const body = editor?.getHTML() ?? defaultBody ?? emptyNoticeContent;
    const bodyText = body
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (onSubmit) {
      await onSubmit({
        title,
        body,
        bodyJson: JSON.stringify({ type: 'doc', content: [] }),
        bodyText,
        attachments,
      });
    }

    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      data-theme-mode={resolvedDark ? 'dark' : 'light'}
      slotProps={{
        paper: {
          sx: {
            width: 'min(820px, calc(100vw - 48px))',
            maxWidth: '820px',
            height: 'min(90vh, 880px)',
            maxHeight: 'calc(100vh - 32px)',
            borderRadius: 2,
            overflow: 'hidden',
            backgroundColor: shellBackground,
            border: `1px solid ${alpha(theme.palette.primary.main, resolvedDark ? 0.28 : 0.16)}`,
            boxShadow: resolvedDark
              ? '0 18px 48px rgba(15, 23, 42, 0.34)'
              : '0 18px 50px rgba(15, 23, 42, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            color: theme.palette.text.primary,
          },
        },
      }}
    >
      <Box
        data-testid="notice-composer-dialog-root"
        data-theme-mode={resolvedDark ? 'dark' : 'light'}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: shellBackground,
          minHeight: 0,
          width: '100%',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2.5,
            py: 2,
            bgcolor: headerBackground,
            borderBottom: `1px solid ${panelBorder}`,
          }}
        >
          <Typography
            id="notice-composer-title"
            variant="h6"
            sx={{
              fontWeight: 800,
              color: theme.palette.text.primary,
              letterSpacing: '-0.02em',
            }}
          >
            새 공지 작성
          </Typography>
          <IconButton
            onClick={onClose}
            size="small"
            aria-label="닫기"
            sx={{
              bgcolor: alpha(
                theme.palette.action.hover,
                resolvedDark ? 0.12 : 0.08,
              ),
              color: theme.palette.text.primary,
              '&:hover': {
                bgcolor: alpha(
                  theme.palette.action.hover,
                  resolvedDark ? 0.18 : 0.12,
                ),
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        <DialogContent
          sx={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            px: 2.5,
            py: 2,
            bgcolor: dialogContentBackground,
            backgroundImage:
              'linear-gradient(180deg, rgba(148, 163, 184, 0.08) 0%, rgba(148, 163, 184, 0) 120px)',
            borderBottom: `1px solid ${panelBorder}`,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 0.75,
              height: '100%',
            }}
          >
            <TextField
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              fullWidth
              placeholder="제목을 입력하세요."
              slotProps={{
                input: {
                  'aria-label': '제목',
                },
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: editorSurfaceBackground,
                  borderRadius: 1.5,
                  border: 'none',
                  '& fieldset': {
                    border: 'none',
                  },
                },
                '& .MuiInputBase-root': {
                  bgcolor: editorSurfaceBackground,
                  borderRadius: 1.5,
                },
                '& .MuiInputBase-input::placeholder': {
                  color: theme.palette.text.disabled,
                  opacity: 1,
                },
                '& .MuiFormLabel-root': {
                  color: theme.palette.text.secondary,
                },
              }}
            />

            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                width: '100%',
                minWidth: 0,
                backgroundColor: editorSurfaceBackground,
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
                    backgroundColor: editorSurfaceBackground,
                    '& .notice-composer-editor': {
                      width: '100%',
                      minWidth: 0,
                      display: 'flex',
                      flexDirection: 'column',
                    },
                    '& .notice-composer-editor .ProseMirror': {
                      ...noticeContentStyles,
                      display: 'block',
                      width: '100%',
                      minWidth: 0,
                      flex: 1,
                      minHeight: 180,
                      maxHeight: '100%',
                      overflowY: 'auto',
                      outline: 'none',
                      px: 2,
                      py: 1.5,
                      color: theme.palette.text.primary,
                      backgroundColor: editorSurfaceBackground,
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
                    className="notice-composer-editor"
                  />
                </Box>

                {attachments.length > 0 && (
                  <Box
                    data-testid="notice-attachments-list"
                    sx={{
                      borderTop: `1px solid ${panelBorder}`,
                      pt: 1.25,
                      pb: 1,
                      px: 2,
                      backgroundColor: editorSurfaceBackground,
                    }}
                  >
                    <Box sx={{ display: 'grid', gap: 1 }}>
                      {attachments.map((file) => {
                        const iconMeta = getFileIconMeta(file.name);

                        return (
                          <Box
                            key={file.id}
                            data-file-card="true"
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              borderRadius: 1.5,
                              border: `1px solid ${panelBorder}`,
                              bgcolor: resolvedDark
                                ? 'rgba(30,41,59,0.8)'
                                : '#ffffff',
                              px: 1.25,
                              py: 0.9,
                              overflow: 'hidden',
                            }}
                          >
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                minWidth: 0,
                                flex: 1,
                              }}
                            >
                              <Box
                                sx={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: 1,
                                  backgroundColor: iconMeta.bg,
                                  color: iconMeta.color,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.62rem',
                                  fontWeight: 800,
                                  flexShrink: 0,
                                }}
                              >
                                {iconMeta.label}
                              </Box>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 600,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  color: theme.palette.text.primary,
                                }}
                              >
                                {file.name}
                              </Typography>
                            </Box>

                            <Button
                              size="small"
                              variant="outlined"
                              aria-label={`다운로드: ${file.name}`}
                              onClick={() => removeAttachment(file.id)}
                              sx={{
                                minWidth: 0,
                                width: 32,
                                height: 32,
                                p: 0,
                                borderRadius: 1.5,
                                borderColor: resolvedDark
                                  ? 'rgba(148,163,184,0.28)'
                                  : 'rgba(148,163,184,0.25)',
                                color: resolvedDark ? '#e2e8f0' : '#475569',
                                backgroundColor: resolvedDark
                                  ? 'rgba(15, 23, 42, 0.7)'
                                  : '#f8fafc',
                                '&:hover': {
                                  borderColor: resolvedDark
                                    ? 'rgba(96,165,250,0.5)'
                                    : 'rgba(59,130,246,0.35)',
                                  backgroundColor: resolvedDark
                                    ? 'rgba(30,41,59,0.9)'
                                    : '#f1f5f9',
                                },
                              }}
                            >
                              ↓
                            </Button>
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </DialogContent>

        <input
          ref={attachmentInputRef}
          type="file"
          accept="image/*,.xlsx,.xls,.csv,.pdf"
          hidden
          onChange={handleAttachmentSelect}
          aria-label="첨부 파일 선택"
        />

        <DialogActions
          sx={{
            alignItems: 'center',
            bgcolor: shellBackground,
            borderColor: panelBorder,
            borderTop: `1px solid ${panelBorder}`,
            borderBottom: 0,
            flexShrink: 0,
            gap: 1,
            justifyContent: 'space-between',
            px: 3,
            py: 1.5,
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
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
                data-testid="notice-toolbar-popup"
                sx={{
                  position: 'absolute',
                  left: 0,
                  bottom: 'calc(100% + 8px)',
                  zIndex: 2,
                  display: 'flex',
                  flexDirection: 'row',
                  flexWrap: 'nowrap',
                  alignItems: 'center',
                  gap: 0.75,
                  p: 1,
                  borderRadius: 2,
                  border: `1px solid ${panelBorder}`,
                  bgcolor: resolvedDark
                    ? 'rgba(15, 23, 42, 0.96)'
                    : 'rgba(255, 255, 255, 0.98)',
                  boxShadow: resolvedDark
                    ? '0 10px 25px rgba(15, 23, 42, 0.24)'
                    : '0 10px 25px rgba(15, 23, 42, 0.12)',
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
                      bgcolor: resolvedDark
                        ? 'rgba(59, 130, 246, 0.18)'
                        : 'rgba(59, 130, 246, 0.08)',
                      color: resolvedDark ? '#e2e8f0' : '#0f172a',
                      '&:hover': {
                        bgcolor: resolvedDark
                          ? 'rgba(59, 130, 246, 0.3)'
                          : 'rgba(59, 130, 246, 0.14)',
                      },
                    }}
                  >
                    {icon}
                  </Button>
                ))}
              </Box>
            )}
          </Box>

          <Box sx={{ display: 'flex', flexShrink: 0, gap: 1 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={title.trim().length === 0 && editorIsEmpty}
              sx={{
                borderRadius: 1.5,
                fontWeight: 700,
                minWidth: 96,
                px: 2.5,
                boxShadow: 'none',
                '&:hover': {
                  boxShadow: 'none',
                },
              }}
            >
              저장
            </Button>
            <Button
              variant="text"
              color="primary"
              onClick={onClose}
              sx={{
                borderRadius: 1.5,
                fontWeight: 600,
                px: 2,
                backgroundColor: 'transparent',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.06),
                },
              }}
            >
              취소
            </Button>
          </Box>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
