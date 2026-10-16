import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDocumentWritePage } from '../src/pages/groupware/documents/write/hooks/useDocumentWritePage';
import {
  getDocumentApprovalSummary,
  listDocumentApprovals,
} from '../src/pages/groupware/documents/write/services/documentApproval.service';
import type { DocumentApprovalRecord } from '../src/pages/groupware/documents/write/types/documentWrite.types';

vi.mock('../src/pages/groupware/documents/write/services/documentApproval.service', () => ({
  getDocumentApprovalSummary: vi.fn(),
  listDocumentApprovals: vi.fn(),
}));

const record: DocumentApprovalRecord = {
  electronicApprovalId: 42,
  eabusNo: '001',
  documentType: 'DRAFTING',
  documentStatus: 'IN_PROGRESS',
  title: '검증 문서',
  drafterName: '검증 기안자',
  createdAt: '2026-10-12T09:00:00',
  updatedAt: '2026-10-16T10:00:00',
  submittedAt: '2026-10-14T11:00:00',
  summary: '',
};

describe('useDocumentWritePage notice metadata', () => {
  beforeEach(() => {
    vi.mocked(listDocumentApprovals).mockResolvedValue([]);
  });

  it.each([
    { submittedAt: record.submittedAt, expected: '2026.10.14' },
    { submittedAt: null, expected: '' },
    { submittedAt: undefined, expected: '' },
  ])('maps only submittedAt=$submittedAt into the notice submitted date', async ({ submittedAt, expected }) => {
    vi.mocked(getDocumentApprovalSummary).mockResolvedValue({
      actionRequiredCount: 1,
      inProgressCount: 1,
      draftCount: 0,
      completedCount: 0,
      revisionRequestedCount: 0,
      rejectedCount: 0,
      notices: [{ ...record, submittedAt }],
    });
    const { result } = renderHook(() => useDocumentWritePage());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.notices[0]).toMatchObject({
      author: record.drafterName,
      kind: '기안서',
      status: '결재진행중',
      submittedDate: expected,
      date: submittedAt ? '2026.10.14' : '2026.10.16',
    });
  });
});
