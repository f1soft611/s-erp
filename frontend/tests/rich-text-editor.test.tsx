import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { useState } from 'react';
import type { Editor } from '@tiptap/react';
import { describe, expect, it, vi } from 'vitest';
import {
  RichTextEditor,
  RichTextEditorToolbar,
} from '../src/shared/components/rich-text-editor/RichTextEditor';

function RichTextEditorWithToolbar() {
  const [editor, setEditor] = useState<Editor | null>(null);
  return (
    <ThemeProvider theme={createTheme()}>
      <>
        <RichTextEditor ariaLabel="본문" onEditorReady={setEditor} />
        <RichTextEditorToolbar editor={editor} />
      </>
    </ThemeProvider>
  );
}

describe('RichTextEditor', () => {
  it('renders initial content and exposes its editor instance to the owner', async () => {
    let editor: Editor | null = null;
    render(
      <ThemeProvider theme={createTheme()}>
        <RichTextEditor
          content="<p>공통 편집기 본문</p>"
          ariaLabel="본문"
          onEditorReady={(instance) => {
            editor = instance;
          }}
        />
      </ThemeProvider>,
    );

    expect(
      await screen.findByRole('textbox', { name: '본문' }),
    ).toHaveTextContent('공통 편집기 본문');
    await waitFor(() => expect(editor).not.toBeNull());
  });

  it('uploads pasted images through the caller adapter and updates that image node', async () => {
    const uploadImage = vi.fn().mockResolvedValue({
      src: '/images/pasted.png',
      alt: 'pasted.png',
      uploadToken: 'upload-1',
      fileSize: 4,
      mimeType: 'image/png',
    });
    render(
      <ThemeProvider theme={createTheme()}>
        <RichTextEditor ariaLabel="본문" uploadImage={uploadImage} />
      </ThemeProvider>,
    );
    const editor = await screen.findByRole('textbox', { name: '본문' });
    const file = new File(['data'], 'pasted.png', { type: 'image/png' });

    fireEvent.paste(editor, {
      clipboardData: {
        items: [{ kind: 'file', type: 'image/png', getAsFile: () => file }],
        getData: () => '',
      },
    });

    await waitFor(() => expect(uploadImage).toHaveBeenCalledWith(file));
    await waitFor(() =>
      expect(editor.querySelector('img')).toHaveAttribute(
        'src',
        '/images/pasted.png',
      ),
    );
    expect(editor.querySelector('img')).toHaveAttribute(
      'data-upload-token',
      'upload-1',
    );
  });

  it('removes only the failed image placeholder and clears upload progress', async () => {
    const uploadImage = vi.fn().mockRejectedValue(new Error('upload failed'));
    const onImageUploadError = vi.fn();
    const onUploadingChange = vi.fn();
    render(
      <ThemeProvider theme={createTheme()}>
        <RichTextEditor
          content="<p>본문 유지</p>"
          ariaLabel="본문"
          uploadImage={uploadImage}
          onImageUploadError={onImageUploadError}
          onUploadingChange={onUploadingChange}
        />
      </ThemeProvider>,
    );
    const editor = await screen.findByRole('textbox', { name: '본문' });
    const file = new File(['data'], 'failed.png', { type: 'image/png' });

    fireEvent.paste(editor, {
      clipboardData: {
        items: [{ kind: 'file', type: 'image/png', getAsFile: () => file }],
        getData: () => '',
      },
    });

    await waitFor(() => expect(uploadImage).toHaveBeenCalledWith(file));
    await waitFor(() => expect(editor.querySelector('img')).toBeNull());
    expect(editor).toHaveTextContent('본문 유지');
    expect(onImageUploadError).toHaveBeenCalledWith(
      '본문 이미지 업로드에 실패했습니다.',
    );
    expect(onUploadingChange).toHaveBeenNthCalledWith(1, 1);
    expect(onUploadingChange).toHaveBeenLastCalledWith(0);
  });

  it('shows accessible resize handles when an image is selected', async () => {
    let editorInstance: Editor | null = null;
    render(
      <ThemeProvider theme={createTheme()}>
        <RichTextEditor
          content='<p><img src="/images/saved.png" alt="저장된 이미지" /></p>'
          ariaLabel="본문"
          onEditorReady={(editor) => {
            editorInstance = editor;
          }}
        />
      </ThemeProvider>,
    );
    await screen.findByRole('img', { name: '저장된 이미지' });
    await waitFor(() => expect(editorInstance).not.toBeNull());
    let imagePosition = -1;
    editorInstance?.state.doc.descendants((node, position) => {
      if (node.type.name === 'image') imagePosition = position;
    });
    editorInstance?.commands.setNodeSelection(imagePosition);

    expect(await screen.findByLabelText('이미지 크기 조절 영역')).toBeVisible();
    expect(screen.getAllByLabelText(/방향 이미지 크기 조절/)).toHaveLength(8);
  });

  it('offers font family, font size, and text color controls in the shared toolbar', async () => {
    render(<RichTextEditorWithToolbar />);

    fireEvent.click(await screen.findByRole('button', { name: '툴바 열기' }));

    expect(screen.getByRole('combobox', { name: '글꼴' })).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: '글자 크기' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('글자 색상')).toHaveAttribute('type', 'color');
  });
});
