import { describe, expect, it } from 'vitest';
import {
  normalizeClipboardHtmlForEditor,
  serializeNoticeEditorJson,
} from '../src/pages/groupware/community/notice/components/NoticeComposerDialog';

describe('NoticeComposerDialog payload', () => {
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
    expect(normalized).toContain('<p>');
    expect(normalized).not.toContain('<table');
  });

  it('removes dangerous tags before inserting clipboard HTML', () => {
    const html = `
      <script>alert('x')</script>
      <table><tbody><tr><td>안전</td><td>값</td></tr></tbody></table>
    `;

    const normalized = normalizeClipboardHtmlForEditor(html);

    expect(normalized).toContain('안전');
    expect(normalized).not.toContain('<script');
    expect(normalized).not.toContain('alert(');
  });
});
