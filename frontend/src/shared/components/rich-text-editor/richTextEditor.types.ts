import type { JSONContent } from '@tiptap/core';
import type { Editor } from '@tiptap/react';
import type { SxProps, Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';

export type RichTextEditorImage = {
  src?: string;
  alt?: string;
  uploadToken?: string | null;
  fileId?: string | null;
  objectKey?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
};

export type RichTextEditorProps = {
  content?: string | JSONContent;
  uploadImage?: (file: File) => Promise<RichTextEditorImage>;
  onOrphanedImageUpload?: (image: RichTextEditorImage) => void | Promise<void>;
  onEditorReady?: (editor: Editor | null) => void;
  onContentChange?: (editor: Editor) => void;
  onClipboardPaste?: (data: DataTransfer, normalizedHtml: string) => void;
  onUploadingChange?: (uploadingCount: number) => void;
  onImageUploadError?: (message: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  contentSx?: SystemStyleObject<Theme>;
};

export type RichTextEditorToolbarProps = {
  editor: Editor | null;
  panelTestId?: string;
  triggerSx?: SxProps<Theme>;
  panelSx?: SxProps<Theme>;
};
