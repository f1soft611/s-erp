import { useCallback, useEffect, useMemo, useState } from 'react';
import ClearIcon from '@mui/icons-material/Clear';
import { Box, Button, IconButton, TextField, Typography } from '@mui/material';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import type { F1GridDataSource } from '../../../../shared/components/f1-grid/types/grid.types';
import {
  toPageSearchFields,
  type PageSearchFieldValue,
} from '../../../../shared/components/page-search/searchFields';
import { PageAreaOverlay } from '../../../../shared/components/view-mode/PageAreaOverlay';
import { usePageSessionState } from '../../../../shared/hooks/usePageSessionState';
import type {
  ModuleItem,
  PageContent,
} from '../../../dashboard/types/dashboard';
import { DocumentApprovalDetailFeed } from '../write/components/DocumentApprovalDetailFeed';
import { DocumentComposerDialog } from '../write/components/DocumentComposerDialog';
import type { DocumentApprovalDetail } from '../write/types/documentWrite.types';
import { createDocumentStatusDataSource } from './services/documentStatus.service';
import type {
  DocumentStatusFilters,
  DocumentStatusRow,
} from './types/documentStatus.types';
import {
  createDocumentStatusColumns,
  DocumentStatusGrid,
} from './components/DocumentStatusGrid';

const DOCUMENT_TYPES = new Set<string>([
  'DRAFTING',
  'BUSINESS_CONTACT',
  'EXPENSE_RESOLUTION',
  'ATTENDANCE_APPLICATION',
]);
const DOCUMENT_STATUSES = new Set<string>([
  'DRAFT',
  'PENDING',
  'IN_PROGRESS',
  'REVISION_REQUESTED',
  'COMPLETED',
  'REJECTED',
]);
const PARTICIPANT_TYPES = new Set<string>([
  'DRAFTER',
  'APPROVAL',
  'AGREEMENT',
  'REFERENCE',
]);
const ACTION_STATUSES = new Set<string>([
  'WAITING',
  'PENDING',
  'APPROVED',
  'REJECTED',
  'RETURNED',
]);
const DOCUMENT_STATUS_SESSION_KEY = 's-erp:page:document-status';
const DOCUMENT_STATUS_SESSION_VERSION = 1;

type DocumentStatusSearchSession = {
  keyword: string;
  detailValues: Record<string, PageSearchFieldValue>;
};

type DocumentStatusPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPageSearchFieldValue(value: unknown): value is PageSearchFieldValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return true;
  }
  if (typeof value === 'number') return Number.isFinite(value);
  if (!isRecord(value)) return false;
  return (
    Object.keys(value).every((key) => key === 'from' || key === 'to') &&
    (value.from === undefined || typeof value.from === 'string') &&
    (value.to === undefined || typeof value.to === 'string')
  );
}

function isDocumentStatusSearchSession(
  value: unknown,
): value is DocumentStatusSearchSession {
  return (
    isRecord(value) &&
    typeof value.keyword === 'string' &&
    isRecord(value.detailValues) &&
    Object.values(value.detailValues).every(isPageSearchFieldValue)
  );
}

function cloneDetailValues(
  values: Record<string, PageSearchFieldValue>,
): Record<string, PageSearchFieldValue> {
  return Object.fromEntries(
    Object.entries(values).map(([field, value]) => [
      field,
      value !== null && typeof value === 'object' ? { ...value } : value,
    ]),
  );
}

function formatLocalDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getDefaultSubmittedAtRange(now: Date = new Date()) {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDayOfPreviousMonth = new Date(
    previousMonth.getFullYear(),
    previousMonth.getMonth() + 1,
    0,
  ).getDate();
  const start = new Date(
    previousMonth.getFullYear(),
    previousMonth.getMonth(),
    Math.min(now.getDate(), lastDayOfPreviousMonth),
  );
  return { from: formatLocalDate(start), to: formatLocalDate(end) };
}

function readTextValue(
  values: Record<string, PageSearchFieldValue>,
  field: string,
): string | undefined {
  const value = values[field];
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const normalized = String(value).trim();
  return normalized || undefined;
}

function readDateRange(
  values: Record<string, PageSearchFieldValue>,
  field: string,
): { from?: string; to?: string } {
  const value = values[field];
  if (!value || typeof value !== 'object') return {};
  const from = value.from?.trim();
  const to = value.to?.trim();
  return {
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  };
}

function isDocumentType(
  value: string,
): value is NonNullable<DocumentStatusFilters['documentType']> {
  return DOCUMENT_TYPES.has(value);
}

function isDocumentStatus(
  value: string,
): value is NonNullable<DocumentStatusFilters['documentStatus']> {
  return DOCUMENT_STATUSES.has(value);
}

function isParticipantType(
  value: string,
): value is NonNullable<DocumentStatusFilters['myParticipantType']> {
  return PARTICIPANT_TYPES.has(value);
}

function isActionStatus(
  value: string,
): value is NonNullable<DocumentStatusFilters['myActionStatus']> {
  return ACTION_STATUSES.has(value);
}

function toDocumentStatusFilters(
  keyword: string,
  values: Record<string, PageSearchFieldValue>,
): DocumentStatusFilters {
  const filters: DocumentStatusFilters = {};
  const normalizedKeyword = keyword.trim();
  if (normalizedKeyword) filters.keyword = normalizedKeyword;

  const electronicApprovalId = readTextValue(values, 'electronicApprovalId');
  const title = readTextValue(values, 'title');
  const documentType = readTextValue(values, 'documentType');
  const documentStatus = readTextValue(values, 'documentStatus');
  const drafterName = readTextValue(values, 'drafterName');
  const drafterDepartmentName = readTextValue(values, 'drafterDepartmentName');
  const participantName = readTextValue(values, 'participantName');
  const myParticipantType = readTextValue(values, 'myParticipantType');
  const myActionStatus = readTextValue(values, 'myActionStatus');
  const currentApproverName = readTextValue(values, 'currentApprovalStep');
  const submittedAt = readDateRange(values, 'submittedAt');
  const updatedAt = readDateRange(values, 'updatedAt');

  if (electronicApprovalId) filters.electronicApprovalId = electronicApprovalId;
  if (title) filters.title = title;
  if (documentType && isDocumentType(documentType)) {
    filters.documentType = documentType;
  }
  if (documentStatus && isDocumentStatus(documentStatus)) {
    filters.documentStatus = documentStatus;
  }
  if (drafterName) filters.drafterName = drafterName;
  if (drafterDepartmentName) {
    filters.drafterDepartmentName = drafterDepartmentName;
  }
  if (participantName) filters.participantName = participantName;
  if (myParticipantType && isParticipantType(myParticipantType)) {
    filters.myParticipantType = myParticipantType;
  }
  if (myActionStatus && isActionStatus(myActionStatus)) {
    filters.myActionStatus = myActionStatus;
  }
  if (currentApproverName) filters.currentApproverName = currentApproverName;
  if (submittedAt.from) filters.submittedAtFrom = submittedAt.from;
  if (submittedAt.to) filters.submittedAtTo = submittedAt.to;
  if (updatedAt.from) filters.updatedAtFrom = updatedAt.from;
  if (updatedAt.to) filters.updatedAtTo = updatedAt.to;
  return filters;
}

export function DocumentStatusPage({
  selectedModule,
  currentMenuName,
  content,
}: DocumentStatusPageProps) {
  const columns = useMemo(() => createDocumentStatusColumns(), []);
  const detailFields = useMemo(() => toPageSearchFields(columns), [columns]);
  const defaultSubmittedAtRange = useMemo(
    () => getDefaultSubmittedAtRange(),
    [],
  );
  const initialSession = useMemo<DocumentStatusSearchSession>(
    () => ({
      keyword: '',
      detailValues: { submittedAt: defaultSubmittedAtRange },
    }),
    [defaultSubmittedAtRange],
  );
  const { state: searchSession, setState: setSearchSession } =
    usePageSessionState(DOCUMENT_STATUS_SESSION_KEY, initialSession, {
      version: DOCUMENT_STATUS_SESSION_VERSION,
      validate: isDocumentStatusSearchSession,
    });
  const [keyword, setKeyword] = useState(searchSession.keyword);
  const [detailValues, setDetailValues] = useState<
    Record<string, PageSearchFieldValue>
  >(() => cloneDetailValues(searchSession.detailValues));
  const [appliedFilters, setAppliedFilters] = useState<DocumentStatusFilters>(
    () =>
      toDocumentStatusFilters(
        searchSession.keyword,
        searchSession.detailValues,
      ),
  );
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(
    null,
  );
  const [editingDocument, setEditingDocument] =
    useState<DocumentApprovalDetail | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [detailRefreshToken, setDetailRefreshToken] = useState(0);
  const [totalRowCount, setTotalRowCount] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState('');
  const [retryToken, setRetryToken] = useState(0);

  const baseDataSource = useMemo(
    () => createDocumentStatusDataSource(appliedFilters),
    [appliedFilters, retryToken],
  );
  const dataSource = useMemo<F1GridDataSource<DocumentStatusRow>>(
    () => ({
      pageSize: baseDataSource.pageSize,
      async load(query) {
        const result = await baseDataSource.load(query);
        setTotalRowCount(result.totalRowCount);
        setHasLoaded(true);
        return result;
      },
    }),
    [baseDataSource],
  );

  useEffect(() => {
    setHasLoaded(false);
    setError('');
    setTotalRowCount(0);
    setSelectedDocumentId(null);
  }, [appliedFilters]);

  const applySearch = useCallback(
    (values: Record<string, PageSearchFieldValue> = detailValues) => {
      const snapshot = {
        keyword,
        detailValues: cloneDetailValues(values),
      };
      setSearchSession(snapshot);
      setAppliedFilters(
        toDocumentStatusFilters(snapshot.keyword, snapshot.detailValues),
      );
    },
    [detailValues, keyword, setSearchSession],
  );

  const handleSelectionChange = useCallback(
    (rowIds: Array<string | number>) => {
      const rowId = rowIds[rowIds.length - 1];
      const parsedId = rowId === undefined ? NaN : Number(rowId);
      setSelectedDocumentId(
        Number.isSafeInteger(parsedId) && parsedId > 0 ? parsedId : null,
      );
    },
    [],
  );

  const closeDetail = useCallback(() => {
    setSelectedDocumentId(null);
  }, []);

  const refreshStatusList = useCallback(() => {
    setError('');
    setHasLoaded(false);
    setRetryToken((current) => current + 1);
    setDetailRefreshToken((current) => current + 1);
  }, []);

  const handleEditDocument = useCallback((document: DocumentApprovalDetail) => {
    setEditingDocument(document);
    setIsComposerOpen(true);
  }, []);

  const handleDataSourceError = useCallback((loadError: Error) => {
    setError(loadError.message);
  }, []);

  const handleErrorClose = useCallback(() => {
    setError('');
  }, []);

  const handleRetry = useCallback(() => {
    setHasLoaded(false);
    setError('');
    setRetryToken((current) => current + 1);
  }, []);

  const resetSearch = useCallback(() => {
    const resetDetailValues = { submittedAt: getDefaultSubmittedAtRange() };
    const resetSnapshot = {
      keyword: '',
      detailValues: resetDetailValues,
    };
    setKeyword('');
    setDetailValues(resetDetailValues);
    setSearchSession(resetSnapshot);
    setAppliedFilters(
      toDocumentStatusFilters(
        resetSnapshot.keyword,
        resetSnapshot.detailValues,
      ),
    );
  }, [setSearchSession]);

  return (
    <Box
      sx={{
        flex: 1,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      <PageHeader
        breadcrumbItems={[selectedModule.name, currentMenuName]}
        description={content.description}
      />
      <PageSearchArea
        searchField={
          <TextField
            size="small"
            margin="none"
            placeholder="문서번호/제목/기안자 검색"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            slotProps={{
              htmlInput: { 'aria-label': '문서현황 빠른 검색' },
              input: {
                endAdornment: keyword ? (
                  <IconButton
                    type="button"
                    size="small"
                    edge="end"
                    aria-label="문서현황 검색어 초기화"
                    onClick={() => setKeyword('')}
                    sx={{ p: 0.25 }}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                ) : null,
              },
            }}
            sx={{ width: '100%', height: 40 }}
          />
        }
        onDefaultSearch={() => applySearch()}
        detailFields={detailFields}
        detailValues={detailValues}
        onDetailValuesChange={setDetailValues}
        onDetailSearch={applySearch}
        detailLoading={false}
      >
        {/* <Button
          type="button"
          variant="contained"
          size="small"
          startIcon={<SearchIcon fontSize="small" />}
          onClick={() => applySearch()}
          sx={{ minHeight: 40, whiteSpace: 'nowrap' }}
        >
          검색
        </Button> */}
      </PageSearchArea>
      <PageMessageArea message={error} onClose={handleErrorClose} />
      {error ? (
        <Box sx={{ px: { xs: 1.5, sm: 3 }, pb: 1 }}>
          <Button
            type="button"
            size="small"
            onClick={handleRetry}
            aria-label="문서현황 다시 조회"
          >
            다시 조회
          </Button>
        </Box>
      ) : null}
      <Box
        sx={{
          px: { xs: 1, sm: 2 },
          pb: 2,
          pt: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          flex: 1,
          minHeight: 360,
          minWidth: 0,
        }}
      >
        <Box sx={{ flex: 1, minHeight: 320, minWidth: 0, overflow: 'hidden' }}>
          <DocumentStatusGrid
            dataSource={dataSource}
            onSelectionChange={handleSelectionChange}
            onDataSourceError={handleDataSourceError}
          />
        </Box>
        {hasLoaded && totalRowCount === 0 && !error ? (
          <Box
            role="status"
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              px: 2,
              py: 1.5,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              조회 결과가 없습니다. 조회 기간을 넓히거나 상세검색 조건을
              초기화해 주세요.
            </Typography>
            <Button type="button" size="small" onClick={resetSearch}>
              검색 조건 초기화
            </Button>
          </Box>
        ) : null}
      </Box>
      {selectedDocumentId !== null ? (
        <PageAreaOverlay onClose={closeDetail}>
          <DocumentApprovalDetailFeed
            open
            electronicApprovalId={selectedDocumentId}
            onClose={closeDetail}
            onActionComplete={refreshStatusList}
            onEditDocument={handleEditDocument}
            detailRefreshToken={detailRefreshToken}
          />
        </PageAreaOverlay>
      ) : null}
      <DocumentComposerDialog
        open={isComposerOpen}
        initialDocument={editingDocument}
        onClose={() => {
          setIsComposerOpen(false);
          setEditingDocument(null);
          refreshStatusList();
        }}
      />
    </Box>
  );
}
