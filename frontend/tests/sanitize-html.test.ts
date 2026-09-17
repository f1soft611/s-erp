import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from '../src/shared/utils/sanitizeHtml';

describe('sanitizeHtml', () => {
  it('removes event handlers, unsafe URLs and executable elements', () => {
    const result = sanitizeHtml(
      '<p onclick="alert(1)">안전<a href="javascript:alert(1)">링크</a><a href="data:text/html,evil">데이터</a></p><svg><script>alert(1)</script></svg>',
    );

    expect(result).toContain(
      '<p>안전<a rel="noopener noreferrer" target="_blank">링크</a><a rel="noopener noreferrer" target="_blank">데이터</a></p>',
    );
    expect(result).not.toMatch(/onclick|javascript:|data:|<svg|<script/i);
  });

  it('keeps safe HTTP links and strips unapproved markup', () => {
    const result = sanitizeHtml(
      '<div><a href="https://example.com" style="color:red">외부 링크</a></div>',
    );

    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('rel="noopener noreferrer"');
    expect(result).not.toContain('<div');
    expect(result).not.toContain('style=');
  });

  it('rejects protocol-relative and unsupported URL schemes', () => {
    const result = sanitizeHtml(
      '<p><a href="//evil.example/path">host</a><a href="ftp://evil.example/file">ftp</a><a href="vbscript:msgbox(1)">script</a><a href="/local/path">local</a></p>',
    );

    expect(result).not.toContain('href="//evil.example/path"');
    expect(result).not.toContain('href="ftp://evil.example/file"');
    expect(result).not.toContain('href="vbscript:msgbox(1)"');
    expect(result).toContain('href="/local/path"');
  });
});
