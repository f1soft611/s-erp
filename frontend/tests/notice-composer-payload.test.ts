import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { NoticeComposerDialog } from '../src/pages/groupware/community/notice/components/NoticeComposerDialog';
import { createAppTheme } from '../src/theme/theme';
import {
  normalizeClipboardHtmlForEditor,
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

  it('saves the important notice checkbox as isNotice', async () => {
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

    const importantCheckbox = screen.getByRole('checkbox', {
      name: '중요 공지',
    });
    expect(importantCheckbox).not.toBeChecked();
    fireEvent.click(importantCheckbox);
    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: '중요 공지' },
    });
    fireEvent.input(screen.getByRole('textbox', { name: '본문' }), {
      target: { innerHTML: '<p>본문</p>' },
    });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ isNotice: 'Y' }),
      );
    });
  });

  it('keeps the resize width calculation bounded for image dragging', () => {
    expect(calculateNoticeImageResizeWidth(320, -500)).toBe(120);
    expect(calculateNoticeImageResizeWidth(320, 100)).toBe(420);
    expect(calculateNoticeImageResizeWidth(1200, 300)).toBe(1200);
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
          <tbody>
            <tr>
              <td style="padding:2px 4px;">업무</td>
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
              <td colspan="2" style="padding:2px 4px;">Excel 붙여넣기 검증&nbsp;<br>테스트</td>
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
    });
  });
});
