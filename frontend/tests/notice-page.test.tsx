import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DashboardContent } from '../src/pages/dashboard/components/DashboardContent';

describe('Community notice page', () => {
  it('shows the create action from the page header and keeps only the top filter row', () => {
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

    expect(
      screen.getByRole('button', { name: /새 공지 작성/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /공지사항/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText(/검색어를 입력하세요/i),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText(/전체/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/중요 공지/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/운영/i).length).toBeGreaterThan(0);
  });

  it('shows feed-style content with more actions and attachment/comment blocks', () => {
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

    expect(
      screen.getAllByRole('button', { name: /더보기/i }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/3분기_업무일정표_v2\.pdf/i).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/부서별_협업_일정_안내\.hwp/i).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/댓글/i).length).toBeGreaterThan(0);
  });

  it('opens a composer with title, body, toolbar, and attachment area', () => {
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

    fireEvent.click(screen.getByRole('button', { name: /새 공지 작성/i }));

    expect(screen.getAllByLabelText(/제목/i)[0]).toBeInTheDocument();
    expect(screen.getAllByLabelText(/본문/i)[0]).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /굵게/i })).toBeInTheDocument();
    expect(screen.getByText(/이미지 첨부/i)).toBeInTheDocument();
  });
});
