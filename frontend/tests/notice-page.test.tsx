import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DashboardContent } from '../src/pages/dashboard/components/DashboardContent';
import { NoticeFeedList } from '../src/pages/groupware/community/notice/components/NoticeFeedList';
import { noticeFeed } from '../src/pages/groupware/community/notice/data/noticeData';

describe('Community notice page', () => {
  it('keeps the initial skeleton loading state without showing a preloaded notice list', async () => {
    await act(async () => {
      render(
        <DashboardContent
          selectedModule={{
            id: 'groupware',
            name: '그룹웨어',
            icon: <span aria-hidden="true">G</span>,
            tree: [],
            menus: [],
            path: '/groupware',
          }}
          currentMenuName="공지사항"
          currentPageKey="notice"
          breadcrumbItems={['그룹웨어', '커뮤니티', '공지사항']}
          content={{
            title: '공지사항',
            description: '최근 공지 내용을 빠르게 확인합니다.',
            cards: [],
            items: [],
          }}
        />,
      );
    });

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /새 공지 작성/i }),
      ).toBeInTheDocument();
    });

    expect(screen.getByTestId('notice-feed-skeleton')).toBeInTheDocument();
    expect(
      screen.queryByText(/3분기_업무일정표_v2\.pdf/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /공지사항/i }),
    ).not.toBeInTheDocument();
  });

  it('renders attachment and comment features for a notice feed item', async () => {
    await act(async () => {
      render(
        <NoticeFeedList
          items={[noticeFeed[0]]}
          isDark={false}
          expandedNoticeId={noticeFeed[0].id}
          onToggleExpand={() => undefined}
          onToggleLike={() => undefined}
          onToggleBookmark={() => undefined}
          onAddComment={() => undefined}
          onDelete={() => undefined}
          onEdit={() => undefined}
          onDownload={() => undefined}
        />,
      );
    });

    expect(
      await screen.findByText('3분기_업무일정표_v2.pdf'),
    ).toBeInTheDocument();
    expect(screen.getByText('부서별_협업_일정_안내.hwp')).toBeInTheDocument();
    expect(screen.getAllByText(/댓글/i).length).toBeGreaterThan(0);

    const commentInput = screen.getByLabelText(/댓글 입력/i);
    fireEvent.change(commentInput, { target: { value: '확인했습니다.' } });
    fireEvent.click(screen.getByRole('button', { name: /^등록$/i }));

    expect(screen.getByText('확인했습니다.')).toBeInTheDocument();
  });

  it('opens a composer with title, body, toolbar, and attachment area', async () => {
    render(
      <DashboardContent
        selectedModule={{
          id: 'groupware',
          name: '그룹웨어',
          icon: <span aria-hidden="true">G</span>,
          tree: [],
          menus: [],
          path: '/groupware',
        }}
        currentMenuName="공지사항"
        currentPageKey="notice"
        breadcrumbItems={['그룹웨어', '커뮤니티', '공지사항']}
        content={{
          title: '공지사항',
          description: '최근 공지 내용을 빠르게 확인합니다.',
          cards: [],
          items: [],
        }}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /새 공지 작성/i }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /새 공지 작성/i }));

    expect(screen.getAllByLabelText(/제목/i)[0]).toBeInTheDocument();
    expect(screen.getAllByLabelText(/본문/i)[0]).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /툴바 열기/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /첨부 링크/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /툴바 열기/i }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /^굵게$/i }),
      ).toBeInTheDocument();
    });
  });
});
