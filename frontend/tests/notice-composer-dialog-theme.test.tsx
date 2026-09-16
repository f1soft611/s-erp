import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';
import { NoticeComposerDialog } from '../src/pages/groupware/community/notice/components/NoticeComposerDialog';
import { createAppTheme } from '../src/theme/theme';

describe('NoticeComposerDialog theme handling', () => {
  it('applies the light theme tokens to the dialog shell', () => {
    render(
      <ThemeProvider theme={createAppTheme('light')}>
        <NoticeComposerDialog open isDark={false} onClose={() => undefined} />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('notice-composer-dialog-root')).toHaveAttribute(
      'data-theme-mode',
      'light',
    );
  });

  it('applies the dark theme tokens to the dialog shell', () => {
    render(
      <ThemeProvider theme={createAppTheme('dark')}>
        <NoticeComposerDialog open isDark onClose={() => undefined} />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('notice-composer-dialog-root')).toHaveAttribute(
      'data-theme-mode',
      'dark',
    );
  });

  it('keeps the editor filling the composer width', () => {
    render(
      <ThemeProvider theme={createAppTheme('light')}>
        <NoticeComposerDialog open isDark={false} onClose={() => undefined} />
      </ThemeProvider>,
    );

    const editorBox = screen.getByRole('textbox', { name: /본문/i });

    expect(editorBox).toHaveStyle({ width: '100%' });
  });

  it('allows typing in the editor without resetting on title rerenders', async () => {
    render(
      <ThemeProvider theme={createAppTheme('light')}>
        <NoticeComposerDialog open isDark={false} onClose={() => undefined} />
      </ThemeProvider>,
    );

    const titleInput = screen.getByPlaceholderText(/제목을 입력하세요\./i);
    const editorBox = screen.getByRole('textbox', { name: /본문/i });

    expect(editorBox.querySelector('.is-editor-empty')).toHaveAttribute(
      'data-placeholder',
      '본문을 입력하세요.',
    );

    fireEvent.focus(editorBox);
    fireEvent.input(editorBox, {
      target: { textContent: '첫 번째 공지 본문' },
    });

    await waitFor(() => {
      expect(editorBox).toHaveTextContent('첫 번째 공지 본문');
    });

    fireEvent.change(titleInput, { target: { value: '제목 입력 테스트' } });

    expect(editorBox).toHaveTextContent('첫 번째 공지 본문');
  });

  it('restores the bottom toolbar and attachment link while keeping separator-only section lines', async () => {
    render(
      <ThemeProvider theme={createAppTheme('light')}>
        <NoticeComposerDialog open isDark={false} onClose={() => undefined} />
      </ThemeProvider>,
    );

    const titleInput = screen.getByPlaceholderText(/제목을 입력하세요\./i);
    expect(titleInput).toBeInTheDocument();
    const editorBox = screen.getByRole('textbox', { name: /본문/i });
    expect(editorBox).toBeInTheDocument();
    expect(editorBox).toHaveStyle('overflow-y: auto');
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

    expect(
      screen.queryByRole('button', { name: /^링크$/i }),
    ).not.toBeInTheDocument();

    const fileInput = screen.getByLabelText(/첨부 파일 선택/i);
    fireEvent.change(fileInput, {
      target: {
        files: [
          new File(['hello'], '3분기_업무일정표_v2.pdf', {
            type: 'application/pdf',
          }),
        ],
      },
    });

    await waitFor(() => {
      expect(screen.getByText('3분기_업무일정표_v2.pdf')).toBeInTheDocument();
    });

    expect(screen.getByTestId('notice-attachments-list')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /저장/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^취소$/i })).toBeInTheDocument();
  });
});
