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
  it('shows the sidebar module selector and submenu tree without sales', async () => {
    render(<App />);

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

    expect(
      await screen.findByRole('heading', { name: /대시보드/i }),
    ).toBeInTheDocument();
    expect(document.body).toHaveTextContent(/ERP/i);
    expect(await screen.findByText(/모듈 선택/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /그룹웨어/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /영업관리/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /그룹웨어/i }));

    expect(
      await screen.findByRole('treeitem', { name: /^전자결재$/i }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('treeitem', { name: /^공지사항$/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('treeitem', { name: /^공지사항$/i }));

    expect(
      await screen.findByRole('heading', { name: /^공지사항$/i }),
    ).toBeInTheDocument();
  });

  it('toggles a menu group without navigating and routes from a leaf menu', async () => {
    render(<App />);
    await loginAsAdmin();

    expect(screen.getByRole('tree')).toBeInTheDocument();
    expect(
      screen.getByRole('treeitem', { name: /^전자결재$/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText(/^업무관리$/i));

    expect(
      screen.getByRole('heading', { name: /^전자결재$/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: /업무관리/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    );

    fireEvent.click(screen.getByText(/^업무관리$/i));
    fireEvent.click(screen.getByRole('treeitem', { name: /^공지사항$/i }));

    expect(
      await screen.findByRole('heading', { name: /^공지사항$/i }),
    ).toBeInTheDocument();
  });

  it('expands the selected leaf menu ancestors on direct dashboard navigation', async () => {
    window.localStorage.setItem(
      's-erp-auth',
      JSON.stringify({
        tenantCode: 'A001',
        userId: 'admin',
        accessToken: 'mock-token',
        expiresAt: '2026-08-28T00:00:00.000Z',
      }),
    );
    window.history.pushState({}, '', '/dashboard/groupware/notice');

    render(<App />);

    expect(
      await screen.findByRole('heading', { name: /^공지사항$/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: /업무관리/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(
      screen.getByRole('treeitem', { name: /^공지사항$/i }),
    ).toHaveAttribute('aria-checked', 'true');
  });
});
