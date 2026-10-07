import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';
import { DocumentApprovalFields } from '../src/pages/groupware/documents/write/components/DocumentApprovalFields';
import type { DocumentApprovalStage } from '../src/pages/groupware/documents/write/types/documentWrite.types';
import { createAppTheme } from '../src/theme/theme';

const agreementUser = {
  value: 'agreement-user',
  label: '합의 사용자',
  positionName: '대리',
};

const approvalStages: DocumentApprovalStage[] = [
  { id: 1, kind: 'agreement', users: [agreementUser] },
];

function renderAgreementChip(mode: 'light' | 'dark') {
  return render(
    <ThemeProvider theme={createAppTheme(mode)}>
      <DocumentApprovalFields
        userOptions={[agreementUser]}
        selectedApprovalUserIds={[]}
        referenceUserIds={[]}
        approvalStages={approvalStages}
        onApprovalUserChange={vi.fn()}
        onReferenceUserChange={vi.fn()}
        onAddApproval={vi.fn()}
        onAddAgreement={vi.fn()}
        onRemoveApprovalUser={vi.fn()}
      />
    </ThemeProvider>,
  );
}

describe('DocumentApprovalFields theme', () => {
  it('keeps the existing gray agreement chip surface in light mode', () => {
    renderAgreementChip('light');

    const chip = screen.getByTestId('document-agreement-chip');

    expect(getComputedStyle(chip).backgroundColor).toBe('rgb(245, 245, 245)');
    expect(getComputedStyle(chip).borderColor).toBe('rgb(224, 224, 224)');
  });

  it('uses a dark slate agreement chip surface in dark mode', () => {
    renderAgreementChip('dark');

    const chip = screen.getByTestId('document-agreement-chip');

    expect(getComputedStyle(chip).backgroundColor).toBe('rgb(51, 65, 85)');
    expect(getComputedStyle(chip).borderColor).toBe('rgba(255, 255, 255, 0.12)');
    expect(getComputedStyle(screen.getByText('합의 사용자')).color).toBe(
      'rgb(226, 232, 240)',
    );
  });
});
