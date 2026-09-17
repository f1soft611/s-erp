import { describe, expect, it } from 'vitest';
import { serializeNoticeEditorJson } from '../src/pages/groupware/community/notice/components/NoticeComposerDialog';

describe('NoticeComposerDialog payload', () => {
  it('serializes the editor JSON returned by Tiptap', () => {
    const json = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'JSON 본문' }] },
      ],
    };

    expect(serializeNoticeEditorJson({ getJSON: () => json })).toBe(
      JSON.stringify(json),
    );
  });
});
