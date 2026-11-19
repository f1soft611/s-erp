import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';
import { NoticeComposerDialog } from '../src/pages/groupware/community/notice/components/NoticeComposerDialog';
import { AttachmentList } from '../src/shared/components/feed/AttachmentList';
import { createAppTheme } from '../src/theme/theme';

describe('NoticeComposerDialog theme handling', () => {
  it('keeps an open draft across default changes and applies the latest defaults on reopening', async () => {
    const composer = (open: boolean, next = false) => (
      <ThemeProvider theme={createAppTheme('light')}>
        <NoticeComposerDialog
          open={open}
          isDark={false}
          onClose={() => undefined}
          defaultTitle={next ? 'Owned next title' : 'Owned first title'}
          noticeGubunOptions={[
            { code: 'GENERAL', name: 'Owned general' },
            { code: 'OTHER', name: 'Owned other' },
          ]}
          defaultNoticeGubunCode={next ? 'OTHER' : 'GENERAL'}
          defaultLoginPopupYn={next ? 'Y' : 'N'}
          defaultPopupEndDate={next ? '2026-12-31' : '2026-11-18'}
          defaultBody="<p>Owned body</p>"
          defaultAttachments={[{
            id: next ? 'owned-next' : 'owned-first',
            name: next ? 'owned-next.txt' : 'owned-first.txt',
          }]}
        />
      </ThemeProvider>
    );
    const { rerender } = render(composer(true));
    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: 'Owned unsaved title' },
    });
    fireEvent.click(screen.getByRole('button', { name: '첨부 파일 삭제' }));

    rerender(composer(true, true));

    expect(screen.getByRole('textbox', { name: '제목' })).toHaveValue('Owned unsaved title');
    expect(screen.getByRole('combobox', { name: /구분/ })).toHaveTextContent('Owned general');
    expect(screen.getByRole('checkbox', { name: '로그인 시 팝업' })).not.toBeChecked();
    expect(screen.getByRole('textbox', { name: '팝업 종료일' })).toHaveValue('2026-11-18');
    expect(screen.queryByText('owned-first.txt')).not.toBeInTheDocument();
    expect(screen.queryByText('owned-next.txt')).not.toBeInTheDocument();

    rerender(composer(false, true));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    rerender(composer(true, true));

    expect(screen.getByRole('textbox', { name: '제목' })).toHaveValue('Owned next title');
    expect(screen.getByRole('combobox', { name: /구분/ })).toHaveTextContent('Owned other');
    expect(screen.getByRole('checkbox', { name: '로그인 시 팝업' })).toBeChecked();
    expect(screen.getByRole('textbox', { name: '팝업 종료일' })).toHaveValue('2026-12-31');
    expect(screen.getByText('owned-next.txt')).toBeInTheDocument();
  });

  it('retains the existing field reset when paste debug mode changes while open', () => {
    const originalUrl = window.location.href;
    const nextUrl = new URL(originalUrl);
    nextUrl.searchParams.delete('noticePasteDebug');
    window.history.replaceState({}, '', nextUrl);
    const composer = () => (
      <ThemeProvider theme={createAppTheme('light')}>
        <NoticeComposerDialog open isDark={false} onClose={() => undefined} defaultTitle="Owned baseline" />
      </ThemeProvider>
    );
    try {
      const { rerender } = render(composer());
      fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
        target: { value: 'Owned unsaved title' },
      });
      nextUrl.searchParams.set('noticePasteDebug', '1');
      window.history.replaceState({}, '', nextUrl);
      rerender(composer());
      expect(screen.getByRole('textbox', { name: '제목' })).toHaveValue('Owned baseline');
    } finally {
      window.history.replaceState({}, '', originalUrl);
    }
  });

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

  it('uses the slate surface for category and title fields in dark mode', () => {
    render(
      <ThemeProvider theme={createAppTheme('dark')}>
        <NoticeComposerDialog
          open
          isDark
          onClose={() => undefined}
          noticeGubunOptions={[{ code: 'GENERAL', name: '일반' }]}
        />
      </ThemeProvider>,
    );

    const categoryInput = screen.getByRole('combobox', { name: /구분/ });
    const titleInput = screen.getByRole('textbox', { name: '제목' });

    expect(categoryInput.closest('.MuiInputBase-root')).toHaveStyle({
      backgroundColor: 'rgb(30, 41, 59)',
    });
    expect(titleInput.closest('.MuiInputBase-root')).toHaveStyle({
      backgroundColor: 'rgb(30, 41, 59)',
    });
  });

  it('keeps category and title fields white in light mode', () => {
    render(
      <ThemeProvider theme={createAppTheme('light')}>
        <NoticeComposerDialog
          open
          isDark={false}
          onClose={() => undefined}
          noticeGubunOptions={[{ code: 'GENERAL', name: '일반' }]}
        />
      </ThemeProvider>,
    );

    const categoryInput = screen.getByRole('combobox', { name: /구분/ });
    const titleInput = screen.getByRole('textbox', { name: '제목' });

    expect(categoryInput.closest('.MuiInputBase-root')).toHaveStyle({
      backgroundColor: 'rgb(255, 255, 255)',
    });
    expect(titleInput.closest('.MuiInputBase-root')).toHaveStyle({
      backgroundColor: 'rgb(255, 255, 255)',
    });
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

  it('matches the feed title typography in the title input', () => {
    render(
      <ThemeProvider theme={createAppTheme('light')}>
        <NoticeComposerDialog open isDark={false} onClose={() => undefined} />
      </ThemeProvider>,
    );

    expect(screen.getByRole('textbox', { name: '제목' })).toHaveStyle({
      fontSize: '1.25rem',
      lineHeight: '1.4',
      fontWeight: '700',
      letterSpacing: '-0.02em',
    });
  });

  it('removes the image resize overlay when the dialog closes', async () => {
    const { rerender } = render(
      <ThemeProvider theme={createAppTheme('light')}>
        <NoticeComposerDialog open isDark={false} onClose={() => undefined} />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(
        document.querySelector('.rich-text-image-resize-overlay'),
      ).toBeInTheDocument();
    });

    rerender(
      <ThemeProvider theme={createAppTheme('light')}>
        <NoticeComposerDialog
          open={false}
          isDark={false}
          onClose={() => undefined}
        />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(
        document.querySelector('.notice-image-resize-overlay'),
      ).not.toBeInTheDocument();
    });
  });

  it('renders the notice title input with feed title weight', () => {
    render(
      <ThemeProvider theme={createAppTheme('light')}>
        <NoticeComposerDialog open isDark={false} onClose={() => undefined} />
      </ThemeProvider>,
    );

    expect(screen.getByRole('textbox', { name: '제목' })).toHaveStyle({
      fontWeight: 700,
    });
  });

  it('renders the correct action icon for view and edit modes', () => {
    const downloadSpy = vi.fn();
    const removeSpy = vi.fn();

    const { rerender } = render(
      <ThemeProvider theme={createAppTheme('light')}>
        <AttachmentList
          files={[{ id: 'a1', name: '3분기_업무일정표_v2.pdf' }]}
          isDark={false}
          mode="view"
          onDownload={downloadSpy}
          showActions
        />
      </ThemeProvider>,
    );

    const downloadButton = screen.getByRole('button', {
      name: /첨부 파일 다운로드/i,
    });
    expect(
      downloadButton.querySelector('[data-testid="FileDownloadOutlinedIcon"]'),
    ).toBeInTheDocument();
    fireEvent.click(downloadButton);

    expect(downloadSpy).toHaveBeenCalledWith('a1');

    rerender(
      <ThemeProvider theme={createAppTheme('light')}>
        <AttachmentList
          files={[{ id: 'a1', name: '3분기_업무일정표_v2.pdf' }]}
          isDark={false}
          mode="edit"
          onRemove={removeSpy}
          showActions
        />
      </ThemeProvider>,
    );

    const deleteButton = screen.getByRole('button', {
      name: /첨부 파일 삭제/i,
    });
    expect(
      deleteButton.querySelector('[data-testid="DeleteIcon"]'),
    ).toBeInTheDocument();
    fireEvent.click(deleteButton);

    expect(removeSpy).toHaveBeenCalledWith('a1');
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
    const toolbarButton = screen.getByRole('button', { name: /툴바 열기/i });
    const attachmentButton = screen.getByRole('button', {
      name: /첨부 링크/i,
    });
    const footerStart = screen.getByTestId('common-dialog-footer-start');
    const actions = screen.getByTestId('common-dialog-actions');

    expect(footerStart).toContainElement(toolbarButton);
    expect(footerStart).toContainElement(attachmentButton);
    expect(actions).toContainElement(
      screen.getByRole('button', { name: '저장' }),
    );
    expect(actions).toContainElement(
      screen.getByRole('button', { name: '취소' }),
    );

    fireEvent.click(screen.getByRole('button', { name: /툴바 열기/i }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /^굵게$/i }),
      ).toBeInTheDocument();
    });

    const boldButton = screen.getByRole('button', { name: /^굵게$/i });
    expect(getComputedStyle(toolbarButton).borderTopWidth).toBe('0px');
    const boldStyle = getComputedStyle(boldButton);
    expect(boldStyle.width).toBe('32px');
    expect(boldStyle.height).toBe('32px');
    expect(boldStyle.borderTopWidth).toBe('0px');

    const attachmentStyle = getComputedStyle(attachmentButton);
    expect(attachmentStyle.width).toBe('32px');
    expect(attachmentStyle.height).toBe('32px');
    expect(attachmentStyle.borderTopWidth).toBe('1px');
    expect(attachmentStyle.borderTopStyle).toBe('solid');

    expect(screen.getByRole('button', { name: /^링크$/i })).toBeInTheDocument();

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
