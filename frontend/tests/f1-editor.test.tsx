import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { F1Editor } from '../src/shared/components/f1-editor';
import { noticeEditorSchema } from '../src/shared/components/f1-editor/examples/noticeSchema';

describe('F1Editor', () => {
  it('renders the notice heading and body content', () => {
    render(
      <F1Editor
        schema={noticeEditorSchema}
        value={noticeEditorSchema.defaultDocument}
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('heading', { name: /제목을 입력하세요/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('paragraph', { name: /내용을 입력하세요/i }),
    ).toBeInTheDocument();
  });

  it('adds a table node when the table action is clicked', () => {
    const onChange = vi.fn();

    render(
      <F1Editor
        schema={noticeEditorSchema}
        value={noticeEditorSchema.defaultDocument}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /툴바 열기/i }));
    fireEvent.click(screen.getByRole('button', { name: /테이블/i }));

    expect(onChange).toHaveBeenCalled();
  });

  it('toggles bold marks on the selected text', () => {
    const value = {
      ...noticeEditorSchema.defaultDocument,
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '서버 점검 안내' }],
        },
      ],
    };

    const onChange = vi.fn();

    render(
      <F1Editor
        schema={noticeEditorSchema}
        value={value}
        onChange={onChange}
      />,
    );

    const paragraph = screen.getByText('서버 점검 안내');
    paragraph.setAttribute('contenteditable', 'true');
    paragraph.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    selection?.removeAllRanges();
    selection?.addRange(range);

    fireEvent.click(screen.getByRole('button', { name: /툴바 열기/i }));
    fireEvent.click(screen.getByRole('button', { name: /굵게/i }));

    const nextDoc = onChange.mock.calls.at(-1)?.[0];
    expect(nextDoc.content[0].content[0].marks).toContain('bold');
  });

  it('keeps typed text stable without duplication while editing the notice title', () => {
    render(
      <F1Editor
        schema={noticeEditorSchema}
        value={noticeEditorSchema.defaultDocument}
        onChange={vi.fn()}
      />,
    );

    const heading = document.querySelector('[aria-label="제목을 입력하세요"]');
    expect(heading).not.toBeNull();

    fireEvent.input(heading as HTMLElement, {
      target: { textContent: '운영 공지' },
    });
    fireEvent.input(heading as HTMLElement, {
      target: { textContent: '운영 공지 9월' },
    });

    expect((heading as HTMLElement).textContent).toBe('운영 공지 9월');
    expect((heading as HTMLElement).textContent).not.toBe(
      '운영 공지 9월운영 공지 9월',
    );
  });

  it('does not re-render the active contenteditable node while the user is still typing', () => {
    const WrappedEditor = () => {
      const [value, setValue] = useState(noticeEditorSchema.defaultDocument);

      return (
        <F1Editor
          schema={noticeEditorSchema}
          value={value}
          onChange={setValue}
        />
      );
    };

    const { rerender } = render(<WrappedEditor />);

    const heading = document.querySelector(
      '[aria-label="제목을 입력하세요"]',
    ) as HTMLElement;

    fireEvent.input(heading, {
      target: { textContent: '가' },
    });

    rerender(<WrappedEditor />);
    fireEvent.input(heading, {
      target: { textContent: '가나' },
    });

    expect((heading as HTMLElement).textContent).toBe('가나');
    expect((heading as HTMLElement).textContent).not.toBe('가나가나');
  });

  it('keeps multi-line content stable without duplicate repetition', () => {
    render(
      <F1Editor
        schema={noticeEditorSchema}
        value={noticeEditorSchema.defaultDocument}
        onChange={vi.fn()}
      />,
    );

    const title = document.querySelector('[aria-label="제목을 입력하세요"]');
    const body = document.querySelector('[aria-label="내용을 입력하세요"]');

    expect(title).not.toBeNull();
    expect(body).not.toBeNull();

    fireEvent.input(title as HTMLElement, {
      target: { textContent: '멀티라인\n제목' },
    });
    fireEvent.input(body as HTMLElement, {
      target: { textContent: '첫 줄\n둘째 줄\n세 번째 줄' },
    });
    fireEvent.blur(title as HTMLElement);

    expect((title as HTMLElement).textContent).toBe('멀티라인 제목');
    expect((body as HTMLElement).textContent).toBe(
      '첫 줄\n둘째 줄\n세 번째 줄',
    );
    expect((body as HTMLElement).textContent).not.toContain(
      '첫 줄\n둘째 줄\n세 번째 줄첫 줄\n둘째 줄\n세 번째 줄',
    );
  });

  it('keeps typed text in the normal text color while editing', () => {
    render(
      <F1Editor
        schema={noticeEditorSchema}
        value={noticeEditorSchema.defaultDocument}
        onChange={vi.fn()}
      />,
    );

    const title = document.querySelector('[aria-label="제목을 입력하세요"]');
    const body = document.querySelector('[aria-label="내용을 입력하세요"]');

    expect(title).not.toBeNull();
    expect(body).not.toBeNull();

    fireEvent.input(title as HTMLElement, {
      target: { textContent: '테스트 제목' },
    });
    fireEvent.input(body as HTMLElement, {
      target: { textContent: '본문 내용입니다' },
    });

    expect(getComputedStyle(title as HTMLElement).color).not.toBe(
      'rgb(148, 163, 184)',
    );
    expect(getComputedStyle(body as HTMLElement).color).not.toBe(
      'rgb(148, 163, 184)',
    );
  });

  it('renders compact toolbar and attachment button in the editor footer', () => {
    render(
      <F1Editor
        schema={noticeEditorSchema}
        value={noticeEditorSchema.defaultDocument}
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('button', { name: /툴바 열기/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /첨부 파일/i }),
    ).toBeInTheDocument();
  });

  it('allows a parent modal to render action buttons outside the editor footer', () => {
    render(
      <F1Editor
        schema={noticeEditorSchema}
        value={noticeEditorSchema.defaultDocument}
        onChange={vi.fn()}
        showFooterActions={false}
      />,
    );

    expect(
      screen.queryByRole('button', { name: /등록/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /취소/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /툴바 열기/i }),
    ).toBeInTheDocument();
  });

  it('shows formatting options when the toolbar trigger is clicked', () => {
    render(
      <F1Editor
        schema={noticeEditorSchema}
        value={noticeEditorSchema.defaultDocument}
        onChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /툴바 열기/i }));

    expect(screen.getByRole('button', { name: /굵게/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /테이블/i })).toBeInTheDocument();
  });

  it('shows selected file attachments under the content area', () => {
    render(
      <F1Editor
        schema={noticeEditorSchema}
        value={noticeEditorSchema.defaultDocument}
        onChange={vi.fn()}
      />,
    );

    const file = new File(['hello'], 'plan.pdf', { type: 'application/pdf' });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    fireEvent.click(screen.getByRole('button', { name: /첨부 파일/i }));
    fireEvent.change(input, {
      target: { files: [file] },
    });

    expect(screen.getByText('plan.pdf')).toBeInTheDocument();
  });

  it('keeps the current text stable when the editor rerenders during typing', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <F1Editor
        schema={noticeEditorSchema}
        value={noticeEditorSchema.defaultDocument}
        onChange={onChange}
      />,
    );

    const heading = document.querySelector(
      '[aria-label="제목을 입력하세요"]',
    ) as HTMLElement;

    fireEvent.input(heading, {
      target: { textContent: '운영 공지' },
    });

    rerender(
      <F1Editor
        schema={noticeEditorSchema}
        value={noticeEditorSchema.defaultDocument}
        onChange={onChange}
      />,
    );

    expect(heading.textContent).toBe('운영 공지');
    fireEvent.blur(heading);

    const typedDoc = onChange.mock.calls.at(-1)?.[0];
    expect(typedDoc.content[0].content[0].text).toBe('운영 공지');

    rerender(
      <F1Editor
        schema={noticeEditorSchema}
        value={typedDoc}
        onChange={onChange}
      />,
    );

    const nextHeading = screen.getByText('운영 공지');
    fireEvent.input(nextHeading, {
      target: { textContent: '운영 공지 9월' },
    });

    expect(screen.getByText('운영 공지 9월')).toBeInTheDocument();
  });

  it('waits for IME composition to finish before committing typed text', () => {
    const onChange = vi.fn();

    render(
      <F1Editor
        schema={noticeEditorSchema}
        value={noticeEditorSchema.defaultDocument}
        onChange={onChange}
      />,
    );

    const heading = document.querySelector(
      '[aria-label="제목을 입력하세요"]',
    ) as HTMLElement;

    fireEvent.compositionStart(heading);
    fireEvent.input(heading, {
      target: { textContent: '테' },
    });

    expect(onChange).not.toHaveBeenCalled();

    fireEvent.compositionEnd(heading, { target: { textContent: '테' } });

    expect(onChange).not.toHaveBeenCalled();

    fireEvent.blur(heading);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect((heading as HTMLElement).textContent).toBe('테');
  });

  it('keeps Korean IME input stable across successive composition steps', () => {
    const onChange = vi.fn();

    render(
      <F1Editor
        schema={noticeEditorSchema}
        value={noticeEditorSchema.defaultDocument}
        onChange={onChange}
      />,
    );

    const heading = document.querySelector(
      '[aria-label="제목을 입력하세요"]',
    ) as HTMLElement;

    const sequence = ['한', '한글', '한글자'];
    sequence.forEach((value) => {
      fireEvent.compositionStart(heading);
      fireEvent.input(heading, {
        target: { textContent: value },
      });

      fireEvent.compositionEnd(heading, {
        target: { textContent: value },
      });
    });

    expect((heading as HTMLElement).textContent).toBe('한글자');
    expect((heading as HTMLElement).textContent).not.toContain('한글한');
    fireEvent.blur(heading);
    expect(onChange.mock.calls.at(-1)?.[0].content[0].content[0].text).toBe(
      '한글자',
    );
  });
});
