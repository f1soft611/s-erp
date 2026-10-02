import { useEffect, useRef, useState } from 'react';
import { Box, IconButton, MenuItem, TextField, Tooltip } from '@mui/material';
import FormatBoldOutlinedIcon from '@mui/icons-material/FormatBoldOutlined';
import FormatItalicOutlinedIcon from '@mui/icons-material/FormatItalicOutlined';
import FormatListBulletedOutlinedIcon from '@mui/icons-material/FormatListBulletedOutlined';
import FormatListNumberedOutlinedIcon from '@mui/icons-material/FormatListNumberedOutlined';
import FormatQuoteOutlinedIcon from '@mui/icons-material/FormatQuoteOutlined';
import RedoOutlinedIcon from '@mui/icons-material/RedoOutlined';
import StrikethroughSOutlinedIcon from '@mui/icons-material/StrikethroughSOutlined';
import UndoOutlinedIcon from '@mui/icons-material/UndoOutlined';
import {
  Color,
  FontFamily,
  FontSize,
  TextStyle,
} from '@tiptap/extension-text-style';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from '@tiptap/extension-table';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  hasSpreadsheetClipboardContent,
  normalizeClipboardHtmlForEditor,
  normalizeClipboardTextForEditor,
} from './clipboard';
import { richTextEditorContentStyles } from './editorStyles';
import type {
  RichTextEditorProps,
  RichTextEditorToolbarProps,
} from './richTextEditor.types';
import { calculateImageResize, type ImageResizeDirection } from './imageResize';

const RichTextImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-upload-token': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-upload-token'),
        renderHTML: (attributes) =>
          attributes['data-upload-token']
            ? { 'data-upload-token': attributes['data-upload-token'] }
            : {},
      },
      'data-file-id': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-file-id'),
        renderHTML: (attributes) =>
          attributes['data-file-id']
            ? { 'data-file-id': attributes['data-file-id'] }
            : {},
      },
      'data-object-key': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-object-key'),
        renderHTML: (attributes) =>
          attributes['data-object-key']
            ? { 'data-object-key': attributes['data-object-key'] }
            : {},
      },
      'data-file-size': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-file-size'),
        renderHTML: (attributes) =>
          attributes['data-file-size'] != null
            ? { 'data-file-size': String(attributes['data-file-size']) }
            : {},
      },
      'data-mime-type': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-mime-type'),
        renderHTML: (attributes) =>
          attributes['data-mime-type']
            ? { 'data-mime-type': attributes['data-mime-type'] }
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
      'data-editor-upload-id': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-editor-upload-id'),
        renderHTML: (attributes) =>
          attributes['data-editor-upload-id']
            ? { 'data-editor-upload-id': attributes['data-editor-upload-id'] }
            : {},
      },
    };
  },
});

const RichTextTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('style'),
        renderHTML: (attributes: { style?: string | null }) =>
          attributes.style ? { style: attributes.style } : {},
      },
    };
  },
});

const RichTextTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('style'),
        renderHTML: (attributes: { style?: string | null }) =>
          attributes.style ? { style: attributes.style } : {},
      },
    };
  },
});

export function RichTextEditor({
  content = '<p></p>',
  onEditorReady,
  onContentChange,
  onClipboardPaste,
  readOnly = false,
  placeholder = '본문을 입력하세요.',
  ariaLabel = '본문',
  className,
  contentSx,
  uploadImage,
  onOrphanedImageUpload,
  onUploadingChange,
  onImageUploadError,
}: RichTextEditorProps) {
  const uploadImageRef = useRef(uploadImage);
  const orphanUploadRef = useRef(onOrphanedImageUpload);
  const uploadingChangeRef = useRef(onUploadingChange);
  const uploadErrorRef = useRef(onImageUploadError);
  const clipboardPasteRef = useRef(onClipboardPaste);
  const uploadingCount = useRef(0);
  const editorRef = useRef<Editor | null>(null);
  const objectUrls = useRef(new Map<string, string>());

  useEffect(() => {
    uploadImageRef.current = uploadImage;
    orphanUploadRef.current = onOrphanedImageUpload;
    uploadingChangeRef.current = onUploadingChange;
    uploadErrorRef.current = onImageUploadError;
    clipboardPasteRef.current = onClipboardPaste;
  }, [
    uploadImage,
    onOrphanedImageUpload,
    onUploadingChange,
    onImageUploadError,
    onClipboardPaste,
  ]);

  const updateUploadingCount = (delta: number) => {
    uploadingCount.current = Math.max(0, uploadingCount.current + delta);
    uploadingChangeRef.current?.(uploadingCount.current);
  };

  const findImagePosition = (currentEditor: Editor, uploadId: string) => {
    let found = -1;
    currentEditor.state.doc.descendants((node, position) => {
      if (
        node.type.name === 'image' &&
        node.attrs['data-editor-upload-id'] === uploadId
      ) {
        found = position;
        return false;
      }
      return found < 0;
    });
    return found;
  };

  const releaseDetachedObjectUrls = (currentEditor: Editor) => {
    const activeSources = new Set<string>();
    currentEditor.state.doc.descendants((node) => {
      if (node.type.name === 'image' && typeof node.attrs.src === 'string') {
        activeSources.add(node.attrs.src);
      }
      return true;
    });
    for (const [uploadId, objectUrl] of objectUrls.current) {
      if (!activeSources.has(objectUrl)) {
        URL.revokeObjectURL(objectUrl);
        objectUrls.current.delete(uploadId);
      }
    }
  };

  const handleImagePaste = async (file: File, uploadId: string) => {
    const currentEditor = editorRef.current;
    const objectUrl = objectUrls.current.get(uploadId);
    const uploadAdapter = uploadImageRef.current;
    if (!currentEditor || !objectUrl || !uploadAdapter) return;

    updateUploadingCount(1);
    try {
      const uploaded = await uploadAdapter(file);
      const position = findImagePosition(currentEditor, uploadId);
      if (position < 0) {
        await orphanUploadRef.current?.(uploaded);
        return;
      }

      const node = currentEditor.state.doc.nodeAt(position);
      if (!node) return;
      const attributes = {
        ...node.attrs,
        src: uploaded.src ?? node.attrs.src,
        alt: uploaded.alt ?? node.attrs.alt ?? file.name,
        'data-upload-token': uploaded.uploadToken ?? null,
        'data-file-id': uploaded.fileId ?? null,
        'data-object-key': uploaded.objectKey ?? null,
        'data-file-size': uploaded.fileSize ?? null,
        'data-mime-type': uploaded.mimeType ?? null,
        'data-upload-state': null,
        'data-editor-upload-id': null,
      };
      currentEditor.view.dispatch(
        currentEditor.state.tr.setNodeMarkup(position, undefined, attributes),
      );
      if (uploaded.src) {
        URL.revokeObjectURL(objectUrl);
        objectUrls.current.delete(uploadId);
      }
      uploadErrorRef.current?.('');
    } catch {
      const position = findImagePosition(currentEditor, uploadId);
      const node =
        position >= 0 ? currentEditor.state.doc.nodeAt(position) : null;
      if (node) {
        currentEditor.view.dispatch(
          currentEditor.state.tr.delete(position, position + node.nodeSize),
        );
      }
      uploadErrorRef.current?.('본문 이미지 업로드에 실패했습니다.');
    } finally {
      updateUploadingCount(-1);
      releaseDetachedObjectUrls(currentEditor);
    }
  };

  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        RichTextImage.configure({ inline: false, allowBase64: false }),
        TextStyle,
        FontFamily,
        FontSize,
        Color,
        Table.configure({
          resizable: true,
          handleWidth: 6,
          cellMinWidth: 16,
          lastColumnResizable: true,
          renderWrapper: true,
        }),
        TableRow,
        RichTextTableHeader,
        RichTextTableCell,
        Placeholder.configure({
          placeholder,
          emptyEditorClass: 'is-editor-empty',
        }),
      ],
      content,
      editable: !readOnly,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          role: 'textbox',
          'aria-label': ariaLabel,
          'aria-multiline': 'true',
          spellcheck: 'true',
        },
        transformPastedHTML: normalizeClipboardHtmlForEditor,
        transformPastedText: normalizeClipboardTextForEditor,
        handlePaste: (view, event) => {
          const reportPaste = () => {
            if (!event.clipboardData) return;
            clipboardPasteRef.current?.(
              event.clipboardData,
              normalizeClipboardHtmlForEditor(
                event.clipboardData.getData('text/html'),
              ),
            );
          };
          if (hasSpreadsheetClipboardContent(event.clipboardData)) {
            reportPaste();
            return false;
          }
          const files = Array.from(event.clipboardData?.items ?? [])
            .filter(
              (item) => item.kind === 'file' && item.type.startsWith('image/'),
            )
            .map((item) => item.getAsFile())
            .filter((file): file is File => Boolean(file));
          if (files.length === 0) {
            reportPaste();
            return false;
          }

          event.preventDefault();
          const uploadAdapter = uploadImageRef.current;
          if (!uploadAdapter || readOnly) return true;
          files.forEach((file) => {
            const uploadId = `editor-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2)}`;
            const objectUrl = URL.createObjectURL(file);
            objectUrls.current.set(uploadId, objectUrl);
            const image = view.state.schema.nodes.image.create({
              src: objectUrl,
              alt: file.name,
              'data-editor-upload-id': uploadId,
              'data-upload-state': 'uploading',
            });
            view.dispatch(
              view.state.tr.replaceSelectionWith(image).scrollIntoView(),
            );
            void handleImagePaste(file, uploadId);
          });
          return true;
        },
      },
      onUpdate: ({ editor: updatedEditor }) => {
        releaseDetachedObjectUrls(updatedEditor);
        onContentChange?.(updatedEditor);
      },
    },
    [],
  );

  useEffect(() => {
    editorRef.current = editor;
    onEditorReady?.(editor);
    return () => onEditorReady?.(null);
  }, [editor, onEditorReady]);

  useEffect(
    () => () => {
      objectUrls.current.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
      objectUrls.current.clear();
      if (uploadingCount.current > 0) {
        uploadingCount.current = 0;
        uploadingChangeRef.current?.(0);
      }
    },
    [],
  );

  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => {
    if (!editor || readOnly) return;

    const overlay = document.createElement('div');
    overlay.className = 'rich-text-image-resize-overlay';
    overlay.setAttribute('role', 'group');
    overlay.setAttribute('aria-label', '이미지 크기 조절 영역');
    Object.assign(overlay.style, {
      display: 'none',
      position: 'fixed',
      zIndex: '1400',
      pointerEvents: 'none',
      boxSizing: 'border-box',
      border: '1px solid #2563eb',
      touchAction: 'none',
    });
    const directions: ImageResizeDirection[] = [
      'nw',
      'n',
      'ne',
      'e',
      'se',
      's',
      'sw',
      'w',
    ];
    const handles = directions.map((direction) => {
      const handle = document.createElement('span');
      handle.className = `rich-text-image-resize-handle rich-text-image-resize-handle-${direction}`;
      handle.dataset.direction = direction;
      handle.setAttribute('aria-label', `${direction} 방향 이미지 크기 조절`);
      Object.assign(handle.style, {
        position: 'absolute',
        width: '10px',
        height: '10px',
        border: '1px solid #1d4ed8',
        borderRadius: '2px',
        backgroundColor: '#ffffff',
        pointerEvents: 'auto',
        touchAction: 'none',
        transform: 'translate(-50%, -50%)',
      });
      return handle;
    });
    handles.forEach((handle) => overlay.appendChild(handle));
    document.body.appendChild(overlay);

    let selectedImage: HTMLImageElement | null = null;
    let selectedImagePosition = -1;
    const syncOverlay = () => {
      const selectedNode = editor.view.dom.querySelector(
        'img.ProseMirror-selectednode',
      );
      selectedImage =
        selectedNode instanceof HTMLImageElement ? selectedNode : null;
      selectedImagePosition = selectedImage
        ? editor.view.posAtDOM(selectedImage, 0)
        : -1;
      if (!selectedImage) {
        overlay.style.display = 'none';
        return;
      }

      const imageRect = selectedImage.getBoundingClientRect();
      const editorRect = editor.view.dom.getBoundingClientRect();
      const clipTop = Math.max(0, editorRect.top - imageRect.top);
      const clipRight = Math.max(0, imageRect.right - editorRect.right);
      const clipBottom = Math.max(0, imageRect.bottom - editorRect.bottom);
      const clipLeft = Math.max(0, editorRect.left - imageRect.left);
      overlay.style.display = 'block';
      overlay.style.left = `${imageRect.left}px`;
      overlay.style.top = `${imageRect.top}px`;
      overlay.style.width = `${imageRect.width}px`;
      overlay.style.height = `${imageRect.height}px`;
      overlay.style.clipPath = `inset(${clipTop}px ${clipRight}px ${clipBottom}px ${clipLeft}px)`;

      const positions: Record<ImageResizeDirection, [string, string]> = {
        nw: ['0%', '0%'],
        n: ['50%', '0%'],
        ne: ['100%', '0%'],
        e: ['100%', '50%'],
        se: ['100%', '100%'],
        s: ['50%', '100%'],
        sw: ['0%', '100%'],
        w: ['0%', '50%'],
      };
      handles.forEach((handle) => {
        const direction = handle.dataset.direction as ImageResizeDirection;
        const [left, top] = positions[direction];
        handle.style.left = left;
        handle.style.top = top;
        handle.style.cursor = `${direction}-resize`;
      });
    };
    const handleImagePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const image = target?.closest('img');
      if (!image || !editor.view.dom.contains(image)) return;
      const position = editor.view.posAtDOM(image, 0);
      if (!Number.isFinite(position)) return;
      editor.commands.setNodeSelection(position);
      syncOverlay();
    };
    const handleResizePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      const direction = target?.dataset.direction as
        | ImageResizeDirection
        | undefined;
      if (!direction || !selectedImage || selectedImagePosition < 0) return;

      event.preventDefault();
      event.stopPropagation();
      const startX = event.clientX;
      const startY = event.clientY;
      const startRect = selectedImage.getBoundingClientRect();
      const startWidth = startRect.width || 320;
      const startHeight = startRect.height || 200;
      const handlePointerMove = (moveEvent: PointerEvent) => {
        const size = calculateImageResize(
          startWidth,
          startHeight,
          moveEvent.clientX - startX,
          moveEvent.clientY - startY,
          direction,
        );
        editor
          .chain()
          .focus()
          .setNodeSelection(selectedImagePosition)
          .updateAttributes('image', {
            width: `${size.width}px`,
            height: `${size.height}px`,
          })
          .run();
        syncOverlay();
      };
      const handlePointerUp = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    };

    editor.view.dom.addEventListener('mousedown', handleImagePointerDown);
    editor.on('selectionUpdate', syncOverlay);
    editor.on('update', syncOverlay);
    overlay.addEventListener('pointerdown', handleResizePointerDown);
    window.addEventListener('resize', syncOverlay);
    window.addEventListener('scroll', syncOverlay, true);
    editor.view.dom.addEventListener('scroll', syncOverlay, true);
    syncOverlay();

    return () => {
      editor.view.dom.removeEventListener('mousedown', handleImagePointerDown);
      editor.off('selectionUpdate', syncOverlay);
      editor.off('update', syncOverlay);
      overlay.removeEventListener('pointerdown', handleResizePointerDown);
      window.removeEventListener('resize', syncOverlay);
      window.removeEventListener('scroll', syncOverlay, true);
      editor.view.dom.removeEventListener('scroll', syncOverlay, true);
      overlay.remove();
    };
  }, [editor, readOnly]);

  return (
    <Box
      className={className}
      sx={[
        { width: '100%', minWidth: 0 },
        richTextEditorContentStyles,
        contentSx ? { '& .ProseMirror': contentSx } : {},
      ]}
    >
      <EditorContent editor={editor} />
    </Box>
  );
}

const toolbarItems = [
  {
    label: '굵게',
    icon: <FormatBoldOutlinedIcon fontSize="small" />,
    command: (editor: Editor) => editor.chain().focus().toggleBold().run(),
    mark: 'bold',
  },
  {
    label: '기울임',
    icon: <FormatItalicOutlinedIcon fontSize="small" />,
    command: (editor: Editor) => editor.chain().focus().toggleItalic().run(),
    mark: 'italic',
  },
  {
    label: '취소선',
    icon: <StrikethroughSOutlinedIcon fontSize="small" />,
    command: (editor: Editor) => editor.chain().focus().toggleStrike().run(),
    mark: 'strike',
  },
  {
    label: '글머리 기호',
    icon: <FormatListBulletedOutlinedIcon fontSize="small" />,
    command: (editor: Editor) =>
      editor.chain().focus().toggleBulletList().run(),
    mark: 'bulletList',
  },
  {
    label: '번호 목록',
    icon: <FormatListNumberedOutlinedIcon fontSize="small" />,
    command: (editor: Editor) =>
      editor.chain().focus().toggleOrderedList().run(),
    mark: 'orderedList',
  },
  {
    label: '인용',
    icon: <FormatQuoteOutlinedIcon fontSize="small" />,
    command: (editor: Editor) =>
      editor.chain().focus().toggleBlockquote().run(),
    mark: 'blockquote',
  },
  {
    label: '되돌리기',
    icon: <UndoOutlinedIcon fontSize="small" />,
    command: (editor: Editor) => editor.chain().focus().undo().run(),
    mark: '',
  },
  {
    label: '다시 실행',
    icon: <RedoOutlinedIcon fontSize="small" />,
    command: (editor: Editor) => editor.chain().focus().redo().run(),
    mark: '',
  },
];

export function RichTextEditorToolbar({
  editor,
  panelTestId = 'rich-text-editor-toolbar',
  triggerSx,
  panelSx,
}: RichTextEditorToolbarProps) {
  const [open, setOpen] = useState(false);

  return (
    <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <Tooltip title="툴바 열기">
        <span>
          <IconButton
            size="small"
            aria-label="툴바 열기"
            aria-expanded={open}
            disabled={!editor}
            onClick={() => setOpen((current) => !current)}
            sx={triggerSx}
          >
            <FormatBoldOutlinedIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      {open && editor && (
        <Box
          data-testid={panelTestId}
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
            ...panelSx,
          }}
        >
          <TextField
            select
            size="small"
            margin="none"
            label="글꼴"
            value=""
            onChange={(event) =>
              editor.chain().focus().setFontFamily(event.target.value).run()
            }
            sx={{ width: 118, flexShrink: 0 }}
          >
            <MenuItem value="Arial">Arial</MenuItem>
            <MenuItem value="Georgia">Georgia</MenuItem>
            <MenuItem value="Malgun Gothic">맑은 고딕</MenuItem>
            <MenuItem value="sans-serif">Sans Serif</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            margin="none"
            label="글자 크기"
            value=""
            onChange={(event) =>
              editor.chain().focus().setFontSize(event.target.value).run()
            }
            sx={{ width: 104, flexShrink: 0 }}
          >
            {['10px', '12px', '14px', '16px', '18px', '24px', '32px'].map(
              (fontSize) => (
                <MenuItem key={fontSize} value={fontSize}>
                  {fontSize}
                </MenuItem>
              ),
            )}
          </TextField>
          <Tooltip title="글자 색상">
            <input
              aria-label="글자 색상"
              type="color"
              defaultValue="#000000"
              onChange={(event) =>
                editor.chain().focus().setColor(event.target.value).run()
              }
              style={{
                width: 32,
                height: 32,
                flexShrink: 0,
                padding: 2,
                border: '1px solid #94a3b8',
                borderRadius: 4,
                background: 'transparent',
                cursor: 'pointer',
              }}
            />
          </Tooltip>
          {toolbarItems.map((item) => (
            <Tooltip key={item.label} title={item.label}>
              <IconButton
                size="small"
                aria-label={item.label}
                aria-pressed={
                  item.mark ? editor.isActive(item.mark) : undefined
                }
                onClick={() => {
                  item.command(editor);
                  setOpen(false);
                }}
              >
                {item.icon}
              </IconButton>
            </Tooltip>
          ))}
        </Box>
      )}
    </Box>
  );
}
