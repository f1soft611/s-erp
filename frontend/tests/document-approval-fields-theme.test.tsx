import { render, screen, within } from '@testing-library/react';
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
        onOpenApprovalSettings={vi.fn()}
        onRemoveApprovalUser={vi.fn()}
      />
    </ThemeProvider>,
  );
}

describe('DocumentApprovalFields theme', () => {
  it('renders compact accessible badges, seals, removal actions, and ellipsized names', () => {
    const approvalName = '홍길동김';
    const agreementName = '김민수';
    const longName = '홍길동김철수';
    const users = [
      { value: 'emp-long-1', label: approvalName },
      { value: 'emp-long-3', label: longName },
      { value: 'emp-long-2', label: agreementName },
    ];
    render(
      <DocumentApprovalFields
        userOptions={users}
        selectedApprovalUserIds={[]}
        referenceUserIds={[]}
        approvalStages={[
          { id: 1, kind: 'approval', users: [users[0]], isFixed: true },
          { id: 2, kind: 'approval', users: [users[1]] },
          { id: 3, kind: 'agreement', users: [users[2]] },
        ]}
        onApprovalUserChange={vi.fn()}
        onReferenceUserChange={vi.fn()}
        onAddApproval={vi.fn()}
        onAddAgreement={vi.fn()}
        onOpenApprovalSettings={vi.fn()}
        onRemoveApprovalUser={vi.fn()}
      />,
    );

    const approvals = screen.getAllByTestId('document-approval-person');
    const approval = approvals[0];
    const longApproval = approvals[1];
    const agreement = screen.getByTestId('document-agreement-chip');
    const assertParticipantPresentation = (
      participant: HTMLElement,
      sequence: number,
      fullName: string,
      kind: '결재' | '합의',
    ) => {
      const badge = within(participant).getByText(String(sequence), {
        exact: true,
      });
      expect(badge).toHaveStyle({
        borderStyle: 'solid',
        borderRadius: '50%',
      });
      expect(badge).toHaveAttribute('aria-label', `참여 순번 ${sequence}`);

      if (kind === '결재') {
        expect(
          within(participant).getByLabelText('결재 도장 자리'),
        ).toBeInTheDocument();
      } else {
        expect(
          within(participant).queryByLabelText('합의 도장 자리'),
        ).toBeNull();
      }
      const removeButton = within(participant).queryByRole('button', {
        name: `${kind} 참여자 ${sequence} ${fullName} 삭제`,
      });
      if (kind === '결재') {
        expect(removeButton).toBeNull();
      } else {
        expect(removeButton).toBeInTheDocument();
      }
      const name = within(participant).getByTitle(fullName);
      expect(name).toHaveStyle({
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      });
      if (kind === '결재') {
        expect(participant).toHaveStyle({ minWidth: '88px' });
        expect(name).not.toHaveStyle({ maxWidth: '3em' });
      } else {
        expect(name).toHaveStyle({ maxWidth: '4em' });
      }
      expect(participant.getAttribute('aria-label')).toContain(fullName);
    };

    assertParticipantPresentation(approval, 1, approvalName, '결재');
    assertParticipantPresentation(agreement, 3, agreementName, '합의');
    const truncatedApprovalName = within(longApproval).getByTitle(longName);
    expect(truncatedApprovalName).toHaveStyle({
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    });
    expect(longApproval.getAttribute('aria-label')).toBe(
      `결재 2 ${longName}`,
    );
  });

  it('keeps the agreement chip background transparent in light mode', () => {
    renderAgreementChip('light');

    const chip = screen.getByTestId('document-agreement-chip');

    expect(getComputedStyle(chip).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(chip).borderColor).toBe('rgb(224, 224, 224)');
  });

  it('keeps the agreement chip background transparent in dark mode', () => {
    renderAgreementChip('dark');

    const chip = screen.getByTestId('document-agreement-chip');

    expect(getComputedStyle(chip).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(chip).borderColor).toBe('rgba(255, 255, 255, 0.12)');
    expect(getComputedStyle(screen.getByText('합의 사용자')).color).toBe(
      'rgb(226, 232, 240)',
    );
  });

  it('centers the agreement row label and removes the label top padding', () => {
    renderAgreementChip('light');

    expect(
      getComputedStyle(screen.getByTestId('document-agreement-display-row'))
        .alignItems,
    ).toBe('center');
    expect(getComputedStyle(screen.getByText('합의')).paddingTop).toBe('0');
  });
});
