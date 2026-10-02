import { describe, expect, it } from 'vitest';
import {
  prepareNoticeFeedHtml,
  sanitizeNoticeBodyHtml,
} from '../src/pages/groupware/community/notice/utils/noticeHtml';

describe('notice HTML rendering', () => {
  it('preserves safe typography when sanitizing a notice body without adding a wrapper', () => {
    const result = sanitizeNoticeBodyHtml(
      '<p><span style="font-family:Arial;font-size:10pt;color:#123456">공지</span></p><table><tbody><tr><td>셀</td></tr></tbody></table>',
    );

    expect(result).toContain(
      '<span style="font-family:Arial;font-size:10pt;color:#123456">공지</span>',
    );
    expect(result).toContain('<table>');
    expect(result).not.toContain('tableWrapper');
  });

  it('wraps feed tables once and retains safe typography', () => {
    const result = prepareNoticeFeedHtml(
      '<p><span style="font-family:Arial;font-size:10pt">공지</span></p><table><tbody><tr><td>셀</td></tr></tbody></table>',
    );
    const document = new DOMParser().parseFromString(result, 'text/html');

    expect(document.querySelectorAll('.tableWrapper')).toHaveLength(1);
    expect(document.querySelector('.tableWrapper > table')).not.toBeNull();
    expect(document.querySelector('span')?.getAttribute('style')).toBe(
      'font-family:Arial;font-size:10pt',
    );
  });

  it('keeps the Excel font family and point size through save and feed rendering', () => {
    const savedHtml = sanitizeNoticeBodyHtml(
      '<table><tbody><tr><td style="font-family:&quot;맑은 고딕&quot;, monospace;font-size:22pt;font-weight:700">헤더</td></tr></tbody></table>',
    );
    const feedDocument = new DOMParser().parseFromString(
      prepareNoticeFeedHtml(savedHtml),
      'text/html',
    );
    const cell = feedDocument.querySelector('td');

    expect(cell?.style.getPropertyValue('font-family')).toBe(
      '"맑은 고딕", monospace',
    );
    expect(cell?.style.getPropertyValue('font-size')).toBe('22pt');
    expect(cell?.style.getPropertyValue('font-weight')).toBe('700');
  });

  it('removes unsafe markup and does not duplicate wrappers for nested tables', () => {
    const result = prepareNoticeFeedHtml(
      '<script>alert(1)</script><table><tbody><tr><td>바깥<table><tbody><tr><td>안쪽</td></tr></tbody></table></td></tr></tbody></table>',
    );
    const document = new DOMParser().parseFromString(result, 'text/html');

    expect(result).not.toContain('<script');
    expect(result).not.toContain('alert(1)');
    expect(document.querySelectorAll('.tableWrapper')).toHaveLength(1);
    expect(
      document.querySelectorAll('.tableWrapper .tableWrapper'),
    ).toHaveLength(0);
  });
});
