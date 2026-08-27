import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../src/App';

async function loginAsAdmin() {
  fireEvent.change(screen.getByLabelText(/업체코드/i), {
    target: { value: 'A001' },
  });
  fireEvent.change(screen.getByLabelText(/사용자 ID/i), {
    target: { value: 'admin' },
  });
  fireEvent.change(screen.getByLabelText(/비밀번호/i), {
    target: { value: '1234' },
  });
  fireEvent.click(screen.getByRole('button', { name: /로그인/i }));

  await screen.findByRole('heading', { name: /대시보드/i });
}

describe('Dashboard sidebar', () => {
  it('shows only the groupware and settings modules with their menus', async () => {
    render(<App />);
    await loginAsAdmin();

    expect(document.body).toHaveTextContent(/ERP/i);
    expect(await screen.findByText(/모듈 선택/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /그룹웨어/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /환경설정/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /영업관리/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /생산관리/i }),
    ).not.toBeInTheDocument();

    expect(
      await screen.findByRole('treeitem', { name: /^종합현황$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('treeitem', { name: /^문서관리$/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('treeitem', { name: /^문서관리$/i }));

    expect(
      await screen.findByRole('heading', { name: /^문서관리$/i }),
    ).toBeInTheDocument();
  });

  it('switches menus when another module is selected', async () => {
    render(<App />);
    await loginAsAdmin();

    fireEvent.click(screen.getByRole('button', { name: /환경설정/i }));

    expect(
      await screen.findByRole('treeitem', { name: /^권한관리$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('treeitem', { name: /^메뉴관리$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /^권한관리$/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('treeitem', { name: /^메뉴관리$/i }));

    expect(
      await screen.findByRole('heading', { name: /^메뉴관리$/i }),
    ).toBeInTheDocument();
  });

  it('selects the routed leaf menu on direct dashboard navigation', async () => {
    window.localStorage.setItem(
      's-erp-auth',
      JSON.stringify({
        tenantCode: 'A001',
        userId: 'admin',
        accessToken: 'mock-token',
        expiresAt: '2026-08-28T00:00:00.000Z',
      }),
    );
    window.history.pushState({}, '', '/dashboard/groupware/documents');

    render(<App />);

    expect(
      await screen.findByRole('heading', { name: /^문서관리$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('treeitem', { name: /^문서관리$/i }),
    ).toHaveAttribute('aria-checked', 'true');
  });

  it('renders the ERP-style role and menu management screens', async () => {
    render(<App />);
    await loginAsAdmin();

    fireEvent.click(screen.getByRole('button', { name: /환경설정/i }));
    fireEvent.click(screen.getByRole('treeitem', { name: /^권한관리$/i }));

    expect(
      await screen.findByRole('heading', { name: /^권한관리$/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/역할 목록/i)).toBeInTheDocument();
    expect(screen.getAllByText(/ADMIN/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/권한 매핑/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('treeitem', { name: /^메뉴관리$/i }));

    expect(
      await screen.findByRole('heading', { name: /^메뉴관리$/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/메뉴 관리/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/기본정보/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/사용 여부/i).length).toBeGreaterThan(0);
  });
});
