import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { NoticeComposerDialog } from '../src/pages/groupware/community/notice/components/NoticeComposerDialog';
import { createAppTheme } from '../src/theme/theme';
import {
  normalizeClipboardHtmlForEditor,
  calculateNoticeImageResize,
  calculateNoticeImageResizeWidth,
  serializeNoticeEditorJson,
} from '../src/pages/groupware/community/notice/components/NoticeComposerDialog';
import { uploadNoticeEmbeddedImage } from '../src/pages/groupware/community/notice/services/noticeBoardService';

vi.mock(
  '../src/pages/groupware/community/notice/services/noticeBoardService',
  () => ({
    uploadNoticeEmbeddedImage: vi.fn(),
  }),
);

describe('NoticeComposerDialog payload', () => {
  it('blocks saving when the notice category is not selected', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      React.createElement(
        ThemeProvider,
        { theme: createAppTheme('light') },
        React.createElement(NoticeComposerDialog, {
          open: true,
          isDark: false,
          onClose: () => undefined,
          onSubmit,
          noticeGubunOptions: [{ code: 'GENERAL', name: '일반' }],
        }),
      ),
    );

    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: '구분 필수 검증' },
    });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('구분을 선택해 주세요.')).toBeInTheDocument();
  });

  it('shows save progress and prevents duplicate submissions while saving', async () => {
    let resolveSubmit: (() => void) | undefined;
    const onClose = vi.fn();
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        }),
    );

    render(
      React.createElement(
        ThemeProvider,
        { theme: createAppTheme('light') },
        React.createElement(NoticeComposerDialog, {
          open: true,
          isDark: false,
          onClose,
          onSubmit,
          noticeGubunOptions: [{ code: 'GENERAL', name: '일반' }],
          defaultNoticeGubunCode: 'GENERAL',
        }),
      ),
    );

    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: '본문 저장 지연 테스트' },
    });
    const saveButton = screen.getByRole('button', { name: '저장' });
    fireEvent.click(saveButton);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(saveButton).toBeDisabled();
    expect(within(saveButton).getByRole('progressbar')).toBeVisible();
    expect(saveButton).toHaveTextContent('저장 중…');
    const cancelButton = screen.getByRole('button', { name: '취소' });
    expect(cancelButton).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(saveButton);
    expect(onSubmit).toHaveBeenCalledOnce();

    resolveSubmit?.();
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    await waitFor(() => expect(saveButton).toHaveTextContent('저장'));
  });

  it('clears save progress and keeps the composer open when submission fails', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('저장 실패'));

    render(
      React.createElement(
        ThemeProvider,
        { theme: createAppTheme('light') },
        React.createElement(NoticeComposerDialog, {
          open: true,
          isDark: false,
          onClose: () => undefined,
          onSubmit,
          noticeGubunOptions: [{ code: 'GENERAL', name: '일반' }],
          defaultNoticeGubunCode: 'GENERAL',
        }),
      ),
    );

    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: '저장 실패 상태 복구' },
    });
    const saveButton = screen.getByRole('button', { name: '저장' });
    fireEvent.click(saveButton);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    await waitFor(() => expect(saveButton).toBeEnabled());

    expect(
      within(saveButton).queryByRole('progressbar'),
    ).not.toBeInTheDocument();
    expect(saveButton).toHaveTextContent('저장');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders a file-type icon for an existing spreadsheet attachment', () => {
    render(
      React.createElement(
        ThemeProvider,
        { theme: createAppTheme('light') },
        React.createElement(NoticeComposerDialog, {
          open: true,
          isDark: false,
          onClose: () => undefined,
          defaultAttachments: [
            { id: 'file-1', name: '업무일정.xlsx', boardFileId: 101 },
          ],
        }),
      ),
    );

    expect(screen.getByTestId('attachment-icon-xlsx')).toBeInTheDocument();
  });

  it('does not expose a pin checkbox in the composer', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      React.createElement(
        ThemeProvider,
        { theme: createAppTheme('light') },
        React.createElement(NoticeComposerDialog, {
          open: true,
          isDark: false,
          onClose: () => undefined,
          onSubmit,
          noticeGubunOptions: [{ code: 'GENERAL', name: '일반' }],
          defaultNoticeGubunCode: 'GENERAL',
        }),
      ),
    );

    expect(
      screen.queryByRole('checkbox', { name: '중요 공지' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('checkbox', { name: '상단 고정' }),
    ).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('keeps the resize width calculation bounded for image dragging', () => {
    expect(calculateNoticeImageResizeWidth(320, -500)).toBe(120);
    expect(calculateNoticeImageResizeWidth(320, 100)).toBe(420);
    expect(calculateNoticeImageResizeWidth(1200, 300)).toBe(1200);
  });

  it('calculates axis-only image resizing for each edge', () => {
    expect(calculateNoticeImageResize(320, 200, 100, 0, 'e')).toEqual({
      width: 420,
      height: 200,
    });
    expect(calculateNoticeImageResize(320, 200, 50, 0, 'w')).toEqual({
      width: 270,
      height: 200,
    });
    expect(calculateNoticeImageResize(320, 200, 0, 50, 's')).toEqual({
      width: 320,
      height: 250,
    });
    expect(calculateNoticeImageResize(320, 200, 0, 50, 'n')).toEqual({
      width: 320,
      height: 150,
    });
  });

  it('preserves the aspect ratio while resizing from a corner', () => {
    expect(calculateNoticeImageResize(320, 200, 100, 0, 'se')).toEqual({
      width: 420,
      height: 263,
    });
  });

  it('still mounts the composer when image content is present', async () => {
    render(
      React.createElement(
        ThemeProvider,
        { theme: createAppTheme('light') },
        React.createElement(NoticeComposerDialog, {
          open: true,
          isDark: false,
          onClose: () => undefined,
          noticeGubunOptions: [{ code: 'GENERAL', name: '일반' }],
          defaultNoticeGubunCode: 'GENERAL',
        }),
      ),
    );

    const editor = screen.getByRole('textbox', { name: /본문/i });
    fireEvent.input(editor, {
      target: {
        innerHTML:
          '<p><img src="https://example.com/image.png" alt="이미지" /></p>',
      },
    });

    await waitFor(() => {
      expect(
        screen.getByRole('textbox', { name: /본문/i }),
      ).toBeInTheDocument();
    });
  });

  it('allows saving a non-empty initial body even when the title is blank', async () => {
    render(
      React.createElement(
        ThemeProvider,
        { theme: createAppTheme('light') },
        React.createElement(NoticeComposerDialog, {
          open: true,
          isDark: false,
          onClose: () => undefined,
          defaultBody: '<p>기존 본문</p>',
          noticeGubunOptions: [{ code: 'GENERAL', name: '일반' }],
          defaultNoticeGubunCode: 'GENERAL',
        }),
      ),
    );

    expect(
      await screen.findByRole('textbox', { name: '본문' }),
    ).toHaveTextContent('기존 본문');
    expect(screen.getByRole('button', { name: '저장' })).toBeEnabled();
  });

  it('serializes the editor JSON returned by Tiptap', () => {
    const json = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'JSON 본문' }] },
      ],
    };

    expect(serializeNoticeEditorJson({ getJSON: () => json })).toBe(
      JSON.stringify(json),
    );
  });

  it('uses the shared toolbar with accessible command state', async () => {
    render(
      React.createElement(
        ThemeProvider,
        { theme: createAppTheme('light') },
        React.createElement(NoticeComposerDialog, {
          open: true,
          isDark: false,
          onClose: () => undefined,
          noticeGubunOptions: [{ code: 'GENERAL', name: '일반' }],
          defaultNoticeGubunCode: 'GENERAL',
        }),
      ),
    );

    fireEvent.click(await screen.findByRole('button', { name: '툴바 열기' }));
    const toolbar = screen.getByTestId('notice-toolbar-popup');
    expect(
      within(toolbar).getByRole('combobox', { name: '문단' }),
    ).toBeInTheDocument();
    expect(
      within(toolbar).queryByRole('combobox', { name: '글꼴' }),
    ).toBeNull();
    expect(
      within(toolbar).queryByRole('combobox', { name: '글자 크기' }),
    ).toBeNull();
    expect(
      within(toolbar).getByRole('button', { name: '밑줄' }),
    ).toBeInTheDocument();
    expect(
      within(toolbar).getByRole('button', { name: '표 삽입' }),
    ).toBeInTheDocument();
    expect(
      within(toolbar).getByRole('button', { name: '링크' }),
    ).toBeInTheDocument();
    expect(
      within(toolbar).getByRole('button', { name: '굵게' }),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('keeps clipboard table structure readable for the notice editor', () => {
    const html = `
      <table>
        <tbody>
          <tr><td>업무</td><td>담당</td></tr>
          <tr><td>공지 작성</td><td>홍길동</td></tr>
        </tbody>
      </table>
    `;

    const normalized = normalizeClipboardHtmlForEditor(html);

    expect(normalized).toContain('업무');
    expect(normalized).toContain('담당');
    expect(normalized).toContain('공지 작성');
    expect(normalized).toContain('<table>');
    expect(normalized).toContain('<tr><td>업무</td><td>담당</td></tr>');
  });

  it('removes dangerous tags before inserting clipboard HTML', () => {
    const html = `
      <script>alert('x')</script>
      <table><tbody><tr><td>안전</td><td>값</td></tr></tbody></table>
    `;

    const normalized = normalizeClipboardHtmlForEditor(html);

    expect(normalized).toContain('안전');
    expect(normalized).toContain('<table>');
    expect(normalized).not.toContain('<script');
    expect(normalized).not.toContain('alert(');
  });

  it('keeps empty spreadsheet cells and cell spans in the normalized table', () => {
    const html = `
      <table><tbody>
        <tr><td></td><td>12</td><td></td></tr>
        <tr><td>123</td><td rowspan="2"></td><td>123</td></tr>
      </tbody></table>
    `;

    const normalized = normalizeClipboardHtmlForEditor(html);

    expect(normalized).toContain('<tr><td></td><td>12</td><td></td></tr>');
    expect(normalized).toContain(
      '<tr><td>123</td><td rowspan="2"></td><td>123</td></tr>',
    );
  });

  it('preserves safe Excel cell size, background, and border styles', () => {
    const html = `
      <table><tbody>
        <tr>
          <td style="width:120px;height:28px;background-color:#fff2cc;border:2px solid #1f2937;">셀</td>
        </tr>
      </tbody></table>
    `;

    const normalized = normalizeClipboardHtmlForEditor(html);

    expect(normalized).toContain('width:120px');
    expect(normalized).toContain('height:28px');
    expect(normalized).toContain('background-color:rgb(255, 242, 204)');
    expect(normalized).toContain('border:2px solid rgb(31, 41, 55)');
  });

  it('applies embedded Excel CSS rules to matching cells', () => {
    const html = `
      <html><head>
        <style>.xl65 { background-color: #fff2cc; border: 2px solid #1f2937; }</style>
      </head><body>
        <table><tbody><tr><td class="xl65">셀</td></tr></tbody></table>
      </body></html>
    `;

    const normalized = normalizeClipboardHtmlForEditor(html);

    expect(normalized).toContain('background-color:rgb(255, 242, 204)');
    expect(normalized).toContain('border:2px solid rgb(31, 41, 55)');
    expect(normalized).not.toContain('class="xl65"');
  });

  it('inserts Excel table HTML via the actual paste handler without losing values', async () => {
    render(
      React.createElement(
        ThemeProvider,
        { theme: createAppTheme('light') },
        React.createElement(NoticeComposerDialog, {
          open: true,
          isDark: false,
          onClose: () => undefined,
        }),
      ),
    );

    const editor = screen.getByRole('textbox', { name: /본문/i });
    const html = `
      <table>
        <tbody>
          <tr><td>업무</td><td>담당</td></tr>
          <tr><td>공지 작성</td><td>홍길동</td></tr>
        </tbody>
      </table>
    `;

    fireEvent.paste(editor, {
      clipboardData: {
        getData: (type: string) => {
          if (type === 'text/html') return html;
          if (type === 'text/plain') return '업무\t담당\n공지 작성\t홍길동';
          return '';
        },
      },
      preventDefault: vi.fn(),
    });

    await waitFor(() => {
      expect(editor).toHaveTextContent('업무');
      expect(editor).toHaveTextContent('담당');
      expect(editor).toHaveTextContent('공지 작성');
      expect(editor).toHaveTextContent('홍길동');
      expect(editor.querySelector('table')?.getAttribute('style')).toContain(
        'min-width: 32px',
      );
    });
  });

  it('does not convert Excel clipboard table data into an embedded image upload', async () => {
    vi.mocked(uploadNoticeEmbeddedImage).mockResolvedValue({
      imageUrl: 'https://example.com/pasted.png',
      fileName: 'sheet.png',
      objectKey: 'notice/sheet.png',
      fileSize: 100,
      mimeType: 'image/png',
    });

    render(
      React.createElement(
        ThemeProvider,
        { theme: createAppTheme('light') },
        React.createElement(NoticeComposerDialog, {
          open: true,
          isDark: false,
          onClose: () => undefined,
        }),
      ),
    );

    const editor = screen.getByRole('textbox', { name: /본문/i });
    const html = `
      <table>
        <tbody>
          <tr><td>업무</td><td>담당</td></tr>
          <tr><td>공지 작성</td><td>홍길동</td></tr>
        </tbody>
      </table>
    `;

    fireEvent.paste(editor, {
      clipboardData: {
        items: [
          {
            kind: 'file',
            type: 'image/png',
            getAsFile: () =>
              new File(['png'], 'sheet.png', { type: 'image/png' }),
          },
        ],
        getData: (type: string) => {
          if (type === 'text/html') return html;
          if (type === 'text/plain') return '업무\t담당\n공지 작성\t홍길동';
          return '';
        },
      },
      preventDefault: vi.fn(),
    });

    await waitFor(() => {
      expect(uploadNoticeEmbeddedImage).not.toHaveBeenCalled();
      expect(editor).toHaveTextContent('업무');
      expect(editor).toHaveTextContent('담당');
      expect(editor).toHaveTextContent('공지 작성');
      expect(editor).toHaveTextContent('홍길동');
    });
  });

  it('preserves spreadsheet values from real Excel-style clipboard HTML', async () => {
    render(
      React.createElement(
        ThemeProvider,
        { theme: createAppTheme('light') },
        React.createElement(NoticeComposerDialog, {
          open: true,
          isDark: false,
          onClose: () => undefined,
        }),
      ),
    );

    const editor = screen.getByRole('textbox', { name: /본문/i });
    const excelHtml = `
      <html><body>
        <table border="1" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
          <colgroup>
            <col style="width:120px;" />
            <col style="width:160px;" />
            <col width="140" />
          </colgroup>
          <tbody>
            <tr>
              <td style="padding:2px 4px;width:120px;height:28px;font-size:10pt;font-family:Arial;">업무</td>
              <td style="padding:2px 4px;">담당</td>
              <td style="padding:2px 4px;">일자</td>
            </tr>
            <tr>
              <td style="padding:2px 4px;">공지 작성</td>
              <td style="padding:2px 4px;">홍길동</td>
              <td style="padding:2px 4px;">2026-09-18</td>
            </tr>
            <tr>
              <td style="padding:2px 4px;">비고</td>
              <td colspan="2" style="padding:2px 4px;"><span style="font-size:8pt;font-family:Arial;color:#ff0000;"><strong>Excel 붙여넣기 검증</strong></span>&nbsp;<br>테스트</td>
            </tr>
          </tbody>
        </table>
      </body></html>
    `;

    fireEvent.paste(editor, {
      clipboardData: {
        getData: (type: string) => {
          if (type === 'text/html') return excelHtml;
          if (type === 'text/plain') {
            return '업무\t담당\t일자\n공지 작성\t홍길동\t2026-09-18\n비고\tExcel 붙여넣기 검증\t테스트';
          }
          return '';
        },
      },
      preventDefault: vi.fn(),
    });

    await waitFor(() => {
      expect(editor).toHaveTextContent('업무');
      expect(editor).toHaveTextContent('담당');
      expect(editor).toHaveTextContent('홍길동');
      expect(editor).toHaveTextContent('2026-09-18');
      expect(editor).toHaveTextContent('Excel 붙여넣기 검증');
      expect(editor).not.toHaveTextContent('border-collapse');
      const rows = editor.querySelectorAll('table tr');
      expect(rows).toHaveLength(3);
      expect(rows[2].querySelectorAll('td')).toHaveLength(2);
      expect(
        (rows[2].querySelectorAll('td')[1] as HTMLTableCellElement).colSpan,
      ).toBe(2);
      expect(rows[2].querySelector('br')).toBeInTheDocument();
      expect(rows[0].querySelectorAll('td')[0].getAttribute('colwidth')).toBe(
        '120',
      );
      expect(rows[2].querySelectorAll('td')[1].getAttribute('colwidth')).toBe(
        '160,140',
      );
      expect(
        Array.from(editor.querySelectorAll('table col')).map((column) =>
          column.getAttribute('style'),
        ),
      ).toEqual(['width: 120px;', 'width: 160px;', 'width: 140px;']);
      expect(editor.querySelector('table')?.getAttribute('style')).toContain(
        'width: 420px',
      );
      expect(editor.querySelector('span[style*="font-size"]')).toHaveStyle({
        fontSize: '8pt',
        fontFamily: 'Arial',
        color: 'rgb(255, 0, 0)',
      });
      expect(editor.querySelector('strong')).toHaveTextContent(
        'Excel 붙여넣기 검증',
      );
    });
  });

  it('keeps footer rows below a vertically merged section when Excel includes empty rows', async () => {
    render(
      React.createElement(
        ThemeProvider,
        { theme: createAppTheme('light') },
        React.createElement(NoticeComposerDialog, {
          open: true,
          isDark: false,
          onClose: () => undefined,
        }),
      ),
    );

    const editor = screen.getByRole('textbox', { name: /본문/i });
    const html =
      '<table><tbody><tr><td rowspan="3">개선조치 방법</td><td rowspan="3">조치 내용</td></tr><tr></tr><tr></tr><tr><td>이탈일자</td><td>이탈사항</td></tr></tbody></table>';

    fireEvent.paste(editor, {
      clipboardData: {
        getData: (type: string) => (type === 'text/html' ? html : ''),
      },
      preventDefault: vi.fn(),
    });

    await waitFor(() => {
      const rows = editor.querySelectorAll('table tr');
      expect(rows).toHaveLength(4);
      expect(rows[3].querySelector('td')?.textContent).toBe('이탈일자');
      expect(rows[3].querySelectorAll('td')).toHaveLength(2);
    });
  });
});
