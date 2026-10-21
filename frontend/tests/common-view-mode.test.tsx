import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FeedView } from '../src/shared/components/view-mode/FeedView';
import { FeedViewSkeleton } from '../src/shared/components/view-mode/FeedViewSkeleton';
import { ListView } from '../src/shared/components/view-mode/ListView';
import { ListViewSkeleton } from '../src/shared/components/view-mode/ListViewSkeleton';
import { PinnedItemsPanel } from '../src/shared/components/view-mode/PinnedItemsPanel';
import { ContentSplitLayout } from '../src/shared/components/view-mode/ContentSplitLayout';
import { SummaryPanelSkeleton } from '../src/shared/components/view-mode/SummaryPanelSkeleton';
import { ViewModeToggle } from '../src/shared/components/view-mode/ViewModeToggle';
import type { CommonViewItem } from '../src/shared/components/view-mode/commonViewTypes';

const items: CommonViewItem[] = [
  {
    id: 1,
    title: '고정 공지',
    authorLabel: '관리자',
    dateLabel: '2026-09-21 10:00',
    isPinned: true,
    categoryLabel: '시스템',
  },
  {
    id: 2,
    title: '일반 공지',
    authorLabel: '운영팀',
    dateLabel: '2026-09-20 09:00',
  },
];

class ImmediateIntersectionObserver {
  constructor(private readonly callback: (entries: Array<{ isIntersecting: boolean }>) => void) {}

  observe() {
    this.callback([{ isIntersecting: true }]);
  }

  disconnect() {}
}

describe('common notice view mode components', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(['feed', 'list'] as const)(
    'supports opt-in pagination in %s mode',
    (mode) => {
      const onLoadMore = vi.fn();
      const scrollRoot = document.createElement('div');
      vi.stubGlobal('IntersectionObserver', ImmediateIntersectionObserver);

      const pagination = {
        scrollRoot,
        hasNext: true,
        isLoadingMore: false,
        onLoadMore,
      };
      const view = mode === 'feed'
        ? (
            <FeedView
              items={[]}
              renderItem={() => <span>피드 항목</span>}
              pagination={pagination}
            />
          )
        : <ListView items={[]} pagination={pagination} />;

      const { rerender } = render(view);

      expect(onLoadMore).toHaveBeenCalledOnce();
      expect(screen.queryByRole('status', { name: '다음 문서 불러오는 중' }))
        .not.toBeInTheDocument();

      const loadingView = mode === 'feed'
        ? (
            <FeedView
              items={[]}
              renderItem={() => <span>피드 항목</span>}
              pagination={{ ...pagination, isLoadingMore: true }}
            />
          )
        : <ListView items={[]} pagination={{ ...pagination, isLoadingMore: true }} />;
      rerender(loadingView);

      expect(onLoadMore).toHaveBeenCalledOnce();
      expect(screen.getByRole('status', { name: '다음 문서 불러오는 중' }))
        .toBeInTheDocument();
    },
  );

  it('switches between feed and list modes through a callback', () => {
    const onChange = vi.fn();

    render(<ViewModeToggle mode="feed" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: '리스트형 보기' }));

    expect(onChange).toHaveBeenCalledWith('list');
  });

  it('renders pinned items and hides the panel when empty', () => {
    const { rerender } = render(
      <PinnedItemsPanel items={items} ariaLabel="상단 고정 공지" />,
    );

    expect(screen.getByText('고정 공지')).toBeInTheDocument();
    expect(screen.queryByText('일반 공지')).not.toBeInTheDocument();

    rerender(<PinnedItemsPanel items={[]} ariaLabel="상단 고정 공지" />);

    expect(
      screen.queryByRole('region', { name: '상단 고정 공지' }),
    ).not.toBeInTheDocument();
  });

  it('keeps feed and list item rendering separate', () => {
    render(
      <>
        <FeedView
          items={items}
          renderItem={(item) => <span>{item.title}</span>}
        />
        <ListView items={items} />
      </>,
    );

    expect(screen.getAllByText('고정 공지')).toHaveLength(2);
    expect(screen.getByText('관리자')).toBeInTheDocument();
    expect(screen.getByText('2026-09-21 10:00')).toBeInTheDocument();
    expect(screen.getByText('시스템')).toBeInTheDocument();
  });

  it('renders an optional status beside the category label in list mode', () => {
    render(
      <ListView
        items={[
          {
            id: 3,
            title: '결재 문서',
            authorLabel: '작성자',
            dateLabel: '2026-10-02',
            categoryLabel: '기안서',
            statusLabel: '결재진행중',
          },
        ]}
      />,
    );

    const titleRow = screen.getByText('결재 문서').parentElement;
    const documentRow = screen.getByRole('button', { name: /결재 문서/ });
    const badgeLabels = Array.from(
      documentRow.querySelectorAll('.MuiChip-root'),
      (chip) => chip.textContent,
    );
    expect(titleRow).toHaveTextContent('기안서');
    expect(titleRow).toHaveTextContent('결재진행중');
    expect(badgeLabels).toEqual(['기안서', '결재진행중']);
  });

  it('renders status before category when status-first order is requested', () => {
    render(
      <ListView
        badgeOrder="status-category"
        items={[
          {
            id: 5,
            title: '순서 문서',
            authorLabel: '작성자',
            dateLabel: '2026-10-15',
            categoryLabel: '기안서',
            statusLabel: '결재진행중',
          },
        ]}
      />,
    );

    const documentRow = screen.getByRole('button', { name: /순서 문서/ });
    const badgeLabels = Array.from(
      documentRow.querySelectorAll('.MuiChip-root'),
      (chip) => chip.textContent,
    );
    expect(badgeLabels).toEqual(['결재진행중', '기안서']);
  });

  it('renders document status variant and shared badge radius when supplied', () => {
    render(
      <ListView
        items={[
          {
            id: 20,
            title: '진행 문서',
            authorLabel: '작성자',
            dateLabel: '2026-10-14',
            categoryLabel: '기안',
            categoryColor: 'primary',
            statusLabel: '결재진행중',
            statusColor: 'info',
            statusVariant: 'filled',
            badgeBorderRadius: '8px',
          },
        ]}
      />,
    );

    const statusChip = screen.getByText('결재진행중').closest<HTMLElement>('.MuiChip-root');
    const kindChip = screen.getByText('기안').closest<HTMLElement>('.MuiChip-root');
    expect(statusChip).not.toBeNull();
    expect(kindChip).not.toBeNull();
    if (!statusChip || !kindChip) throw new Error('Expected document Chips to render.');
    expect(statusChip).toHaveClass('MuiChip-filled');
    expect(statusChip).toHaveStyle({ borderRadius: '8px' });
    expect(kindChip).toHaveStyle({ borderRadius: '8px' });
  });

  it('keeps default list status styling when document presentation is omitted', () => {
    render(
      <ListView
        items={[
          {
            id: 21,
            title: '일반 항목',
            authorLabel: '작성자',
            dateLabel: '2026-10-14',
            statusLabel: '상태',
          },
        ]}
      />,
    );

    expect(screen.getByText('상태').closest('.MuiChip-root')).toHaveClass(
      'MuiChip-outlined',
    );
  });

  it('uses an optional category color while preserving the default category color', () => {
    render(
      <ListView
        items={[
          {
            id: 4,
            title: '업무 문서',
            authorLabel: '작성자',
            dateLabel: '2026-10-02',
            categoryLabel: '업무',
            categoryColor: 'info',
          },
        ]}
      />,
    );

    expect(screen.getByTestId('list-category-chip')).toHaveClass('MuiChip-colorInfo');
  });

  it('provides mode-specific skeletons', () => {
    render(
      <>
        <FeedViewSkeleton />
        <ListViewSkeleton />
      </>,
    );

    expect(screen.getByTestId('feed-view-skeleton')).toBeInTheDocument();
    expect(screen.getByTestId('list-view-skeleton')).toBeInTheDocument();
  });

  it('renders a sticky summary slot beside the list slot', () => {
    render(
      <ContentSplitLayout
        left={<div>목록 영역</div>}
        right={<div data-testid="summary-slot">요약 영역</div>}
      />,
    );

    expect(screen.getByText('목록 영역')).toBeInTheDocument();
    expect(screen.getByTestId('summary-slot')).toBeInTheDocument();
    expect(screen.getByTestId('view-mode-right-slot')).toHaveStyle({
      position: 'sticky',
    });
  });

  it('renders the summary skeleton for the right slot', () => {
    render(<SummaryPanelSkeleton />);

    expect(screen.getByTestId('summary-panel-skeleton')).toBeInTheDocument();
  });
});
