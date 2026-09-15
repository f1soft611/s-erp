import type { F1EditorDocument, F1EditorSchema } from '../types';

export const noticeEditorSchema: F1EditorSchema = {
  fields: [
    {
      key: 'title',
      label: '제목',
      type: 'text',
      required: true,
      defaultValue: '공지사항 제목',
    },
    {
      key: 'category',
      label: '분류',
      type: 'select',
      defaultValue: 'general',
      options: [
        { label: '일반', value: 'general' },
        { label: '운영', value: 'ops' },
        { label: '보안', value: 'security' },
      ],
    },
    {
      key: 'isPinned',
      label: '상단 고정',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      key: 'bodyText',
      label: '본문',
      type: 'textarea',
      defaultValue: '본문을 입력해 주세요.',
    },
  ],
  defaultDocument: {
    type: 'doc',
    version: '1.0',
    meta: {
      category: 'notice',
    },
    content: [
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: '' }],
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: '' }],
      },
    ],
  } satisfies F1EditorDocument,
};
