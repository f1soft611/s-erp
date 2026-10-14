import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CommonViewMode } from '../../../../../shared/components/view-mode/commonViewTypes';
import {
  getDocumentApprovalSummary,
  listDocumentApprovals,
} from '../services/documentApproval.service';
import type {
  ApprovalDocumentStatus,
  DocumentApprovalFeedRecord,
  DocumentApprovalRecord,
  DocumentApprovalScope,
  DocumentApprovalSummary,
  DocumentFeedWriteItem,
  DocumentKind,
  DocumentWriteItem,
} from '../types/documentWrite.types';

const documentTypeByKind: Record<DocumentKind, DocumentApprovalRecord['documentType']> = {
  기안서: 'DRAFTING',
  업무연락: 'BUSINESS_CONTACT',
  지출결의서: 'EXPENSE_RESOLUTION',
  근태신청: 'ATTENDANCE_APPLICATION',
};

const kindByDocumentType: Record<DocumentApprovalRecord['documentType'], DocumentKind> = {
  DRAFTING: '기안서',
  BUSINESS_CONTACT: '업무연락',
  EXPENSE_RESOLUTION: '지출결의서',
  ATTENDANCE_APPLICATION: '근태신청',
};

const statusLabelByCode: Record<ApprovalDocumentStatus, DocumentWriteItem['status']> = {
  DRAFT: '임시저장',
  PENDING: '결재대기',
  IN_PROGRESS: '결재중',
  REVISION_REQUESTED: '보완요청',
  COMPLETED: '완료',
  REJECTED: '반려',
};

function formatDate(value?: string | null): string {
  if (!value) return '';
  const date = value.slice(0, 10);
  return date.includes('-') ? date.replaceAll('-', '.') : date;
}

function mapDocument(record: DocumentApprovalRecord): DocumentWriteItem {
  return {
    id: record.electronicApprovalId,
    eabusNo: record.eabusNo,
    title: record.title,
    kind: kindByDocumentType[record.documentType],
    status: statusLabelByCode[record.documentStatus],
    documentStatus: record.documentStatus,
    author: record.drafterName,
    date: formatDate(record.submittedAt ?? record.updatedAt ?? record.createdAt),
    summary: record.summary,
  };
}

function mapFeedDocument(
  record: DocumentApprovalFeedRecord,
): DocumentFeedWriteItem {
  return {
    ...mapDocument(record),
    feedData: record,
  };
}

export function useDocumentWritePage() {
  const [viewMode, setViewMode] = useState<CommonViewMode>('list');
  const [selectedKind, setSelectedKind] = useState<DocumentKind | ''>('');
  const [scope, setScope] = useState<DocumentApprovalScope>('ALL');
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | undefined>();
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [documents, setDocuments] = useState<DocumentWriteItem[]>([]);
  const [feedDocuments, setFeedDocuments] = useState<DocumentFeedWriteItem[]>([]);
  const [summary, setSummary] = useState<DocumentApprovalSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadRequest, setReloadRequest] = useState({ version: 0, quiet: false });
  const previousReloadVersion = useRef(0);
  const [detailDocumentId, setDetailDocumentId] = useState<number | null>(null);
  const openComposer = useCallback(() => setIsComposerOpen(true), []);
  const closeComposer = useCallback(() => setIsComposerOpen(false), []);
  const refresh = useCallback(({ quiet = false }: { quiet?: boolean } = {}) => {
    setReloadRequest((current) => ({
      version: current.version + 1,
      quiet,
    }));
  }, []);

  useEffect(() => {
    let active = true;
    const isReload = reloadRequest.version !== previousReloadVersion.current;
    previousReloadVersion.current = reloadRequest.version;
    if (!isReload || !reloadRequest.quiet) setIsLoading(true);
    setLoadError('');
    const documentType = selectedKind
      ? documentTypeByKind[selectedKind]
      : undefined;
    const listRequest =
      viewMode === 'feed'
        ? listDocumentApprovals(
            scope,
            documentType,
            selectedDocumentId,
            true,
          ).then((records) => {
            const mappedRecords = records.map(mapFeedDocument);
            return {
              documents: mappedRecords,
              feedDocuments: mappedRecords,
            };
          })
        : listDocumentApprovals(
            scope,
            documentType,
            selectedDocumentId,
          ).then((records) => ({
            documents: records.map(mapDocument),
            feedDocuments: [] as DocumentFeedWriteItem[],
          }));
    void Promise.all([
      listRequest,
      getDocumentApprovalSummary(),
    ])
      .then(([nextDocuments, nextSummary]) => {
        if (!active) return;
        setDocuments(nextDocuments.documents);
        setFeedDocuments(nextDocuments.feedDocuments);
        setSummary(nextSummary);
      })
      .catch((error: unknown) => {
        if (active) {
          if (!reloadRequest.quiet) {
            setDocuments([]);
            setFeedDocuments([]);
          }
          setLoadError(
            error instanceof Error
              ? error.message
              : '전자결재 문서를 불러오지 못했습니다.',
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadRequest, scope, selectedDocumentId, selectedKind, viewMode]);

  const pinnedDocuments = useMemo(
    () => documents.filter((item) => item.isPinned),
    [documents],
  );
  const unpinnedDocuments = useMemo(
    () => documents.filter((item) => !item.isPinned),
    [documents],
  );
  const orderedFeedDocuments = useMemo(
    () => [
      ...feedDocuments.filter((item) => item.isPinned),
      ...feedDocuments.filter((item) => !item.isPinned),
    ],
    [feedDocuments],
  );
  const pinnedViewItems = useMemo(
    () =>
      pinnedDocuments.map((item) => ({
        id: item.id,
        title: item.title,
        authorLabel: item.author,
        dateLabel: item.date,
        isPinned: item.isPinned,
      })),
    [pinnedDocuments],
  );
  const unpinnedViewItems = useMemo(
    () =>
      unpinnedDocuments.map((item) => ({
        id: item.id,
        title: item.title,
        authorLabel: item.author,
        dateLabel: item.date,
        categoryLabel: item.kind,
        statusLabel: item.status,
        summary: item.summary,
      })),
    [unpinnedDocuments],
  );

  const selectScope = useCallback((nextScope: DocumentApprovalScope) => {
    setSelectedDocumentId(undefined);
    setScope(nextScope);
  }, []);
  const selectNotice = useCallback((documentId: number) => {
    setSelectedKind('');
    setScope('ALL');
    setSelectedDocumentId(documentId);
  }, []);
  const retry = useCallback(() => refresh(), [refresh]);
  const openDetail = useCallback((documentId: number) => {
    setDetailDocumentId(documentId);
  }, []);
  const closeDetail = useCallback(() => setDetailDocumentId(null), []);

  return {
    viewMode,
    setViewMode,
    selectedKind,
    setSelectedKind,
    isComposerOpen,
    openComposer,
    closeComposer,
    pinnedDocuments,
    unpinnedDocuments,
    feedDocuments: orderedFeedDocuments,
    pinnedViewItems,
    unpinnedViewItems,
    summary,
    notices: (summary?.notices ?? []).map(mapDocument),
    isLoading,
    loadError,
    retry,
    scope,
    selectScope,
    selectNotice,
    openDetail,
    closeDetail,
    detailDocumentId,
    refresh,
  };
}
