import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
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
import FormatBoldOutlinedIcon from '@mui/icons-material/FormatBoldOutlined';
import FormatItalicOutlinedIcon from '@mui/icons-material/FormatItalicOutlined';
import StrikethroughSOutlinedIcon from '@mui/icons-material/StrikethroughSOutlined';
import FormatListBulletedOutlinedIcon from '@mui/icons-material/FormatListBulletedOutlined';
import FormatListNumberedOutlinedIcon from '@mui/icons-material/FormatListNumberedOutlined';
import FormatQuoteOutlinedIcon from '@mui/icons-material/FormatQuoteOutlined';
import RedoOutlinedIcon from '@mui/icons-material/RedoOutlined';
import UndoOutlinedIcon from '@mui/icons-material/UndoOutlined';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Color,
  FontFamily,
  FontSize,
  TextStyle,
} from '@tiptap/extension-text-style';
import StarterKit from '@tiptap/starter-kit';
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from '@tiptap/extension-table';
import { noticeContentStyles } from './noticeContentStyles';
import { apiGetBlob } from '../../../../../shared/services/apiClient';
import { uploadNoticeEmbeddedImage } from '../services/noticeBoardService';
import {
  getAttachmentExtension,
  getAttachmentIconMeta,
} from '../../../../../shared/components/feed/attachmentIconMeta';
import { CommonDialog } from '../../../../../shared/components/CommonDialog';
import {
  hasSpreadsheetClipboardContent,
  normalizeClipboardHtmlForEditor,
  normalizeClipboardTextForEditor,
} from '../utils/noticeClipboard';

export {
  hasSpreadsheetClipboardContent,
  normalizeClipboardHtmlForEditor,
  normalizeClipboardTextForEditor,
} from '../utils/noticeClipboard';

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

export type NoticeComposerEmbeddedImage = {
  uploadToken: string;
  fileId?: number | string | null;
  objectKey: string;
  imageUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  width?: number | string | null;
};

type NoticeComposerDialogProps = {
  open: boolean;
  isDark: boolean;
  onClose: () => void;
  onSubmit?: (payload: {
    title: string;
    noticeGubunCode: string;
    body: string;
    bodyJson?: string;
    bodyText?: string;
    attachments: NoticeComposerDraftAttachment[];
    removedAttachmentIds: Array<number | string>;
    embeddedImages: NoticeComposerEmbeddedImage[];
  }) => Promise<unknown> | unknown;
  defaultTitle?: string;
  noticeGubunOptions?: Array<{ code: string; name: string }>;
  defaultNoticeGubunCode?: string;
  defaultBody?: string;
  defaultAttachments?: NoticeComposerDraftAttachment[];
};

export function serializeNoticeEditorJson(
  editor: { getJSON: () => unknown } | null | undefined,
): string | undefined {
  return editor ? JSON.stringify(editor.getJSON()) : undefined;
}

export function calculateNoticeImageResizeWidth(
  startWidth: number,
  delta: number,
): number {
  const safeStartWidth = Number.isFinite(startWidth) ? startWidth : 320;
  const safeDelta = Number.isFinite(delta) ? delta : 0;
  return Math.max(120, Math.min(1200, Math.round(safeStartWidth + safeDelta)));
}

type NoticeImageResizeDirection =
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w'
  | 'nw';

export function calculateNoticeImageResize(
  startWidth: number,
  startHeight: number,
  deltaX: number,
  deltaY: number,
  direction: NoticeImageResizeDirection,
): { width: number; height: number } {
  const safeStartWidth = Number.isFinite(startWidth) ? startWidth : 320;
  const safeStartHeight = Number.isFinite(startHeight) ? startHeight : 200;
  const safeDeltaX = Number.isFinite(deltaX) ? deltaX : 0;
  const safeDeltaY = Number.isFinite(deltaY) ? deltaY : 0;
  const isCorner = direction.length === 2;
  const hasHorizontalAxis = direction.includes('e') || direction.includes('w');
  const hasVerticalAxis = direction.includes('n') || direction.includes('s');
  const horizontalDelta = direction.includes('w') ? -safeDeltaX : safeDeltaX;
  const verticalDelta = direction.includes('n') ? -safeDeltaY : safeDeltaY;

  if (isCorner) {
    const aspectRatio = Math.max(0.01, safeStartWidth / safeStartHeight);
    const proposedWidth =
      Math.abs(horizontalDelta) >= Math.abs(verticalDelta) * aspectRatio
        ? safeStartWidth + horizontalDelta
        : safeStartWidth + verticalDelta * aspectRatio;
    const width = calculateNoticeImageResizeWidth(
      safeStartWidth,
      proposedWidth - safeStartWidth,
    );
    return {
      width,
      height: Math.max(80, Math.round(width / aspectRatio)),
    };
  }

  const width = hasHorizontalAxis
    ? calculateNoticeImageResizeWidth(safeStartWidth, horizontalDelta)
    : Math.round(safeStartWidth);
  const height = hasVerticalAxis
    ? Math.max(80, Math.round(safeStartHeight + verticalDelta))
    : Math.max(80, Math.round(safeStartHeight));

  return { width, height };
}

const StyledTableCell = TableCell.extend({
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

const StyledTableHeader = TableHeader.extend({
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

const NoticeImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-upload-token': {
        default: null,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute('data-upload-token'),
        renderHTML: (attributes: { 'data-upload-token'?: string | null }) =>
          attributes['data-upload-token']
            ? { 'data-upload-token': attributes['data-upload-token'] }
            : {},
      },
      'data-upload-state': {
        default: null,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute('data-upload-state'),
        renderHTML: (attributes: { 'data-upload-state'?: string | null }) =>
          attributes['data-upload-state']
            ? { 'data-upload-state': attributes['data-upload-state'] }
            : {},
      },
      'data-file-id': {
        default: null,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute('data-file-id'),
        renderHTML: (attributes: { 'data-file-id'?: string | null }) =>
          attributes['data-file-id']
            ? { 'data-file-id': attributes['data-file-id'] }
            : {},
      },
      'data-object-key': {
        default: null,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute('data-object-key'),
        renderHTML: (attributes: { 'data-object-key'?: string | null }) =>
          attributes['data-object-key']
            ? { 'data-object-key': attributes['data-object-key'] }
            : {},
      },
      'data-file-size': {
        default: null,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute('data-file-size'),
        renderHTML: (attributes: {
          'data-file-size'?: number | string | null;
        }) =>
          attributes['data-file-size'] != null
            ? { 'data-file-size': String(attributes['data-file-size']) }
            : {},
      },
      'data-mime-type': {
        default: null,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute('data-mime-type'),
        renderHTML: (attributes: { 'data-mime-type'?: string | null }) =>
          attributes['data-mime-type']
            ? { 'data-mime-type': attributes['data-mime-type'] }
            : {},
      },
    };
  },
});

function findEmbeddedImagePosition(
  editor: Editor,
  uploadToken: string,
  fallbackToken?: string,
): number {
  let position = -1;
  editor.state.doc.descendants((node, nodePosition) => {
    const imageUploadToken = String(node.attrs['data-upload-token'] ?? '');
    if (
      node.type.name === 'image' &&
      (imageUploadToken === uploadToken ||
        (fallbackToken && imageUploadToken === fallbackToken))
    ) {
      position = nodePosition;
      return false;
    }
    return true;
  });
  return position;
}

function updateEmbeddedImageNode(
  editor: Editor,
  uploadToken: string,
  uploaded: {
    uploadToken?: string;
    imageUrl: string;
    fileName: string;
    fileId?: number | string | null;
    objectKey: string;
    fileSize: number;
    mimeType: string;
  },
): void {
  const persistedToken = uploaded.uploadToken ?? uploadToken;
  const position = findEmbeddedImagePosition(
    editor,
    uploadToken,
    uploaded.uploadToken,
  );
  if (position < 0) {
    return;
  }

  editor
    .chain()
    .setNodeSelection(position)
    .updateAttributes('image', {
      src: uploaded.imageUrl,
      alt: uploaded.fileName,
      'data-file-id': uploaded.fileId == null ? null : String(uploaded.fileId),
      'data-object-key': uploaded.objectKey,
      'data-file-size': String(uploaded.fileSize),
      'data-mime-type': uploaded.mimeType,
      'data-upload-token': persistedToken,
      'data-upload-state': null,
    })
    .run();
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

function removeEmbeddedImageNode(editor: Editor, uploadToken: string): void {
  const position = findEmbeddedImagePosition(editor, uploadToken);
  if (position < 0) {
    return;
  }

  editor.chain().setNodeSelection(position).deleteSelection().run();
}

function autoSizeActiveTableCell(editor: Editor): void {
  const { $from } = editor.state.selection;
  let cellElement: HTMLElement | null = null;

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.name !== 'tableCell' && node.type.name !== 'tableHeader') {
      continue;
    }

    cellElement = editor.view.nodeDOM(
      $from.before(depth),
    ) as HTMLElement | null;
    break;
  }

  if (!cellElement) {
    return;
  }

  const computedStyle = window.getComputedStyle(cellElement);
  const measurement = document.createElement('span');
  measurement.textContent = cellElement.textContent ?? '';
  measurement.style.position = 'absolute';
  measurement.style.visibility = 'hidden';
  measurement.style.whiteSpace = 'nowrap';
  measurement.style.font = computedStyle.font;
  measurement.style.letterSpacing = computedStyle.letterSpacing;
  measurement.style.paddingLeft = computedStyle.paddingLeft;
  measurement.style.paddingRight = computedStyle.paddingRight;
  document.body.appendChild(measurement);
  const measuredWidth = Math.ceil(measurement.getBoundingClientRect().width);
  measurement.remove();

  const currentWidth = cellElement.getBoundingClientRect().width;
  if (measuredWidth <= currentWidth + 1) {
    return;
  }

  editor.commands.setCellAttribute('colwidth', [measuredWidth]);
}

const emptyNoticeContent = '<p></p>';

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
  const editorRef = useRef<Editor | null>(null);
  const pasteDebugEnabled =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('noticePasteDebug') === '1';
  const [title, setTitle] = useState(defaultTitle);
  const [noticeGubunCode, setNoticeGubunCode] = useState(
    defaultNoticeGubunCode,
  );
  const [noticeGubunError, setNoticeGubunError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [editorIsEmpty, setEditorIsEmpty] = useState(true);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [pasteDebugLog, setPasteDebugLog] = useState<string[]>(() =>
    pasteDebugEnabled ? ['[notice-paste] 진단 모드가 활성화되었습니다.'] : [],
  );
  const [attachments, setAttachments] =
    useState<NoticeComposerDraftAttachment[]>(defaultAttachments);

  const editorConfig = useMemo(
    () => ({
      extensions: [
        StarterKit,
        NoticeImage,
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
        StyledTableHeader,
        StyledTableCell,
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
        handlePaste: (_view: unknown, event: ClipboardEvent) => {
          if (hasSpreadsheetClipboardContent(event.clipboardData)) {
            return false;
          }

          const imageFiles = Array.from(event.clipboardData?.items ?? [])
            .filter(
              (item) => item.kind === 'file' && item.type.startsWith('image/'),
            )
            .map((item) => item.getAsFile())
            .filter((file): file is File => Boolean(file));

          if (imageFiles.length > 0) {
            event.preventDefault();
            const activeEditor = editorRef.current;
            if (!activeEditor) {
              return true;
            }

            void (async () => {
              for (const file of imageFiles) {
                const placeholderSrc = URL.createObjectURL(file);
                const uploadToken = `local-${Date.now()}-${Math.random()
                  .toString(36)
                  .slice(2)}`;
                activeEditor
                  .chain()
                  .focus()
                  .setImage({ src: placeholderSrc, alt: '이미지 업로드 중' })
                  .updateAttributes('image', {
                    'data-upload-token': uploadToken,
                    'data-upload-state': 'uploading',
                  })
                  .run();

                try {
                  const uploaded = await uploadNoticeEmbeddedImage(file);
                  updateEmbeddedImageNode(activeEditor, uploadToken, uploaded);
                  setImageUploadError(null);
                } catch {
                  removeEmbeddedImageNode(activeEditor, uploadToken);
                  setImageUploadError('본문 이미지 업로드에 실패했습니다.');
                } finally {
                  URL.revokeObjectURL(placeholderSrc);
                }
              }
            })();
            return true;
          }

          if (pasteDebugEnabled) {
            const data = event.clipboardData;
            const html = data?.getData('text/html') ?? '';
            const text = data?.getData('text/plain') ?? '';
            const normalizedHtml = normalizeClipboardHtmlForEditor(html);
            setPasteDebugLog((current) => [
              ...current,
              `[paste] types=${data ? Array.from(data.types).join(', ') : '(none)'}`,
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
          }

          return false;
        },
        transformPastedHTML: (html: string) =>
          normalizeClipboardHtmlForEditor(html),
        transformPastedText: (text: string) =>
          normalizeClipboardTextForEditor(text),
      },
      onUpdate: ({ editor }: { editor: Editor }) => {
        autoSizeActiveTableCell(editor);
      },
    }),
    [defaultBody, editorSurfaceBackground, pasteDebugEnabled],
  );

  const editor = useEditor(editorConfig);

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

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
    if (!editor || !open) {
      return;
    }

    const syncEditorState = () => {
      setEditorIsEmpty(editor.isEmpty);
    };

    const resizeOverlay = document.createElement('div');
    resizeOverlay.className = 'notice-image-resize-overlay';
    resizeOverlay.setAttribute('aria-label', '이미지 크기 조절 영역');
    resizeOverlay.style.display = 'none';
    resizeOverlay.style.position = 'fixed';
    resizeOverlay.style.zIndex = '1400';
    resizeOverlay.style.pointerEvents = 'none';
    resizeOverlay.style.boxSizing = 'border-box';
    resizeOverlay.style.border = '1px solid #2563eb';
    resizeOverlay.style.touchAction = 'none';

    const resizeDirections: Array<NoticeImageResizeDirection> = [
      'nw',
      'n',
      'ne',
      'e',
      'se',
      's',
      'sw',
      'w',
    ];
    const resizeHandles = resizeDirections.map((direction) => {
      const handle = document.createElement('span');
      handle.className = `notice-image-resize-handle notice-image-resize-handle-${direction}`;
      handle.dataset.direction = direction;
      handle.setAttribute('aria-label', `${direction} 방향 이미지 크기 조절`);
      handle.style.position = 'absolute';
      handle.style.width = '10px';
      handle.style.height = '10px';
      handle.style.border = '1px solid #1d4ed8';
      handle.style.borderRadius = '2px';
      handle.style.backgroundColor = '#ffffff';
      handle.style.pointerEvents = 'auto';
      handle.style.touchAction = 'none';
      handle.style.transform = 'translate(-50%, -50%)';
      return handle;
    });
    resizeHandles.forEach((handle) => resizeOverlay.appendChild(handle));
    document.body.appendChild(resizeOverlay);

    let selectedImage: HTMLImageElement | null = null;
    let selectedImagePosition = -1;

    const syncResizeOverlay = () => {
      const nodeElement = editor.view.dom.querySelector(
        'img.ProseMirror-selectednode',
      );
      selectedImage =
        nodeElement instanceof HTMLImageElement ? nodeElement : null;
      selectedImagePosition = selectedImage
        ? editor.view.posAtDOM(selectedImage, 0)
        : -1;

      if (!selectedImage) {
        resizeOverlay.style.display = 'none';
        return;
      }

      const imageRect = selectedImage.getBoundingClientRect();
      const editorRect = editor.view.dom.getBoundingClientRect();
      const clipTop = Math.max(0, editorRect.top - imageRect.top);
      const clipRight = Math.max(0, imageRect.right - editorRect.right);
      const clipBottom = Math.max(0, imageRect.bottom - editorRect.bottom);
      const clipLeft = Math.max(0, editorRect.left - imageRect.left);
      resizeOverlay.style.display = 'block';
      resizeOverlay.style.left = `${imageRect.left}px`;
      resizeOverlay.style.top = `${imageRect.top}px`;
      resizeOverlay.style.width = `${imageRect.width}px`;
      resizeOverlay.style.height = `${imageRect.height}px`;
      resizeOverlay.style.clipPath = `inset(${clipTop}px ${clipRight}px ${clipBottom}px ${clipLeft}px)`;

      const positions: Record<NoticeImageResizeDirection, [string, string]> = {
        nw: ['0%', '0%'],
        n: ['50%', '0%'],
        ne: ['100%', '0%'],
        e: ['100%', '50%'],
        se: ['100%', '100%'],
        s: ['50%', '100%'],
        sw: ['0%', '100%'],
        w: ['0%', '50%'],
      };
      resizeHandles.forEach((handle) => {
        const direction = handle.dataset
          .direction as NoticeImageResizeDirection;
        const [left, top] = positions[direction];
        handle.style.left = left;
        handle.style.top = top;
        handle.style.cursor = `${direction}-resize`;
      });
    };

    const handleImagePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const imageElement = target?.closest('img');
      if (!imageElement || !editor.view.dom.contains(imageElement)) {
        return;
      }

      const imagePos = editor.view.posAtDOM(imageElement, 0);
      if (!Number.isFinite(imagePos)) {
        return;
      }

      editor.commands.setNodeSelection(imagePos);
      syncResizeOverlay();
    };

    const handleResizePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      const direction = target?.dataset.direction as
        | NoticeImageResizeDirection
        | undefined;
      if (!direction || !selectedImage || selectedImagePosition < 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      const resizeStartX = event.clientX;
      const resizeStartY = event.clientY;
      const resizeStartWidth =
        selectedImage.getBoundingClientRect().width || 320;
      const resizeStartHeight =
        selectedImage.getBoundingClientRect().height || 200;

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const nextSize = calculateNoticeImageResize(
          resizeStartWidth,
          resizeStartHeight,
          moveEvent.clientX - resizeStartX,
          moveEvent.clientY - resizeStartY,
          direction,
        );
        editor
          .chain()
          .focus()
          .setNodeSelection(selectedImagePosition)
          .updateAttributes('image', {
            width: `${nextSize.width}px`,
            height: `${nextSize.height}px`,
          })
          .run();
        syncResizeOverlay();
      };

      const handlePointerUp = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    };

    syncEditorState();
    editor.on('create', syncEditorState);
    editor.on('update', syncEditorState);
    editor.on('selectionUpdate', syncEditorState);
    editor.view.dom.addEventListener('mousedown', handleImagePointerDown);
    resizeOverlay.addEventListener('pointerdown', handleResizePointerDown);
    editor.on('selectionUpdate', syncResizeOverlay);
    editor.on('update', syncResizeOverlay);
    window.addEventListener('resize', syncResizeOverlay);
    window.addEventListener('scroll', syncResizeOverlay, true);
    editor.view.dom.addEventListener('scroll', syncResizeOverlay, true);
    syncResizeOverlay();

    return () => {
      editor.off('create', syncEditorState);
      editor.off('update', syncEditorState);
      editor.off('selectionUpdate', syncEditorState);
      editor.view.dom.removeEventListener('mousedown', handleImagePointerDown);
      editor.off('selectionUpdate', syncResizeOverlay);
      editor.off('update', syncResizeOverlay);
      resizeOverlay.removeEventListener('pointerdown', handleResizePointerDown);
      window.removeEventListener('resize', syncResizeOverlay);
      window.removeEventListener('scroll', syncResizeOverlay, true);
      editor.view.dom.removeEventListener('scroll', syncResizeOverlay, true);
      resizeOverlay.remove();
    };
  }, [editor, open]);

  useEffect(() => {
    if (!editor || open) {
      return;
    }

    editor.commands.setTextSelection(1);
    editor.commands.blur();
  }, [editor, open]);

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
  );

  const actions = (
    <>
      <Button
        variant="contained"
        color="primary"
        onClick={handleSubmit}
        disabled={saving || (title.trim().length === 0 && editorIsEmpty)}
        startIcon={
          saving ? <CircularProgress size={16} color="inherit" /> : undefined
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
        저장
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
                  ...noticeContentStyles,
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
              <EditorContent
                editor={editor}
                className="notice-composer-editor"
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
