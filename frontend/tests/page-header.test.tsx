import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PageHeader } from '../src/shared/components/PageHeader';

describe('PageHeader', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('uses the shared save progress only for the saving action and keeps permissions intact', () => {
    const onSave = vi.fn();
    const view = (saving: boolean) => <PageHeader breadcrumbItems={['설정']} description="설정"
      actionGroups={[{ key: 'write', actions: [
        { label: '저장', saving, savingAriaLabel: '설정 저장 중', onClick: onSave },
        { label: '조회', disabled: saving },
        { label: '숨긴 저장', saving, visible: false },
      ] }]} />;
    const { rerender } = render(view(false));
    fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));
    expect(onSave).toHaveBeenCalledTimes(1);
    rerender(view(true));
    expect(screen.getByRole('progressbar', { name: '설정 저장 중' })).toBeVisible();
    expect(screen.getAllByRole('progressbar')).toHaveLength(1);
    const button = screen.getByRole('button', { name: '저장', exact: true });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(button);
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: '숨긴 저장' })).not.toBeInTheDocument();
    rerender(view(false));
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '저장', exact: true })).toBeEnabled();
  });

  it('설명 영역을 접고 펼친 상태를 브라우저에 저장한다', () => {
    const { unmount } = render(
      <PageHeader
        breadcrumbItems={['그룹웨어', '공지사항']}
        description="공지 설명"
      >
        <div>헤더 하단 영역</div>
      </PageHeader>,
    );

    expect(screen.getByText('공지 설명')).toBeVisible();
    const collapseButton = screen.getByRole('button', {
      name: /페이지 설명 접기/i,
    });
    expect(collapseButton.parentElement).toHaveTextContent('공지사항');
    fireEvent.click(collapseButton);

    expect(screen.queryByText('공지 설명')).not.toBeInTheDocument();
    expect(
      window.localStorage.getItem('page-header-description-collapsed'),
    ).toBe('true');

    unmount();
    render(
      <PageHeader
        breadcrumbItems={['그룹웨어', '문서']}
        description="문서 설명"
      />,
    );

    expect(screen.queryByText('문서 설명')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /페이지 설명 열기/i }),
    ).toBeVisible();
  });
});
