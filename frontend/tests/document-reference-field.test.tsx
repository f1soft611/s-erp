import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { DocumentReferenceField } from '../src/pages/groupware/documents/write/components/DocumentReferenceField';

const users = Array.from({ length: 100 }, (_, index) => ({
  value: String(index + 1),
  label: `사원${index + 1}`,
  departmentName: index % 2 === 0 ? '영업팀' : index % 10 === 1 ? null : '개발팀',
}));

describe('DocumentReferenceField', () => {
  it('100명을 선택해도 칩은 3개와 +N명만 그린다', () => {
    render(
      <DocumentReferenceField
        userOptions={users}
        referenceUserIds={users.map((user) => String(user.value))}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId('user-select-overflow-chip')).toHaveTextContent('+97명');
    expect(screen.getAllByRole('button', { name: /사원\d+/ }).length).toBeLessThanOrEqual(3);
  });

  it('목록 다이얼로그는 부서별로 묶고 개별 삭제·전체 삭제를 지원한다', () => {
    const onChange = vi.fn();
    render(
      <DocumentReferenceField
        userOptions={users}
        referenceUserIds={users.map((user) => String(user.value))}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByTestId('document-reference-list-button'));
    const dialog = screen.getByTestId('document-reference-list-dialog');
    expect(within(dialog).getByText('참조자 100명')).toBeInTheDocument();
    expect(within(dialog).getByText('영업팀 (50)')).toBeInTheDocument();
    expect(within(dialog).getByText('부서없음 (10)')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByLabelText('사원1 삭제'));
    expect(onChange).toHaveBeenLastCalledWith(
      users.slice(1).map((user) => String(user.value)),
    );
    fireEvent.click(within(dialog).getByText('전체 삭제'));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('3명 이하이면 +N명 칩이 없다', () => {
    render(
      <DocumentReferenceField
        userOptions={users}
        referenceUserIds={['1', '2']}
        onChange={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('user-select-overflow-chip')).toBeNull();
  });
});
