import { describe, expect, it } from 'vitest';
import { getNoticeCategoryPresentation } from '../src/pages/groupware/community/notice/data/noticeCategoryPresentation';

describe('getNoticeCategoryPresentation', () => {
  it('returns stable theme colors for a trimmed category code', () => {
    const first = getNoticeCategoryPresentation('  NOTICE_A  ', false);
    const repeated = getNoticeCategoryPresentation('NOTICE_A', false);

    expect(first).toEqual(repeated);
    expect(first.backgroundColor).toMatch(/^hsl\(\d+ 75% 92%\)$/);
    expect(first.color).toMatch(/^hsl\(\d+ 65% 30%\)$/);
  });

  it('assigns different colors to representative category codes', () => {
    const first = getNoticeCategoryPresentation('NOTICE_A', false);
    const second = getNoticeCategoryPresentation('HR', false);

    expect(first).not.toEqual(second);
  });

  it('generates colors for an unregistered category code in dark mode', () => {
    const presentation = getNoticeCategoryPresentation(
      'TENANT_SPECIFIC_CATEGORY',
      true,
    );

    expect(presentation.backgroundColor).toMatch(/^hsl\(\d+ 55% 24%\)$/);
    expect(presentation.color).toMatch(/^hsl\(\d+ 80% 84%\)$/);
  });

  it.each([undefined, null, '', '   '])(
    'uses the current blue fallback for a missing category code (%s)',
    (code) => {
      expect(getNoticeCategoryPresentation(code, false)).toEqual({
        backgroundColor: '#dbeafe',
        color: '#2563eb',
      });
    },
  );

  it('uses the current dark blue fallback for a missing category code', () => {
    expect(getNoticeCategoryPresentation('   ', true)).toEqual({
      backgroundColor: 'rgba(59,130,246,0.18)',
      color: '#2563eb',
    });
  });
});
