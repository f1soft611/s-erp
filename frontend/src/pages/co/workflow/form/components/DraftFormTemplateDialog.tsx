import { useEffect, useRef, useState } from 'react';
import FormatBoldOutlinedIcon from '@mui/icons-material/FormatBoldOutlined';
import FormatItalicOutlinedIcon from '@mui/icons-material/FormatItalicOutlined';
import FormatListBulletedOutlinedIcon from '@mui/icons-material/FormatListBulletedOutlined';
import FormatListNumberedOutlinedIcon from '@mui/icons-material/FormatListNumberedOutlined';
import FormatQuoteOutlinedIcon from '@mui/icons-material/FormatQuoteOutlined';
import RedoOutlinedIcon from '@mui/icons-material/RedoOutlined';
import StrikethroughSOutlinedIcon from '@mui/icons-material/StrikethroughSOutlined';
import UndoOutlinedIcon from '@mui/icons-material/UndoOutlined';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
} from '@mui/material';
import type { JSONContent } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from '@tiptap/extension-table';
import StarterKit from '@tiptap/starter-kit';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import { CommonDialog } from '../../../../../shared/components/CommonDialog';
import { UnsavedChangesConfirmDialog } from '../../../../../shared/components/UnsavedChangesConfirmDialog';
import { useNotification } from '../../../../../shared/context/NotificationContext';
import {
  hasSpreadsheetClipboardContent,
  normalizeClipboardHtmlForEditor,
  normalizeClipboardTextForEditor,
} from '../../../../groupware/community/notice/utils/noticeClipboard';
import type { DraftFormRow } from '../types/draftFormManagement.types';
import {
  deleteDraftFormTemplateImage,
  fetchDraftFormTemplate,
  fetchDraftFormTemplateImage,
  saveDraftFormTemplate,
  uploadDraftFormTemplateImage,
  type DraftFormTemplate,
  type DraftFormTemplateUpload,
} from '../services/draftFormTemplate.service';

const DraftFormTemplateImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-file-id': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-file-id'),
        renderHTML: (attributes) =>
          attributes['data-file-id']
            ? { 'data-file-id': attributes['data-file-id'] }
            : {},
      },
      'data-upload-token': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-upload-token'),
        renderHTML: (attributes) =>
          attributes['data-upload-token']
            ? { 'data-upload-token': attributes['data-upload-token'] }
            : {},
      },
      'data-upload-state': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-upload-state'),
        renderHTML: (attributes) =>
          attributes['data-upload-state']
            ? { 'data-upload-state': attributes['data-upload-state'] }
            : {},
      },
      'data-client-upload-id': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-client-upload-id'),
        renderHTML: (attributes) =>
          attributes['data-client-upload-id']
            ? { 'data-client-upload-id': attributes['data-client-upload-id'] }
            : {},
      },
    };
  },
});

type PendingImage = DraftFormTemplateUpload & { objectUrl: string };

export type DraftFormTemplateDialogProps = {
  open: boolean;
  row: DraftFormRow;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

function findImagePosition(editor: Editor, clientUploadId: string): number {
  let found = -1;
  editor.state.doc.descendants((node, position) => {
    if (
      node.type.name === 'image' &&
      node.attrs['data-client-upload-id'] === clientUploadId
    ) {
      found = position;
      return false;
    }
    return found < 0;
  });
  return found;
}

export function DraftFormTemplateDialog({
  open,
  row,
  onClose,
  onSaved,
}: DraftFormTemplateDialogProps) {
  const { showSuccess } = useNotification();
  const [template, setTemplate] = useState<DraftFormTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [error, setError] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const initialHtml = useRef('<p></p>');
  const pendingImages = useRef(new Map<string, PendingImage>());
  const objectUrls = useRef(new Map<string, string>());
  const editorRef = useRef<Editor | null>(null);

  const finishClose = () => {
    for (const objectUrl of objectUrls.current.values()) {
      URL.revokeObjectURL(objectUrl);
    }
    objectUrls.current.clear();
    pendingImages.current.clear();
    setConfirmDiscardOpen(false);
    setHasChanges(false);
    setError('');
    onClose();
  };

  const handleCloseRequest = () => {
    if (saving || uploadingCount > 0) {
      setError('저장 또는 이미지 업로드가 끝난 뒤 닫아 주세요.');
      return;
    }
    if (hasChanges) {
      setConfirmDiscardOpen(true);
      return;
    }
    void cleanupTemporaryImages().finally(finishClose);
  };

  const cleanupTemporaryImages = async () => {
    const files = Array.from(pendingImages.current.values());
    await Promise.allSettled(
      files.map((image) =>
        deleteDraftFormTemplateImage(
          Number(row.draftingWorkCategoryId),
          image.uploadToken,
          image.fileName,
        ),
      ),
    );
  };

  const handleDiscard = () => {
    void cleanupTemporaryImages().finally(finishClose);
  };

  const handleImagePaste = async (
    clientUploadId: string,
    file: File,
    objectUrl: string,
  ) => {
    setUploadingCount((count) => count + 1);
    try {
      const uploaded = await uploadDraftFormTemplateImage(
        Number(row.draftingWorkCategoryId),
        file,
      );
      const editor = editorRef.current;
      const position = editor ? findImagePosition(editor, clientUploadId) : -1;
      if (!editor || position < 0) {
        await deleteDraftFormTemplateImage(
          Number(row.draftingWorkCategoryId),
          uploaded.uploadToken,
          uploaded.fileName,
        );
        URL.revokeObjectURL(objectUrl);
        objectUrls.current.delete(clientUploadId);
        return;
      }
      const node = editor.state.doc.nodeAt(position);
      if (!node) {
        await deleteDraftFormTemplateImage(
          Number(row.draftingWorkCategoryId),
          uploaded.uploadToken,
          uploaded.fileName,
        );
        URL.revokeObjectURL(objectUrl);
        objectUrls.current.delete(clientUploadId);
        return;
      }
      pendingImages.current.set(uploaded.uploadToken, {
        ...uploaded,
        objectUrl,
      });
      editor.view.dispatch(
        editor.state.tr.setNodeMarkup(position, undefined, {
          ...node.attrs,
          'data-upload-token': uploaded.uploadToken,
          'data-upload-state': 'uploaded',
        }),
      );
      setError('');
    } catch {
      const editor = editorRef.current;
      if (editor) {
        const position = findImagePosition(editor, clientUploadId);
        const node = position >= 0 ? editor.state.doc.nodeAt(position) : null;
        if (node) {
          editor.view.dispatch(
            editor.state.tr.delete(position, position + node.nodeSize),
          );
        }
      }
      URL.revokeObjectURL(objectUrl);
      objectUrls.current.delete(clientUploadId);
      setError('본문 이미지 업로드에 실패했습니다.');
    } finally {
      setUploadingCount((count) => Math.max(0, count - 1));
    }
  };

  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        DraftFormTemplateImage.configure({ inline: false, allowBase64: false }),
        Table.configure({ resizable: true, renderWrapper: true }),
        TableRow,
        TableHeader,
        TableCell,
        Placeholder.configure({
          placeholder: '본문을 입력하세요.',
          emptyEditorClass: 'is-editor-empty',
        }),
      ],
      content: '<p></p>',
      immediatelyRender: false,
      editorProps: {
        attributes: {
          role: 'textbox',
          'aria-label': '본문',
          'aria-multiline': 'true',
          spellcheck: 'true',
        },
        handlePaste: (view, event) => {
          if (hasSpreadsheetClipboardContent(event.clipboardData)) return false;
          const files = Array.from(event.clipboardData?.items ?? [])
            .filter(
              (item) => item.kind === 'file' && item.type.startsWith('image/'),
            )
            .map((item) => item.getAsFile())
            .filter((file): file is File => Boolean(file));
          if (files.length === 0) return false;

          event.preventDefault();
          files.forEach((file) => {
            const clientUploadId = `draft-template-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2)}`;
            const objectUrl = URL.createObjectURL(file);
            objectUrls.current.set(clientUploadId, objectUrl);
            const imageNode = view.state.schema.nodes.image.create({
              src: objectUrl,
              alt: file.name,
              'data-client-upload-id': clientUploadId,
              'data-upload-state': 'uploading',
            });
            view.dispatch(
              view.state.tr.replaceSelectionWith(imageNode).scrollIntoView(),
            );
            void handleImagePaste(clientUploadId, file, objectUrl);
          });
          return true;
        },
        transformPastedHTML: normalizeClipboardHtmlForEditor,
        transformPastedText: normalizeClipboardTextForEditor,
      },
      onUpdate: ({ editor: currentEditor }) => {
        setHasChanges(currentEditor.getHTML() !== initialHtml.current);
      },
    },
    [row.draftingWorkCategoryId],
  );

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setTemplate(null);
    setError('');
    void fetchDraftFormTemplate(Number(row.draftingWorkCategoryId))
      .then((loaded) => {
        if (active) setTemplate(loaded);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : '기안양식 본문을 불러오지 못했습니다.',
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, row.draftingWorkCategoryId]);

  useEffect(() => {
    if (!editor || !template) return;
    let active = true;
    for (const [key, url] of objectUrls.current) {
      if (key.startsWith('saved-image-')) {
        URL.revokeObjectURL(url);
        objectUrls.current.delete(key);
      }
    }
    initialHtml.current = template.templateHtml || '<p></p>';
    editor.commands.setContent(
      (template.templateJson as JSONContent | null) ?? initialHtml.current,
      { emitUpdate: false },
    );
    setHasChanges(false);

    const formId = Number(row.draftingWorkCategoryId);
    const prefix = `/api/v1/co/workflow/forms/${formId}/template-images/`;
    const imageSources: Array<{
      position: number;
      node: import('@tiptap/pm/model').Node;
      fileId: number;
    }> = [];
    editor.state.doc.descendants((node, position) => {
      if (node.type.name !== 'image') return;
      const source = String(node.attrs.src ?? '');
      if (!source.startsWith(prefix)) return;
      const pathId = source.slice(prefix.length);
      if (!/^\d+$/.test(pathId)) return;
      const fileId = Number(node.attrs['data-file-id'] ?? pathId);
      if (fileId !== Number(pathId)) return;
      imageSources.push({ position, node, fileId });
    });

    void Promise.all(
      imageSources.map(async ({ position, node, fileId }) => {
        try {
          const blob = await fetchDraftFormTemplateImage(formId, fileId);
          if (!active) return null;
          const objectUrl = URL.createObjectURL(blob);
          objectUrls.current.set(`saved-image-${fileId}`, objectUrl);
          return { position, node, objectUrl };
        } catch {
          if (active) setError('본문 이미지를 불러오지 못했습니다.');
          return null;
        }
      }),
    ).then((images) => {
      if (!active) return;
      const transaction = editor.state.tr;
      images.forEach((image) => {
        if (!image) return;
        transaction.setNodeMarkup(image.position, undefined, {
          ...image.node.attrs,
          src: image.objectUrl,
        });
      });
      if (transaction.docChanged) editor.view.dispatch(transaction);
      initialHtml.current = editor.getHTML();
      setHasChanges(false);
    });

    return () => {
      active = false;
    };
  }, [editor, row.draftingWorkCategoryId, template]);

  const handleSave = async () => {
    if (!editor || !template || saving || uploadingCount > 0) return;
    setSaving(true);
    setError('');
    try {
      await saveDraftFormTemplate(Number(row.draftingWorkCategoryId), {
        templateJson: editor.getJSON() as DraftFormTemplate['templateJson'] &
          Record<string, unknown>,
        templateHtml: editor.getHTML(),
        embeddedImages: Array.from(pendingImages.current.values()).map(
          ({ uploadToken, fileName }) => ({ uploadToken, fileName }),
        ),
      });
      await onSaved();
      showSuccess('기안양식 본문을 저장했습니다.');
      finishClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : '기안양식 본문을 저장하지 못했습니다.',
      );
    } finally {
      setSaving(false);
    }
  };

  const toolbarItems = [
    {
      label: '굵게',
      icon: <FormatBoldOutlinedIcon />,
      run: () => editor?.chain().focus().toggleBold().run(),
    },
    {
      label: '기울임',
      icon: <FormatItalicOutlinedIcon />,
      run: () => editor?.chain().focus().toggleItalic().run(),
    },
    {
      label: '취소선',
      icon: <StrikethroughSOutlinedIcon />,
      run: () => editor?.chain().focus().toggleStrike().run(),
    },
    {
      label: '글머리 기호',
      icon: <FormatListBulletedOutlinedIcon />,
      run: () => editor?.chain().focus().toggleBulletList().run(),
    },
    {
      label: '번호 목록',
      icon: <FormatListNumberedOutlinedIcon />,
      run: () => editor?.chain().focus().toggleOrderedList().run(),
    },
    {
      label: '인용',
      icon: <FormatQuoteOutlinedIcon />,
      run: () => editor?.chain().focus().toggleBlockquote().run(),
    },
    {
      label: '되돌리기',
      icon: <UndoOutlinedIcon />,
      run: () => editor?.chain().focus().undo().run(),
    },
    {
      label: '다시 실행',
      icon: <RedoOutlinedIcon />,
      run: () => editor?.chain().focus().redo().run(),
    },
  ];

  return (
    <>
      <CommonDialog
        open={open}
        onClose={handleCloseRequest}
        title={row.hasDocument ? '문서 양식 수정' : '문서 양식 작성'}
        description={`${row.cataTypeCode} · ${row.codeName}`}
        size="md"
        bodyMode="fill"
        paperHeight="90vh"
        fullScreenOnMobile
        footerStart={
          <Box
            sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}
          >
            <IconButton
              size="small"
              aria-label="툴바 열기"
              onClick={() => setToolbarOpen((value) => !value)}
            >
              <FormatBoldOutlinedIcon fontSize="small" />
            </IconButton>
            {toolbarOpen && (
              <Box
                data-testid="draft-form-template-toolbar"
                sx={{
                  position: 'absolute',
                  left: 0,
                  bottom: 'calc(100% + 8px)',
                  zIndex: 2,
                  display: 'flex',
                  gap: 0.5,
                  p: 0.75,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: 'background.paper',
                  maxWidth: 'min(520px, calc(100vw - 48px))',
                  overflowX: 'auto',
                }}
              >
                {toolbarItems.map((item) => (
                  <IconButton
                    key={item.label}
                    size="small"
                    aria-label={item.label}
                    onClick={() => {
                      item.run();
                      setToolbarOpen(false);
                    }}
                  >
                    {item.icon}
                  </IconButton>
                ))}
              </Box>
            )}
          </Box>
        }
        actions={
          <>
            <Button
              variant="contained"
              onClick={() => void handleSave()}
              disabled={loading || !template || saving || uploadingCount > 0}
              startIcon={
                saving ? (
                  <CircularProgress size={16} color="inherit" />
                ) : undefined
              }
            >
              저장
            </Button>
            <Button
              variant="text"
              onClick={handleCloseRequest}
              disabled={saving}
            >
              취소
            </Button>
          </>
        }
        dialogProps={{ 'data-testid': 'draft-form-template-dialog' }}
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
          {error && <Alert severity="error">{error}</Alert>}
          {loading ? (
            <Box
              sx={{
                display: 'flex',
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CircularProgress aria-label="본문 불러오는 중" />
            </Box>
          ) : template ? (
            <Box
              data-testid="draft-form-template-editor"
              sx={{
                flex: 1,
                minHeight: 0,
                minWidth: 0,
                overflow: 'auto',
                borderTop: 1,
                borderBottom: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
                p: 2,
                '& .ProseMirror': {
                  minHeight: '100%',
                  outline: 'none',
                  lineHeight: 1.7,
                  overflowWrap: 'anywhere',
                },
                '& .ProseMirror table': {
                  width: '100%',
                  tableLayout: 'fixed',
                  borderCollapse: 'collapse',
                },
                '& .ProseMirror td, & .ProseMirror th': {
                  border: 1,
                  borderColor: 'divider',
                  p: 0.75,
                  verticalAlign: 'top',
                },
                '& .ProseMirror img': {
                  maxWidth: '100%',
                  height: 'auto',
                },
                '& .ProseMirror p.is-editor-empty:first-of-type::before': {
                  color: 'text.disabled',
                  content: 'attr(data-placeholder)',
                  float: 'left',
                  height: 0,
                  pointerEvents: 'none',
                },
              }}
            >
              <EditorContent editor={editor} />
            </Box>
          ) : null}
        </Box>
      </CommonDialog>
      <UnsavedChangesConfirmDialog
        open={confirmDiscardOpen}
        title="저장하지 않은 변경사항"
        description="본문 변경을 버리고 닫으시겠습니까?"
        cancelLabel="계속 편집"
        continueLabel="변경 버리기"
        onCancel={() => setConfirmDiscardOpen(false)}
        onContinue={handleDiscard}
      />
    </>
  );
}
