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
