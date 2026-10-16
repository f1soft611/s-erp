import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDocumentWritePage } from '../src/pages/groupware/documents/write/hooks/useDocumentWritePage';
import {
  getDocumentApprovalSummary,
  listDocumentApprovals,
} from '../src/pages/groupware/documents/write/services/documentApproval.service';
import type {
  DocumentApprovalRecord,
  DocumentApprovalSummary,
} from '../src/pages/groupware/documents/write/types/documentWrite.types';

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

const emptySummary: DocumentApprovalSummary = {
  actionRequiredCount: 0,
  inProgressCount: 0,
  draftCount: 0,
  completedCount: 0,
  revisionRequestedCount: 0,
  rejectedCount: 0,
  notices: [],
};

describe('useDocumentWritePage date metadata', () => {
  beforeEach(() => {
    vi.mocked(listDocumentApprovals).mockResolvedValue([]);
  });

  it.each([
    {
      submittedAt: record.submittedAt,
      updatedAt: record.updatedAt,
      createdAt: record.createdAt,
      expectedDate: '2026.10.14',
      expectedLabel: '상신일',
    },
    {
      submittedAt: null,
      updatedAt: record.updatedAt,
      createdAt: record.createdAt,
      expectedDate: '2026.10.16',
      expectedLabel: '수정일',
    },
    {
      submittedAt: '',
      updatedAt: null,
      createdAt: record.createdAt,
      expectedDate: '2026.10.12',
      expectedLabel: '작성일',
    },
    {
      submittedAt: null,
      updatedAt: undefined,
      createdAt: record.createdAt,
      expectedDate: '2026.10.12',
      expectedLabel: '작성일',
    },
  ])(
    'maps the preferred date for submittedAt=$submittedAt, updatedAt=$updatedAt',
    async ({
      submittedAt,
      updatedAt,
      createdAt,
      expectedDate,
      expectedLabel,
    }) => {
      const dateRecord = { ...record, submittedAt, updatedAt, createdAt };
      vi.mocked(listDocumentApprovals).mockResolvedValue([dateRecord]);
      vi.mocked(getDocumentApprovalSummary).mockResolvedValue({
        actionRequiredCount: 1,
        inProgressCount: 1,
        draftCount: 0,
        completedCount: 0,
        revisionRequestedCount: 0,
        rejectedCount: 0,
        notices: [dateRecord],
      });
      const { result } = renderHook(() => useDocumentWritePage());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.unpinnedDocuments[0]).toMatchObject({
        date: expectedDate,
        dateSourceLabel: expectedLabel,
      });
      expect(result.current.notices[0]).toMatchObject({
        author: record.drafterName,
        kind: '기안서',
        status: '결재진행중',
        submittedDate: submittedAt ? '2026.10.14' : '',
        date: expectedDate,
        dateSourceLabel: expectedLabel,
      });
    });

  describe('useDocumentWritePage filter reset', () => {
    beforeEach(() => {
      vi.mocked(listDocumentApprovals).mockResolvedValue([]);
      vi.mocked(getDocumentApprovalSummary).mockResolvedValue(emptySummary);
    });

    it('resets the scope and kind and reloads the unfiltered list', async () => {
      const { result } = renderHook(() => useDocumentWritePage());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.selectScope('IN_PROGRESS');
        result.current.setSelectedKind('업무연락');
      });
      await waitFor(() =>
        expect(listDocumentApprovals).toHaveBeenLastCalledWith(
          'IN_PROGRESS',
          'BUSINESS_CONTACT',
          undefined,
        ),
      );
      expect(result.current.hasActiveFilters).toBe(true);

      act(() => result.current.resetFilters());
      await waitFor(() =>
        expect(listDocumentApprovals).toHaveBeenLastCalledWith(
          'ALL',
          undefined,
          undefined,
        ),
      );
      expect(result.current.scope).toBe('ALL');
      expect(result.current.selectedKind).toBe('');
      expect(result.current.hasActiveFilters).toBe(false);
    });

    it('clears a specific document selection', async () => {
      const { result } = renderHook(() => useDocumentWritePage());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => result.current.selectNotice(42));
      await waitFor(() =>
        expect(listDocumentApprovals).toHaveBeenLastCalledWith(
          'ALL',
          undefined,
          42,
        ),
      );
      expect(result.current.hasActiveFilters).toBe(true);

      act(() => result.current.resetFilters());
      await waitFor(() =>
        expect(listDocumentApprovals).toHaveBeenLastCalledWith(
          'ALL',
          undefined,
          undefined,
        ),
      );
      expect(result.current.hasActiveFilters).toBe(false);
    });
  });
});
