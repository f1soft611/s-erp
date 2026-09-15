import type { F1EditorCore, F1EditorExtension } from '../types';

export const fontSizeExtension: F1EditorExtension = {
  id: 'f1-font-size',
  name: 'Font Size',
  enabled: true,
  commands: {
    setFontSize: (size: number, editor: F1EditorCore) => {
      editor.doc = {
        ...editor.doc,
        content: editor.doc.content.map((node) => {
          if (node.type === 'paragraph' || node.type === 'heading') {
            return {
              ...node,
              content: (node.content ?? []).map((child) => {
                if (child.type === 'text') {
                  return {
                    ...child,
                    attrs: {
                      ...(child.attrs ?? {}),
                      fontSize: size,
                    },
                  };
                }

                return child;
              }),
            };
          }

          return node;
        }),
      };

      editor.setDoc(editor.doc);
    },
  },
};
