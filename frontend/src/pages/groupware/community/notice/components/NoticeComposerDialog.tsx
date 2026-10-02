import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import type { Editor } from '@tiptap/react';
import {
  RichTextEditor,
  RichTextEditorToolbar,
} from '../../../../../shared/components/rich-text-editor/RichTextEditor';
import { apiGetBlob } from '../../../../../shared/services/apiClient';
import { uploadNoticeEmbeddedImage } from '../services/noticeBoardService';
import {
  getAttachmentExtension,
  getAttachmentIconMeta,
} from '../../../../../shared/components/feed/attachmentIconMeta';
import { CommonDialog } from '../../../../../shared/components/CommonDialog';
import type {
  NoticeComposerDialogProps,
  NoticeComposerDraftAttachment,
  NoticeComposerEmbeddedImage,
} from '../types/community.types';
export {
  hasSpreadsheetClipboardContent,
  normalizeClipboardHtmlForEditor,
  normalizeClipboardTextForEditor,
} from '../../../../../shared/components/rich-text-editor/clipboard';
export {
  calculateImageResize as calculateNoticeImageResize,
  calculateImageResizeWidth as calculateNoticeImageResizeWidth,
} from '../../../../../shared/components/rich-text-editor/imageResize';

export type {
  NoticeComposerDraftAttachment,
  NoticeComposerEmbeddedImage,
} from '../types/community.types';

const emptyNoticeContent = '<p></p>';

export function serializeNoticeEditorJson(
  editor: { getJSON: () => unknown } | null | undefined,
): string | undefined {
  return editor ? JSON.stringify(editor.getJSON()) : undefined;
}

export function collectNoticeEmbeddedImages(
  editor: { state: Editor['state'] } | null | undefined,
): NoticeComposerEmbeddedImage[] {
  if (!editor) {
    return [];
  }

  const images: NoticeComposerEmbeddedImage[] = [];
  editor.state.doc.descendants((node) => {
    if (node.type.name !== 'image' || !node.attrs['data-upload-token']) {
      return true;
    }
    images.push({
      uploadToken: String(node.attrs['data-upload-token']),
      fileId: node.attrs['data-file-id'] ?? null,
      objectKey: String(node.attrs['data-object-key'] ?? ''),
      imageUrl: String(node.attrs.src ?? ''),
      fileName: String(node.attrs.alt ?? 'pasted-image'),
      fileSize: Number(node.attrs['data-file-size'] ?? 0) || 0,
      mimeType: String(node.attrs['data-mime-type'] ?? ''),
      width: node.attrs.width ?? null,
    });
    return true;
  });
  return images;
}

export function NoticeComposerDialog({
  open,
  isDark,
  onClose,
  onSubmit,
  defaultTitle = '',
  noticeGubunOptions = [],
  defaultNoticeGubunCode = '',
  defaultBody,
  defaultAttachments = [],
}: NoticeComposerDialogProps) {
  const theme = useTheme();
  const resolvedDark = Boolean(isDark) || theme.palette.mode === 'dark';
  const panelBorder = resolvedDark
    ? 'rgba(148, 163, 184, 0.2)'
    : 'rgba(148, 163, 184, 0.22)';
  const panelBackground = resolvedDark ? '#0f172a' : '#f8fafc';
  const editorSurfaceBackground = resolvedDark ? '#0f172a' : '#ffffff';
  const fieldSurfaceBackground = resolvedDark
    ? '#1e293b'
    : editorSurfaceBackground;
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const pasteDebugEnabled =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('noticePasteDebug') === '1';
  const [title, setTitle] = useState(defaultTitle);
  const [noticeGubunCode, setNoticeGubunCode] = useState(
    defaultNoticeGubunCode,
  );
  const [noticeGubunError, setNoticeGubunError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [editorIsEmpty, setEditorIsEmpty] = useState(true);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [pasteDebugLog, setPasteDebugLog] = useState<string[]>(() =>
    pasteDebugEnabled ? ['[notice-paste] 진단 모드가 활성화되었습니다.'] : [],
  );
  const [attachments, setAttachments] =
    useState<NoticeComposerDraftAttachment[]>(defaultAttachments);

  useEffect(() => {
    if (!open) {
      return;
    }

    setTitle(defaultTitle);
    setNoticeGubunCode(defaultNoticeGubunCode);
    setNoticeGubunError(false);
    setAttachments(defaultAttachments);
    setImageUploadError(null);
    setPasteDebugLog(
      pasteDebugEnabled ? ['[notice-paste] 진단 모드가 활성화되었습니다.'] : [],
    );
  }, [open, pasteDebugEnabled]);

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
    if (!editor || !open) {
      return;
    }

    let cancelled = false;
    const objectUrls: string[] = [];
    const resolveEditorImages = async () => {
      const images = Array.from(
        editor.view.dom.querySelectorAll<HTMLImageElement>('img'),
      ).filter((image) =>
        (image.getAttribute('src') ?? '').includes(
          '/api/v1/groupware/boards/notice/posts/',
        ),
      );

      await Promise.all(
        images.map(async (image) => {
          const source = image.getAttribute('src');
          if (!source) {
            return;
          }
          try {
            const objectUrl = URL.createObjectURL(await apiGetBlob(source));
            objectUrls.push(objectUrl);
            if (!cancelled) {
              image.src = objectUrl;
            }
          } catch {
            setImageUploadError('본문 이미지를 불러오지 못했습니다.');
          }
        }),
      );
    };

    void resolveEditorImages();
    return () => {
      cancelled = true;
      objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
    };
  }, [editor, open, defaultBody]);

  useEffect(() => {
    if (!editor || open) {
      return;
    }

    editor.commands.setTextSelection(1);
    editor.commands.blur();
  }, [editor, open]);

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

  const handleClipboardDebug = (data: DataTransfer, normalizedHtml: string) => {
    const html = data.getData('text/html') ?? '';
    const text = data.getData('text/plain') ?? '';
    setPasteDebugLog((current) => [
      ...current,
      `[paste] types=${Array.from(data.types).join(', ')}`,
      `[paste] htmlLength=${html.length}, textLength=${text.length}`,
      `[paste] html=${html.slice(0, 500)}`,
      `[paste] text=${text.slice(0, 500)}`,
      `[normalized] length=${normalizedHtml.length}`,
      `[normalized] html=${normalizedHtml.slice(0, 800)}`,
    ]);
    window.setTimeout(() => {
      const editorElement = document.querySelector(
        '.notice-composer-editor .ProseMirror',
      );
      setPasteDebugLog((current) => [
        ...current,
        `[after 300ms] text=${editorElement?.textContent ?? '(editor not found)'}`,
        `[after 300ms] html=${editorElement?.innerHTML ?? '(editor not found)'}`,
      ]);
    }, 300);
  };

  const handleSubmit = async () => {
    if (!noticeGubunCode.trim()) {
      setNoticeGubunError(true);
      return;
    }
    if (saving) return;

    const body = editor?.getHTML() ?? defaultBody ?? emptyNoticeContent;
    const bodyText = body
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const currentAttachmentIds = new Set(
      attachments.map((attachment) => String(attachment.id)),
    );
    const removedAttachmentIds = defaultAttachments
      .filter(
        (attachment) =>
          attachment.boardFileId != null &&
          !currentAttachmentIds.has(String(attachment.id)),
      )
      .map((attachment) => attachment.boardFileId as number | string);

    if (onSubmit) {
      setSaving(true);
      try {
        await onSubmit({
          title,
          noticeGubunCode,
          body,
          bodyJson: serializeNoticeEditorJson(editor),
          bodyText,
          attachments,
          removedAttachmentIds,
          embeddedImages: collectNoticeEmbeddedImages(editor),
        });
      } catch {
        return;
      } finally {
        setSaving(false);
      }
    }

    onClose();
  };

  const handleCloseRequest = () => {
    if (!saving) {
      onClose();
    }
  };

  const footerStart = (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <RichTextEditorToolbar
        editor={editor}
        panelTestId="notice-toolbar-popup"
        triggerSx={{
          border: `1px solid ${panelBorder}`,
          borderRadius: 1,
          width: 32,
          height: 32,
          bgcolor: panelBackground,
          color: theme.palette.text.primary,
        }}
        panelSx={{
          gap: 0.75,
          p: 1,
          borderRadius: 2,
          borderColor: panelBorder,
          bgcolor: resolvedDark
            ? 'rgba(15, 23, 42, 0.96)'
            : 'rgba(255, 255, 255, 0.98)',
          boxShadow: resolvedDark
            ? '0 10px 25px rgba(15, 23, 42, 0.24)'
            : '0 10px 25px rgba(15, 23, 42, 0.12)',
          maxWidth: 'min(520px, calc(100vw - 180px))',
          whiteSpace: 'nowrap',
        }}
      />

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
    </Box>
  );

  const actions = (
    <>
      <Button
        variant="contained"
        color="primary"
        onClick={handleSubmit}
        disabled={saving || (title.trim().length === 0 && editorIsEmpty)}
        startIcon={
          saving ? (
            <CircularProgress
              size={16}
              color="inherit"
              aria-label="공지 저장 중"
            />
          ) : undefined
        }
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
        {saving ? '저장 중…' : '저장'}
      </Button>
      <Button
        variant="text"
        color="primary"
        onClick={handleCloseRequest}
        disabled={saving}
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
    </>
  );

  return (
    <CommonDialog
      open={open}
      onClose={handleCloseRequest}
      title="새 공지 작성"
      size="md"
      bodyMode="fill"
      footerStart={footerStart}
      actions={actions}
      dialogProps={{
        'data-testid': 'notice-composer-dialog-root',
        'data-theme-mode': resolvedDark ? 'dark' : 'light',
      }}
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
        <TextField
          select
          label="구분"
          value={noticeGubunCode}
          onChange={(event) => {
            setNoticeGubunCode(event.target.value);
            setNoticeGubunError(false);
          }}
          required
          fullWidth
          margin="none"
          error={noticeGubunError}
          helperText={noticeGubunError ? '구분을 선택해 주세요.' : undefined}
          disabled={noticeGubunOptions.length === 0}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: fieldSurfaceBackground,
              borderRadius: 1.5,
              border: 'none',
              '& fieldset': {
                border: 'none',
              },
              '&.Mui-error fieldset': {
                border: `1px solid ${theme.palette.error.main}`,
              },
            },
            '& .MuiInputBase-root': {
              bgcolor: fieldSurfaceBackground,
              borderRadius: 1.5,
            },
            '& .MuiFormLabel-root': {
              color: theme.palette.text.secondary,
            },
          }}
        >
          {noticeGubunOptions.map((option) => (
            <MenuItem key={option.code} value={option.code}>
              {option.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          fullWidth
          margin="none"
          placeholder="제목을 입력하세요."
          slotProps={{
            input: {
              'aria-label': '제목',
            },
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: fieldSurfaceBackground,
              borderRadius: 1.5,
              border: 'none',
              '& fieldset': {
                border: 'none',
              },
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
            '& .MuiFormLabel-root': {
              color: theme.palette.text.secondary,
            },
          }}
        />

        {pasteDebugEnabled && (
          <Box
            data-testid="notice-paste-debug-panel"
            sx={{
              mt: 1,
              px: 1.25,
              py: 1,
              maxHeight: 180,
              overflow: 'auto',
              border: '1px solid #60a5fa',
              borderRadius: 1,
              bgcolor: '#111827',
              color: '#e5e7eb',
              fontFamily: 'monospace',
              fontSize: 11,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {pasteDebugLog.join('\n')}
          </Box>
        )}

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
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                },
                '& .notice-composer-editor .ProseMirror': {
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
              <RichTextEditor
                content={
                  defaultBody && defaultBody.trim()
                    ? defaultBody
                    : emptyNoticeContent
                }
                onEditorReady={setEditor}
                onContentChange={(currentEditor) =>
                  setEditorIsEmpty(currentEditor.isEmpty)
                }
                onClipboardPaste={
                  pasteDebugEnabled ? handleClipboardDebug : undefined
                }
                uploadImage={async (file) => {
                  const uploaded = await uploadNoticeEmbeddedImage(file);
                  return {
                    src: uploaded.imageUrl,
                    alt: uploaded.fileName,
                    uploadToken: uploaded.uploadToken,
                    fileId:
                      uploaded.fileId == null ? null : String(uploaded.fileId),
                    objectKey: uploaded.objectKey,
                    fileSize: uploaded.fileSize,
                    mimeType: uploaded.mimeType,
                  };
                }}
                onImageUploadError={(message) =>
                  setImageUploadError(message || null)
                }
                className="notice-composer-editor"
                contentSx={{
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
                  backgroundColor: editorSurfaceBackground,
                  boxSizing: 'border-box',
                  '& p.is-editor-empty:first-of-type::before': {
                    content: 'attr(data-placeholder)',
                    color: theme.palette.text.disabled,
                    float: 'left',
                    height: 0,
                    pointerEvents: 'none',
                  },
                }}
              />
              {imageUploadError && (
                <Typography
                  role="alert"
                  variant="caption"
                  sx={{ px: 2, pb: 1, color: 'error.main' }}
                >
                  {imageUploadError}
                </Typography>
              )}
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
                  {attachments.map((file, index) => {
                    const iconMeta = getAttachmentIconMeta(file.name);

                    return (
                      <Box
                        key={`${file.id}-${index}`}
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
                            data-testid={`attachment-icon-${getAttachmentExtension(file.name)}`}
                          >
                            <iconMeta.icon
                              fontSize="small"
                              aria-label={`${iconMeta.label} 파일 아이콘`}
                            />
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

                        <IconButton
                          size="small"
                          aria-label="첨부 파일 삭제"
                          title={file.name}
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
                          <DeleteOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      <input
        ref={attachmentInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.hwp,.txt,.csv,.zip,image/*"
        hidden
        onChange={handleAttachmentSelect}
        aria-label="첨부 파일 선택"
      />
    </CommonDialog>
  );
}
