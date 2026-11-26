import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { DocumentReferenceParticipants } from '../src/pages/groupware/documents/write/components/DocumentReferenceParticipants';
import type { DocumentApprovalLine } from '../src/pages/groupware/documents/write/types/documentWrite.types';

const makeLines = (count: number): DocumentApprovalLine[] =>
  Array.from({ length: count }, (_, index) => ({
    electronicApprovalLineId: index + 1,
    stageOrder: 1,
    participantOrder: index + 1,
    participantType: 'REFERENCE',
    participantUserId: String(index + 1),
    participantName: `사원${index + 1}`,
    participantDepartmentName: index % 2 === 0 ? '영업팀' : '개발팀',
    actionStatus: index < 4 ? 'CONFIRMED' : null,
  })) as unknown as DocumentApprovalLine[];

describe('DocumentReferenceParticipants', () => {
  it('5명 이하는 접힘 없이 모두 표시한다', () => {
    render(<DocumentReferenceParticipants lines={makeLines(5)} />);
    expect(screen.getAllByTestId(/^approval-line-reference-participant-/)).toHaveLength(5);
    expect(screen.queryByTestId('approval-line-reference-toggle')).toBeNull();
  });

  it('100명은 요약과 앞 5명만 보이고 펼치면 부서별로 보인다', () => {
    render(<DocumentReferenceParticipants lines={makeLines(100)} />);
    expect(screen.queryByTestId('approval-line-reference-summary')).toBeNull();
    expect(screen.getByTestId('approval-line-reference-toggle')).toHaveTextContent('전체 100명 보기');
    expect(screen.getAllByTestId(/^approval-line-reference-participant-/)).toHaveLength(5);
    fireEvent.click(screen.getByTestId('approval-line-reference-toggle'));
    expect(screen.getByText('개발팀 (50)')).toBeInTheDocument();
    expect(screen.getByText('영업팀 (50)')).toBeInTheDocument();
    expect(screen.getAllByTestId(/^approval-line-reference-participant-/)).toHaveLength(100);
    fireEvent.click(screen.getByTestId('approval-line-reference-toggle'));
    expect(screen.getAllByTestId(/^approval-line-reference-participant-/)).toHaveLength(5);
  });
});
