import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress } from '@mui/material';
import type { JSONContent } from '@tiptap/core';
import type { Editor } from '@tiptap/react';
import { CommonDialog } from '../../../../../shared/components/CommonDialog';
import { UnsavedChangesConfirmDialog } from '../../../../../shared/components/UnsavedChangesConfirmDialog';
import { useNotification } from '../../../../../shared/context/NotificationContext';
import {
  RichTextEditor,
  RichTextEditorToolbar,
} from '../../../../../shared/components/rich-text-editor/RichTextEditor';
import type { RichTextEditorImage } from '../../../../../shared/components/rich-text-editor/richTextEditor.types';
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

type PendingImage = DraftFormTemplateUpload;

export type DraftFormTemplateDialogProps = {
  open: boolean;
  row: DraftFormRow;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

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
  const initialHtml = useRef('<p></p>');
  const pendingImages = useRef(new Map<string, PendingImage>());
  const objectUrls = useRef(new Map<string, string>());
  const [editor, setEditor] = useState<Editor | null>(null);

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

  const uploadTemplateImage = async (
    file: File,
  ): Promise<RichTextEditorImage> => {
    const uploaded = await uploadDraftFormTemplateImage(
      Number(row.draftingWorkCategoryId),
      file,
    );
    pendingImages.current.set(uploaded.uploadToken, uploaded);
    setError('');
    return {
      src: uploaded.previewUrl,
      alt: uploaded.fileName,
      uploadToken: uploaded.uploadToken,
      fileSize: uploaded.fileSize,
      mimeType: uploaded.mimeType,
    };
  };

  const deleteOrphanedTemplateImage = async (image: RichTextEditorImage) => {
    if (!image.uploadToken || !image.alt) return;
    await deleteDraftFormTemplateImage(
      Number(row.draftingWorkCategoryId),
      image.uploadToken,
      image.alt,
    );
    pendingImages.current.delete(image.uploadToken);
  };

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
          <RichTextEditorToolbar
            editor={editor}
            panelTestId="draft-form-template-toolbar"
          />
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
              }}
            >
              <RichTextEditor
                content="<p></p>"
                ariaLabel="본문"
                onEditorReady={setEditor}
                onContentChange={(currentEditor) =>
                  setHasChanges(currentEditor.getHTML() !== initialHtml.current)
                }
                uploadImage={uploadTemplateImage}
                onOrphanedImageUpload={deleteOrphanedTemplateImage}
                onUploadingChange={setUploadingCount}
                onImageUploadError={setError}
                className="draft-form-template-rich-text-editor"
                contentSx={{
                  minHeight: '100%',
                  outline: 'none',
                  lineHeight: 1.7,
                  overflowWrap: 'anywhere',
                  '& p.is-editor-empty:first-of-type::before': {
                    color: 'text.disabled',
                    content: 'attr(data-placeholder)',
                    float: 'left',
                    height: 0,
                    pointerEvents: 'none',
                  },
                }}
              />
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
