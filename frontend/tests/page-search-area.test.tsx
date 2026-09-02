import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageSearchArea } from '../src/shared/components/PageSearchArea';

describe('PageSearchArea', () => {
  it('검색 조건 영역을 접고 펼칠 수 있다', () => {
    render(
      <PageSearchArea>
        <button type="button">검색 필드</button>
      </PageSearchArea>,
    );

    expect(
      screen.getByRole('button', { name: /검색 조건 접기/i }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: '검색 필드' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: /검색 조건 접기/i }));

    expect(
      screen.getByRole('button', { name: /검색 조건 열기/i }),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: '검색 필드' }),
    ).not.toBeInTheDocument();
  });
});
