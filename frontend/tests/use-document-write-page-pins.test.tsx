import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDocumentWritePage } from '../src/pages/groupware/documents/write/hooks/useDocumentWritePage';
import {
  getDocumentApprovalSummary,
  listDocumentApprovals,
  listPinnedDocumentApprovals,
  pinDocumentApproval,
  unpinDocumentApproval,
} from '../src/pages/groupware/documents/write/services/documentApproval.service';

vi.mock('../src/pages/groupware/documents/write/services/documentApproval.service', () => ({
  getDocumentApprovalSummary: vi.fn(),
  listDocumentApprovals: vi.fn(),
  listPinnedDocumentApprovals: vi.fn(),
  pinDocumentApproval: vi.fn(),
  unpinDocumentApproval: vi.fn(),
}));

const documentA = {
  electronicApprovalId: 41,
  eabusNo: '001',
  documentType: 'DRAFTING' as const,
  documentStatus: 'PENDING' as const,
  title: '고정 문서',
  drafterName: '작성자',
  createdAt: '2026-10-10T00:00:00',
  updatedAt: '2026-10-11T00:00:00',
  submittedAt: '2026-10-12T00:00:00',
  summary: '요약',
};

const documentB = {
  ...documentA,
  electronicApprovalId: 42,
  title: '일반 문서',
};

describe('useDocumentWritePage pins', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDocumentApprovalSummary).mockResolvedValue({
      actionRequiredCount: 0,
      inProgressCount: 0,
      draftCount: 0,
      completedCount: 0,
      revisionRequestedCount: 0,
      rejectedCount: 0,
      notices: [],
    });
    vi.mocked(listPinnedDocumentApprovals).mockResolvedValue([documentA]);
    vi.mocked(listDocumentApprovals).mockResolvedValue({
      resultList: [documentA, documentB],
      totalRowCount: 2,
    } as never);
    vi.mocked(pinDocumentApproval).mockResolvedValue({
      electronicApprovalId: 42,
      pinned: true,
    });
    vi.mocked(unpinDocumentApproval).mockResolvedValue({
      electronicApprovalId: 41,
      pinned: false,
    });
  });

  it('keeps pinned documents separate from ordinary documents without duplication', async () => {
    const { result } = renderHook(() => useDocumentWritePage());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.pinnedDocuments).toHaveLength(1);
    expect(result.current.pinnedDocuments[0]?.id).toBe(41);
    expect(result.current.unpinnedDocuments).toHaveLength(1);
    expect(result.current.unpinnedDocuments[0]?.id).toBe(42);
  });

  it('toggles pin state through authenticated pin APIs and clears pending state', async () => {
    const { result } = renderHook(() => useDocumentWritePage());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.togglePin(42, false);
    });
    expect(pinDocumentApproval).toHaveBeenCalledWith(42);
    expect(result.current.isPinPending(42)).toBe(false);

    await act(async () => {
      await result.current.togglePin(41, true);
    });
    expect(unpinDocumentApproval).toHaveBeenCalledWith(41);
    expect(result.current.isPinPending(41)).toBe(false);
  });
});
