import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApprovalSummaryPanel } from '../src/pages/groupware/documents/write/components/ApprovalSummaryPanel';
import type {
  DocumentApprovalScope,
  DocumentApprovalSummary,
} from '../src/pages/groupware/documents/write/types/documentWrite.types';

describe('ApprovalSummaryPanel reference confirmation', () => {
  it('shows a separate reference-confirmation count and selects its scope', () => {
    const onSelectScope = vi.fn<(scope: DocumentApprovalScope) => void>();
    const summary: DocumentApprovalSummary = {
      actionRequiredCount: 3,
      inProgressCount: 4,
      draftCount: 1,
      completedCount: 0,
      revisionRequestedCount: 0,
      rejectedCount: 0,
      referenceConfirmationRequiredCount: 2,
      notices: [],
      referenceConfirmationItems: [],
    };

    render(
      <ApprovalSummaryPanel
        summary={summary}
        onSelectScope={onSelectScope}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '내가 확인할 문서 2건' }));

    expect(onSelectScope).toHaveBeenCalledWith('MY_REFERENCE_PENDING');
    expect(screen.getByRole('button', { name: '내가 처리할 결재 3건' })).toBeInTheDocument();
  });
});
