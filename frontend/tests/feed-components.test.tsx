import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AttachmentList } from '../src/shared/components/feed/AttachmentList';
import { CommentThread } from '../src/shared/components/feed/CommentThread';
import { FeedList } from '../src/shared/components/feed/FeedList';

describe('shared feed components', () => {
  it('renders feed, attachment and comment blocks via reusable shared components', () => {
    render(
      <>
        <FeedList
          items={[
            {
              id: 1,
              title: '공지사항 업데이트',
              meta: '운영팀 · 2026.09.16 · 조회 12',
              summary: '새로운 업데이트를 안내드립니다.',
            },
          ]}
          renderItem={(item) => <div>{item.title}</div>}
        />
        <AttachmentList
          files={[{ id: 'file-1', name: '공지사항_안내.pdf' }]}
          showActions={false}
        />
        <CommentThread
          comments={[
            {
              id: 1,
              author: '김철수',
              time: '2026-09-16 10:00',
              content: '확인했습니다.',
            },
          ]}
          draft=""
          onDraftChange={() => undefined}
          onSubmitComment={() => undefined}
          showComposer={false}
        />
      </>,
    );

    expect(screen.getByText('공지사항 업데이트')).toBeInTheDocument();
    expect(screen.getByText('공지사항_안내.pdf')).toBeInTheDocument();
    expect(screen.getByText('확인했습니다.')).toBeInTheDocument();
  });
});
