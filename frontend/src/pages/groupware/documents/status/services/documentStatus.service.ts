import { apiGet } from '../../../../../shared/services/apiClient';
import type {
  F1GridDataSource,
  F1GridDataSourceQuery,
} from '../../../../../shared/components/f1-grid/types/grid.types';
import type {
  DocumentStatusFilters,
  DocumentStatusPageResponse,
  DocumentStatusRow,
} from '../types/documentStatus.types';

const DOCUMENTS_API = '/api/v1/groupware/approvals/documents';
const DOCUMENT_TYPES = new Set([
  'DRAFTING',
  'BUSINESS_CONTACT',
  'EXPENSE_RESOLUTION',
  'ATTENDANCE_APPLICATION',
]);
const DOCUMENT_STATUSES = new Set([
  'DRAFT',
  'PENDING',
  'IN_PROGRESS',
  'REVISION_REQUESTED',
  'COMPLETED',
  'REJECTED',
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isDateValue(value: unknown): value is string | number | null {
  return (
    value === null ||
    typeof value === 'string' ||
    (typeof value === 'number' && Number.isFinite(value))
  );
}

function normalizeDateValue(
  value: string | number | null | undefined,
): string | null {
  if (value === undefined) return null;
  if (typeof value === 'number') {
    return new Date(value).toISOString();
  }
  return value;
}

function isDocumentStatusRow(value: unknown): value is DocumentStatusRow {
  if (!isObject(value)) return false;
  return (
    Number.isSafeInteger(value.electronicApprovalId) &&
    Number(value.electronicApprovalId) > 0 &&
    typeof value.eabusNo === 'string' &&
    typeof value.title === 'string' &&
    typeof value.documentType === 'string' &&
    DOCUMENT_TYPES.has(value.documentType) &&
    typeof value.documentStatus === 'string' &&
    DOCUMENT_STATUSES.has(value.documentStatus) &&
    (value.drafterDepartmentName === null ||
      typeof value.drafterDepartmentName === 'string') &&
    typeof value.drafterName === 'string' &&
    isDateValue(value.submittedAt) &&
    isDateValue(value.updatedAt) &&
    typeof value.participantName === 'string' &&
    typeof value.approvalProgress === 'string'
  );
}

function validatePageResponse(value: unknown): DocumentStatusPageResponse {
  if (
    !isObject(value) ||
    !Array.isArray(value.resultList) ||
    !value.resultList.every(isDocumentStatusRow) ||
    !Number.isSafeInteger(value.totalRowCount) ||
    Number(value.totalRowCount) < 0
  ) {
    throw new Error('전자결재 문서 검색 응답을 확인할 수 없습니다.');
  }

  return {
    resultList: value.resultList.map((row) => ({
      ...row,
      submittedAt: normalizeDateValue(row.submittedAt),
      updatedAt: normalizeDateValue(row.updatedAt),
    })),
    totalRowCount: Number(value.totalRowCount),
  };
}

function buildPageQuery(
  filters: DocumentStatusFilters,
  query: F1GridDataSourceQuery<DocumentStatusRow>,
): URLSearchParams {
  const params = new URLSearchParams({
    scope: 'ALL',
    offset: String(query.offset),
    limit: String(query.limit),
  });
  const filterEntries = Object.entries(filters) as [
    keyof DocumentStatusFilters,
    string | undefined,
  ][];

  for (const [field, rawValue] of filterEntries) {
    const value = rawValue?.trim();
    if (value) params.set(field, value);
  }

  const sort = query.sorts[0];
  if (sort) {
    const sortField =
      String(sort.field) === 'rowNumber'
        ? 'updatedAt'
        : String(sort.field);
    params.set('sortField', sortField);
    params.set('sortDirection', sort.direction.toUpperCase());
  }

  return params;
}

export function createDocumentStatusDataSource(
  filters: DocumentStatusFilters,
): F1GridDataSource<DocumentStatusRow> {
  return {
    pageSize: 200,
    async load(
      query: F1GridDataSourceQuery<DocumentStatusRow>,
    ): Promise<{ rows: DocumentStatusRow[]; totalRowCount: number }> {
      const params = buildPageQuery(filters, query);
      const response = await apiGet<unknown>(
        `${DOCUMENTS_API}?${params.toString()}`,
        query.signal,
      );
      const page = validatePageResponse(response);
      return {
        rows: page.resultList,
        totalRowCount: page.totalRowCount,
      };
    },
  };
}
