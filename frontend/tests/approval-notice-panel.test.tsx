import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { ApprovalNoticePanel } from '../src/pages/groupware/documents/write/components/ApprovalNoticePanel';
import type { DocumentWriteItem } from '../src/pages/groupware/documents/write/types/documentWrite.types';

const item: DocumentWriteItem = {
  id: 42,
  title: '긴제목g가공백없이이어지는경우에도카드너비안에서줄바꿈되어야합니다',
  kind: '기안서',
  status: '결재진행중',
  author: '작성자',
  date: '2026.10.16',
  summary: '',
};

describe('ApprovalNoticePanel', () => {
  it('left-aligns the full-width notice and constrains long titles', () => {
    render(<ApprovalNoticePanel items={[item]} onSelect={() => undefined} />);

    const button = screen.getByRole('button', { name: /결재 요청 도착/ });
    expect(button).toHaveStyle({
      display: 'flex',
      'flex-direction': 'column',
      'align-items': 'flex-start',
      'justify-content': 'flex-start',
      width: '100%',
      'border-width': '1px',
    });
    expect(within(button).getByText(item.title)).toHaveStyle({
      width: '100%',
      'overflow-wrap': 'anywhere',
    });
  });

  it('passes the selected document ID', () => {
    const onSelect = vi.fn();
    render(<ApprovalNoticePanel items={[item]} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: /결재 요청 도착/ }));

    expect(onSelect).toHaveBeenCalledWith(item.id);
  });

  it('shows at most three notices and preserves revision labels', () => {
    const items = [0, 1, 2, 3].map((index) => ({
      ...item,
      id: item.id + index,
      title: `문서 ${index}`,
    }));
    items[0].status = '보완요청';
    render(<ApprovalNoticePanel items={items} onSelect={() => undefined} />);

    expect(screen.getAllByRole('button')).toHaveLength(3);
    expect(screen.getByText('보완 요청 문서')).toBeInTheDocument();
    expect(screen.queryByText('문서 3')).not.toBeInTheDocument();
  });

  it('preserves the empty-state message', () => {
    render(<ApprovalNoticePanel items={[]} onSelect={() => undefined} />);

    expect(screen.getByText('새로운 결재 알림이 없습니다.')).toBeInTheDocument();
  });
});
