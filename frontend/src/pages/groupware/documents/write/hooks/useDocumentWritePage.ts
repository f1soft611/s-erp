import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CommonViewMode } from '../../../../../shared/components/view-mode/commonViewTypes';
import { fetchMyProfile } from '../../../../dashboard/services/profileSettings.service';
import {
  getDocumentApprovalSummary,
  listDocumentApprovals,
} from '../services/documentApproval.service';
import {
  getDocumentApprovalScopeLabel,
  getApprovalStatusPresentation,
  getDocumentKindFromType,
  getDocumentKindPresentation,
} from '../data/documentPresentation';
import { getDocumentDisplayDate } from '../data/documentDate';
import { useDocumentFiles } from './useDocumentFiles';
import type {
  DocumentApprovalFeedRecord,
  DocumentApprovalRecord,
  DocumentApprovalScope,
  DocumentApprovalSummary,
  DocumentFeedWriteItem,
  DocumentKind,
  DocumentWriteItem,
} from '../types/documentWrite.types';

type ActiveDocumentFilterChip = {
  key: 'scope' | 'kind' | 'document';
  label: string;
  deleteLabel: string;
  onDelete: () => void;
};

const documentTypeByKind: Record<DocumentKind, DocumentApprovalRecord['documentType']> = {
  기안서: 'DRAFTING',
  업무연락: 'BUSINESS_CONTACT',
  지출결의서: 'EXPENSE_RESOLUTION',
  근태신청: 'ATTENDANCE_APPLICATION',
};

function formatDate(value?: string | null): string {
  if (!value) return '';
  const date = value.slice(0, 10);
  return date.includes('-') ? date.replaceAll('-', '.') : date;
}

function mapDocument(record: DocumentApprovalRecord): DocumentWriteItem {
  const status = getApprovalStatusPresentation(record.documentStatus, record.documentType);
  const displayDate = getDocumentDisplayDate(record);
  return {
    id: record.electronicApprovalId,
    eabusNo: record.eabusNo,
    title: record.title,
    kind: getDocumentKindFromType(record.documentType),
    status: status.label,
    statusColor: status.color,
    statusVariant: status.variant,
    badgeBorderRadius: '8px',
    documentStatus: record.documentStatus,
    author: record.drafterName,
    date: formatDate(displayDate.value),
    dateSourceLabel: displayDate.sourceLabel,
    submittedDate: formatDate(record.submittedAt),
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
  const [feedEmployeeId, setFeedEmployeeId] = useState('');
  const [feedEmployeeError, setFeedEmployeeError] = useState('');
  const [feedEmployeeRetryToken, setFeedEmployeeRetryToken] = useState(0);
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
  const files = useDocumentFiles(viewMode === 'file', {
    scope,
    documentType: selectedKind ? documentTypeByKind[selectedKind] : undefined,
    electronicApprovalId: selectedDocumentId,
  }, reloadRequest.version);

  useEffect(() => {
    let active = true;
    const isReload = reloadRequest.version !== previousReloadVersion.current;
    const isQuietReload = isReload && reloadRequest.quiet;
    previousReloadVersion.current = reloadRequest.version;
    if (!isQuietReload) setIsLoading(true);
    setLoadError('');
    const documentType = selectedKind
      ? documentTypeByKind[selectedKind]
      : undefined;
    const listRequest =
      viewMode === 'file'
        ? Promise.resolve({ documents: [], feedDocuments: [] })
        : viewMode === 'feed'
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
          if (!isQuietReload) {
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

  useEffect(() => {
    if (viewMode !== 'feed') return;
    let active = true;
    setFeedEmployeeId('');
    setFeedEmployeeError('');
    void fetchMyProfile()
      .then((profile) => {
        const employeeId = String(profile?.employeeId ?? '').trim();
        if (!employeeId) {
          throw new Error('로그인 사용자의 사원 ID를 확인할 수 없습니다.');
        }
        if (active) setFeedEmployeeId(employeeId);
      })
      .catch((error: unknown) => {
        if (active) {
          setFeedEmployeeError(
            error instanceof Error
              ? error.message
              : '로그인 사용자의 사원 정보를 불러오지 못했습니다.',
          );
        }
      });

    return () => {
      active = false;
    };
  }, [feedEmployeeRetryToken, viewMode]);

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
      unpinnedDocuments.map((item) => {
        const kind = getDocumentKindPresentation(item.kind);
        return {
          id: item.id,
          title: item.title,
          authorLabel: item.author,
          dateLabel: item.date,
          categoryLabel: kind.label,
          categoryColor: kind.color,
          statusLabel: item.status,
          statusColor: item.statusColor,
          statusVariant: item.statusVariant,
          badgeBorderRadius: item.badgeBorderRadius,
          summary: item.summary,
        };
      }),
    [unpinnedDocuments],
  );

  const selectScope = useCallback((nextScope: DocumentApprovalScope) => {
    setSelectedDocumentId(undefined);
    setScope(nextScope);
  }, []);
  const clearScopeFilter = useCallback(() => {
    setScope('ALL');
  }, []);
  const clearKindFilter = useCallback(() => {
    setSelectedKind('');
  }, []);
  const clearDocumentFilter = useCallback(() => {
    setSelectedDocumentId(undefined);
  }, []);
  const selectNotice = useCallback((documentId: number) => {
    setSelectedKind('');
    setScope('ALL');
    setSelectedDocumentId(documentId);
  }, []);
  const retry = useCallback(() => refresh(), [refresh]);
  const retryFeedEmployee = useCallback(
    () => setFeedEmployeeRetryToken((token) => token + 1),
    [],
  );
  const openDetail = useCallback((documentId: number) => {
    setDetailDocumentId(documentId);
  }, []);
  const closeDetail = useCallback(() => setDetailDocumentId(null), []);

  const activeFilterChips = useMemo<ActiveDocumentFilterChip[]>(() => {
    const chips: ActiveDocumentFilterChip[] = [];
    if (scope !== 'ALL') {
      const label = getDocumentApprovalScopeLabel(scope);
      chips.push({
        key: 'scope',
        label: `#${label}`,
        deleteLabel: `결재 범위 필터 ${label} 취소`,
        onDelete: clearScopeFilter,
      });
    }
    if (selectedKind) {
      chips.push({
        key: 'kind',
        label: `#${selectedKind}`,
        deleteLabel: `업무구분 필터 ${selectedKind} 취소`,
        onDelete: clearKindFilter,
      });
    }
    if (selectedDocumentId !== undefined) {
      const documentTitle =
        summary?.notices
          .find((record) => record.electronicApprovalId === selectedDocumentId)
          ?.title.trim() || `문서 ${selectedDocumentId}`;
      chips.push({
        key: 'document',
        label: `#${documentTitle}`,
        deleteLabel: `문서 필터 ${documentTitle} 취소`,
        onDelete: clearDocumentFilter,
      });
    }
    return chips;
  }, [
    clearDocumentFilter,
    clearKindFilter,
    clearScopeFilter,
    scope,
    selectedDocumentId,
    selectedKind,
    summary,
  ]);

  return {
    files,
    viewMode,
    setViewMode,
    selectedKind,
    setSelectedKind,
    activeFilterChips,
    clearScopeFilter,
    clearKindFilter,
    clearDocumentFilter,
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
    feedEmployeeId,
    feedEmployeeError,
    retryFeedEmployee,
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
