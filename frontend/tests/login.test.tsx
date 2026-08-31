import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from '../src/App';

describe('Login page', () => {
  it('renders the enterprise login fields', () => {
    render(<App />);

    expect(screen.getByLabelText(/업체코드/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/사용자 ID/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/비밀번호/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /로그인/i })).toBeInTheDocument();
  });

  it('shows validation errors when required values are missing', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /로그인/i }));

    expect(screen.getByText(/업체코드를 입력해주세요/i)).toBeInTheDocument();
    expect(screen.getByText(/사용자 ID를 입력해주세요/i)).toBeInTheDocument();
    expect(screen.getByText(/비밀번호를 입력해주세요/i)).toBeInTheDocument();
  });

  it('navigates to the dashboard after successful login', async () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText(/업체코드/i), {
      target: { value: 'T1358606250' },
    });
    fireEvent.change(screen.getByLabelText(/사용자 ID/i), {
      target: { value: 'admin' },
    });
    fireEvent.change(screen.getByLabelText(/비밀번호/i), {
      target: { value: 'f1soft@611' },
    });

    fireEvent.click(screen.getByRole('button', { name: /로그인/i }));

    expect(
      await screen.findByRole('heading', { name: /대시보드/i }),
    ).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login-jwt'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('shows an error message when the backend rejects the login', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ resultCode: '300', resultMessage: '로그인 실패' }),
            { status: 200 },
          ),
      ),
    );

    render(<App />);

    fireEvent.change(screen.getByLabelText(/업체코드/i), {
      target: { value: 'T1358606250' },
    });
    fireEvent.change(screen.getByLabelText(/사용자 ID/i), {
      target: { value: 'admin' },
    });
    fireEvent.change(screen.getByLabelText(/비밀번호/i), {
      target: { value: 'wrong-password' },
    });

    fireEvent.click(screen.getByRole('button', { name: /로그인/i }));

    expect(await screen.findByText(/로그인 실패/i)).toBeInTheDocument();
  });
});
