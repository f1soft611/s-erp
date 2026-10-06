import { useCallback, useRef, useState, type ChangeEvent } from 'react';
import type { Editor } from '@tiptap/react';
import { useTheme } from '@mui/material/styles';
import type { DocumentKind } from '../types/documentWrite.types';

export function useDocumentComposer(onClose: () => void) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const editorSurfaceBackground = isDark ? '#0f172a' : '#ffffff';
  const fieldSurfaceBackground = isDark ? '#1e293b' : '#ffffff';
  const [activeDocumentKind, setActiveDocumentKind] =
    useState<DocumentKind>('기안서');
  const [composerTitle, setComposerTitle] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);

  const handleAttachmentSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files ?? []);
    if (nextFiles.length > 0) {
      setAttachments((current) => [...current, ...nextFiles]);
    }
    event.target.value = '';
  };

  const closeComposer = useCallback(() => {
    setComposerTitle('');
    setAttachments([]);
    editor?.commands.clearContent();
    onClose();
  }, [editor, onClose]);

  return {
    activeDocumentKind,
    setActiveDocumentKind,
    composerTitle,
    setComposerTitle,
    attachments,
    setAttachments,
    attachmentInputRef,
    editor,
    setEditor,
    handleAttachmentSelect,
    closeComposer,
    editorSurfaceBackground,
    fieldSurfaceBackground,
  };
}
