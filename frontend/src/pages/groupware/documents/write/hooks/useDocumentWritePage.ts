import { useCallback, useState } from 'react';
import type { CommonViewMode } from '../../../../../shared/components/view-mode/commonViewTypes';
import { sampleDocuments, statusColor } from '../data/documentWriteData';
import type { DocumentKind } from '../types/documentWrite.types';

export function useDocumentWritePage() {
  const [viewMode, setViewMode] = useState<CommonViewMode>('list');
  const [selectedKind, setSelectedKind] = useState<DocumentKind | ''>('');
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const openComposer = useCallback(() => setIsComposerOpen(true), []);
  const closeComposer = useCallback(() => setIsComposerOpen(false), []);

  const visibleDocuments = sampleDocuments.filter(
    (item) => !selectedKind || item.kind === selectedKind,
  );
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

  return {
    viewMode,
    setViewMode,
    selectedKind,
    setSelectedKind,
    isComposerOpen,
    openComposer,
    closeComposer,
    visibleDocuments,
    pinnedDocuments,
    unpinnedDocuments,
    pinnedViewItems,
    unpinnedViewItems,
  };
}
