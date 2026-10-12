import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';
import { DocumentFeedItem } from '../src/pages/groupware/documents/write/components/DocumentFeedItem';
import type { DocumentWriteItem } from '../src/pages/groupware/documents/write/types/documentWrite.types';

const item: DocumentWriteItem = {
  id: 1,
  title: '문서 제목',
  kind: '기안서',
  status: '임시저장',
  author: '관리자',
  date: '2026.10.12',
  summary: '문서 요약',
};

describe('DocumentFeedItem', () => {
  it('allows the author and status row to wrap on narrow screens', () => {
    render(
      <ThemeProvider theme={createTheme()}>
        <DocumentFeedItem item={item} isDark={false} />
      </ThemeProvider>,
    );

    const header = screen
      .getByTestId('document-write-item')
      .querySelector('.MuiCardContent-root > .MuiBox-root');

    expect(header).toHaveStyle({ flexWrap: 'wrap' });
  });
});
