import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  FEED_COMMENT_LIST_SX,
  FeedEngagementSection,
} from '../src/shared/components/feed/FeedEngagementSection';

const renderSection = (overrides: Partial<Parameters<typeof FeedEngagementSection>[0]> = {}) => {
  const onToggleLike = vi.fn();
  const onToggleBookmark = vi.fn();
  render(
    <FeedEngagementSection
      reaction={{ liked: false, likeCount: 0, bookmarked: false, commentCount: 2, onToggleLike, onToggleBookmark }}
      comments={{}}
      {...overrides}
    >
      <div data-testid="thread-stub">댓글 목록</div>
    </FeedEngagementSection>,
  );
  return { onToggleLike, onToggleBookmark };
};

describe('FeedEngagementSection (reaction row, full-bleed divider, comments)', () => {
  it('puts exactly one divider between the reaction row and the comments, and none above the row', () => {
    renderSection();
    const root = screen.getByTestId('feed-engagement-section');
    const separators = within(root).getAllByRole('separator');
    expect(separators).toHaveLength(1);
    const reaction = within(root).getByTestId('feed-reaction-bar');
    const thread = within(root).getByTestId('thread-stub');
    const follows = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(follows(reaction, separators[0])).toBe(true);
    expect(follows(separators[0], thread)).toBe(true);
    expect(root.firstElementChild).toBe(reaction);
    expect(follows(separators[0], reaction)).toBe(false);
  });

  it('keeps the reaction buttons and the comment count working', () => {
    const { onToggleLike, onToggleBookmark } = renderSection();
    fireEvent.click(screen.getByRole('button', { name: /좋아요/ }));
    fireEvent.click(screen.getByRole('button', { name: /북마크/ }));
    expect(onToggleLike).toHaveBeenCalledTimes(1);
    expect(onToggleBookmark).toHaveBeenCalledTimes(1);
    expect(screen.getByText('댓글 2')).toBeTruthy();
  });

  it('shows the previous-comments button below the divider when there are older comments', () => {
    renderSection({ comments: { showPrevious: true, remainingPreviousCount: 3, onLoadPrevious: vi.fn() } });
    const separator = screen.getByRole('separator');
    const button = screen.getByRole('button', { name: '이전 댓글 보기 (3)' });
    expect(Boolean(separator.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
  });

  it('lets the caller match the divider bleed to the padding of the container it sits in', () => {
    renderSection({ bleed: 2 });
    const divider = screen.getByTestId('feed-engagement-divider');
    expect(window.getComputedStyle(divider).marginLeft).toBe('-16px');
    expect(window.getComputedStyle(divider).marginRight).toBe('-16px');
  });

  it('lets the caller adjust the outer spacing', () => {
    renderSection({ sx: { mt: -0.5 } });
    expect(window.getComputedStyle(screen.getByTestId('feed-engagement-section')).marginTop).toBe('-4px');
  });

  it('exports the comment list override that removes the thread top margin, border and padding', () => {
    expect(FEED_COMMENT_LIST_SX).toEqual({ mt: 0, borderTop: 0, pt: 0 });
  });
});
