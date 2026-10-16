import { describe, expect, it } from 'vitest';
import { getDocumentDisplayDate } from '../src/pages/groupware/documents/write/data/documentDate';

describe('getDocumentDisplayDate', () => {
  it.each([
    {
      fields: {
        submittedAt: '2026-10-14',
        updatedAt: '2026-10-15',
        createdAt: '2026-10-12',
      },
      expected: { value: '2026-10-14', sourceLabel: '상신일' },
    },
    {
      fields: {
        submittedAt: null,
        updatedAt: '2026-10-15',
        createdAt: '2026-10-12',
      },
      expected: { value: '2026-10-15', sourceLabel: '수정일' },
    },
    {
      fields: {
        submittedAt: '',
        updatedAt: null,
        createdAt: '2026-10-12',
      },
      expected: { value: '2026-10-12', sourceLabel: '작성일' },
    },
    {
      fields: {
        submittedAt: '',
        updatedAt: '',
        createdAt: null,
      },
      expected: { value: '' },
    },
  ])('selects the first available date from $fields', ({ fields, expected }) => {
    expect(getDocumentDisplayDate(fields)).toEqual(expected);
  });
});
