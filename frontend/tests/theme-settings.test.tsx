import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../src/App';

describe('Theme settings', () => {
  it('lets the user switch theme and display size from the dashboard header', async () => {
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
      await screen.findByRole('combobox', { name: /테마/i }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('combobox', { name: /화면크기/i }),
    ).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('combobox', { name: /테마/i }));
    fireEvent.click(screen.getByRole('option', { name: /다크 테마/i }));
    expect(window.localStorage.getItem('erp-theme')).toBe('dark');

    fireEvent.mouseDown(screen.getByRole('combobox', { name: /화면크기/i }));
    fireEvent.click(screen.getByRole('option', { name: /^크게$/i }));
    expect(window.localStorage.getItem('erp-display-scale')).toBe('1.2');
  });
});
