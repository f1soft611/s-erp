import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Divider,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined';
import FormatBoldOutlinedIcon from '@mui/icons-material/FormatBoldOutlined';
import FormatItalicOutlinedIcon from '@mui/icons-material/FormatItalicOutlined';
import FormatUnderlinedOutlinedIcon from '@mui/icons-material/FormatUnderlinedOutlined';
import StrikethroughSOutlinedIcon from '@mui/icons-material/StrikethroughSOutlined';
import HighlightAltOutlinedIcon from '@mui/icons-material/HighlightAltOutlined';
import CodeOutlinedIcon from '@mui/icons-material/CodeOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import type {
  F1EditorCore,
  F1EditorDocument,
  F1EditorExtension,
  F1EditorMark,
  F1EditorNode,
  F1EditorSchema,
  F1EditorTextNode,
} from './types';

export type F1EditorProps = {
  value: F1EditorDocument;
  schema: F1EditorSchema;
  onChange?: (next: F1EditorDocument) => void;
  onSubmit?: (next: F1EditorDocument) => void;
  readOnly?: boolean;
  toolbar?: boolean;
  showFooterActions?: boolean;
  extensions?: F1EditorExtension[];
};

const getTextNodeId = (path: number[]) => path.join('.');

const applyMarkToTextNode = (
  node: F1EditorTextNode,
  mark: F1EditorMark,
  enabled = true,
  extraAttrs: Partial<F1EditorTextNode['attrs']> = {},
): F1EditorTextNode => {
  const marks = node.marks ?? [];
  const nextMarks = enabled
    ? Array.from(new Set([...marks, mark]))
    : marks.filter((item) => item !== mark);

  const nextAttrs = { ...(node.attrs ?? {}) };
  if (mark === 'link') {
    if (enabled && extraAttrs.linkUrl) {
      nextAttrs.linkUrl = extraAttrs.linkUrl;
    } else if (!enabled) {
      delete nextAttrs.linkUrl;
    }
  }

  return {
    ...node,
    marks: nextMarks,
    attrs: Object.keys(nextAttrs).length ? nextAttrs : undefined,
  };
};

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeRepeatedText = (value: string, previous: string) => {
  if (!value) {
    return value;
  }

  if (value === previous) {
    return value;
  }

  const repeatedMatch = value.match(/^(.+?)\1+$/);
  if (repeatedMatch?.[1]) {
    return repeatedMatch[1];
  }

  if (previous && value.startsWith(previous)) {
    const tail = value.slice(previous.length);
    if (tail.startsWith(previous)) {
      return (
        previous + tail.replace(new RegExp(`^${escapeRegExp(previous)}`), '')
      );
    }
  }

  return value;
};

const updateSelectedTextNode = (
  nodes: F1EditorNode[],
  path: number[],
  targetIds: Set<string>,
  mark: F1EditorMark,
  enabled: boolean,
  extraAttrs: Partial<F1EditorTextNode['attrs']> = {},
): F1EditorNode[] =>
  nodes.map((node, index) => {
    const currentPath = [...path, index];

    if (node.type === 'paragraph' || node.type === 'heading') {
      return {
        ...node,
        content: (node.content ?? []).map((child, childIndex) => {
          if (child.type !== 'text') {
            return child;
          }

          const childId = getTextNodeId([...currentPath, childIndex]);
          return targetIds.has(childId)
            ? applyMarkToTextNode(child, mark, enabled, extraAttrs)
            : child;
        }),
      };
    }

    if (node.type === 'section') {
      return {
        ...node,
        content: node.content
          ? updateSelectedTextNode(
              node.content,
              currentPath,
              targetIds,
              mark,
              enabled,
              extraAttrs,
            )
          : node.content,
      };
    }

    if (node.type === 'bulletList') {
      return {
        ...node,
        content: (node.content ?? []).map((item, itemIndex) => ({
          ...item,
          content: (item.content ?? []).map((child, childIndex) => {
            if (child.type !== 'text') {
              return child;
            }

            const childId = getTextNodeId([
              ...currentPath,
              itemIndex,
              childIndex,
            ]);
            return targetIds.has(childId)
              ? applyMarkToTextNode(child, mark, enabled, extraAttrs)
              : child;
          }),
        })),
      };
    }

    if (node.type === 'table') {
      return {
        ...node,
        content: node.content.map((row, rowIndex) => ({
          ...row,
          content: row.content.map((cell, cellIndex) => ({
            ...cell,
            content: (cell.content ?? []).map((child, childIndex) => {
              if (child.type !== 'text') {
                return child;
              }

              const childId = getTextNodeId([
                ...currentPath,
                rowIndex,
                cellIndex,
                childIndex,
              ]);
              return targetIds.has(childId)
                ? applyMarkToTextNode(child, mark, enabled, extraAttrs)
                : child;
            }),
          })),
        })),
      };
    }

    return node;
  });

export function F1Editor({
  value,
  schema,
  onChange,
  onSubmit,
  readOnly = false,
  toolbar = true,
  showFooterActions = true,
  extensions = [],
}: F1EditorProps) {
  const [doc, setDoc] = useState<F1EditorDocument>(value);
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [attachments, setAttachments] = useState<
    Array<{ name: string; size: number; type: string }>
  >([]);
  const selectionRef = useRef<string | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const editableElementRefs = useRef<Record<number, HTMLElement | null>>({});
  const committedTextRef = useRef<Record<number, string>>({});
  const pendingTextRef = useRef<Record<number, string>>({});
  const isComposingRef = useRef(false);
  const isEditingRef = useRef(false);
  const docRef = useRef<F1EditorDocument>(value);

  useEffect(() => {
    const nextValues: Record<number, string> = {};

    value.content.forEach((node, index) => {
      if (
        (node.type === 'paragraph' || node.type === 'heading') &&
        node.content?.[0]?.type === 'text'
      ) {
        nextValues[index] = node.content[0].text;
      }
    });

    committedTextRef.current = nextValues;
    pendingTextRef.current = {};
    docRef.current = value;

    if (!isEditingRef.current && doc !== value) {
      setDoc(value);
    }
  }, [value]);

  const syncDoc = (next: F1EditorDocument) => {
    setDoc((prev) => {
      const resolved = next ?? prev;
      docRef.current = resolved;
      onChange?.(resolved);
      return resolved;
    });
  };

  const setEditableElementRef = (index: number, value: string) => {
    return (element: HTMLElement | null) => {
      editableElementRefs.current[index] = element;

      if (
        !element ||
        isEditingRef.current ||
        pendingTextRef.current[index] !== undefined
      ) {
        return;
      }

      if ((element.textContent ?? '') !== value) {
        element.textContent = value;
      }
    };
  };

  const getEditableTextValue = (index: number, element: HTMLElement) => {
    const currentNode = docRef.current.content[index];
    const rawValue = (element.textContent ?? '').replace(/\u00A0/g, ' ');

    if (currentNode?.type !== 'heading') {
      return rawValue;
    }

    return rawValue.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const finalizeEditableElements = () => {
    let nextDoc = docRef.current;
    let hasChanges = false;

    Object.entries(editableElementRefs.current).forEach(([key, element]) => {
      const index = Number(key);
      const currentNode = nextDoc.content[index];

      if (
        !element ||
        !currentNode ||
        (currentNode.type !== 'paragraph' && currentNode.type !== 'heading')
      ) {
        return;
      }

      const nextText = normalizeRepeatedText(
        getEditableTextValue(index, element),
        committedTextRef.current[index] ?? '',
      );

      if (nextText === committedTextRef.current[index]) {
        return;
      }

      hasChanges = true;
      committedTextRef.current[index] = nextText;
      pendingTextRef.current[index] = nextText;
      nextDoc = {
        ...nextDoc,
        content: nextDoc.content.map((node, nodeIndex) => {
          if (nodeIndex !== index) {
            return node;
          }

          if (node.type !== 'paragraph' && node.type !== 'heading') {
            return node;
          }

          return {
            ...node,
            content: [
              {
                type: 'text',
                text: nextText,
                marks:
                  currentNode.content?.[0]?.type === 'text'
                    ? currentNode.content[0].marks
                    : undefined,
              },
            ],
          } as F1EditorNode;
        }),
      };
    });

    if (hasChanges) {
      pendingTextRef.current = {};
      syncDoc(nextDoc);
    }

    return nextDoc;
  };

  const handleAttachmentSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.type.startsWith('image/')) {
      await editor.pasteImage(file);
    }

    setAttachments((prev) => [
      ...prev,
      {
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
      },
    ]);
    event.target.value = '';
  };

  const getSelectedTextIds = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return [];
    }

    const range = selection.getRangeAt(0);
    const fragment = range.cloneContents();
    const ids = Array.from(fragment.querySelectorAll('[data-f1-text-node-id]'))
      .map((element) => (element as HTMLElement).dataset.f1TextNodeId)
      .filter((id): id is string => Boolean(id));

    const getClosestTextNodeId = (node: Node | null): string | null => {
      if (!node) {
        return null;
      }

      const element =
        node.nodeType === Node.ELEMENT_NODE
          ? (node as Element)
          : node.parentElement;

      return (
        element
          ?.closest('[data-f1-text-node-id]')
          ?.getAttribute('data-f1-text-node-id') ?? null
      );
    };

    const commonContainer = range.commonAncestorContainer;
    const commonId = getClosestTextNodeId(commonContainer);
    const anchorId = getClosestTextNodeId(selection.anchorNode);
    const focusId = getClosestTextNodeId(selection.focusNode);

    if (commonId && !ids.includes(commonId)) {
      ids.push(commonId);
    }

    if (anchorId && !ids.includes(anchorId)) {
      ids.push(anchorId);
    }

    if (focusId && !ids.includes(focusId)) {
      ids.push(focusId);
    }

    const nextIds = [...new Set(ids)];
    selectionRef.current = nextIds[0] ?? selectionRef.current ?? null;
    return nextIds;
  };

  const toggleMark = (mark: F1EditorMark, enabled = true) => {
    const selectedIds = getSelectedTextIds();
    if (!selectedIds.length) {
      return;
    }

    const nextDoc: F1EditorDocument = {
      ...doc,
      content: updateSelectedTextNode(
        doc.content,
        [],
        new Set(selectedIds),
        mark,
        enabled,
      ),
    };

    syncDoc(nextDoc);
  };

  const toggleLink = (nextUrl?: string) => {
    const selectedIds = getSelectedTextIds();
    if (!selectedIds.length) {
      return;
    }

    const incomingUrl =
      nextUrl ?? window.prompt('링크 URL을 입력하세요', 'https://');
    if (!incomingUrl) {
      return;
    }

    const nextDoc: F1EditorDocument = {
      ...doc,
      content: updateSelectedTextNode(
        doc.content,
        [],
        new Set(selectedIds),
        'link',
        true,
        { linkUrl: incomingUrl },
      ),
    };

    syncDoc(nextDoc);
  };

  const editor: F1EditorCore = {
    doc,
    setDoc: syncDoc,
    insertNode: (node: F1EditorNode) => {
      syncDoc({
        ...doc,
        content: [...doc.content, node],
      });
    },
    insertTable: (rows: number, cols: number) => {
      const tableNode: F1EditorNode = {
        type: 'table',
        attrs: { rows, cols },
        content: Array.from({ length: rows }, (_, rowIndex) => ({
          type: 'tableRow',
          content: Array.from({ length: cols }, (_, colIndex) => ({
            type: 'tableCell',
            attrs: { colspan: 1, rowspan: 1 },
            content: [
              {
                type: 'text',
                text: rowIndex === 0 && colIndex === 0 ? '제목' : '',
              },
            ],
          })),
        })),
      };

      syncDoc({
        ...doc,
        content: [...doc.content, tableNode],
      });
    },
    applyFontSize: (size: number) => {
      const nextDoc: F1EditorDocument = {
        ...doc,
        content: doc.content.map((node) => {
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

      syncDoc(nextDoc);
    },
    toggleMark,
    pasteImage: async (file: File) => {
      const uploadImage = extensions.find((ext) => ext.id === 'f1-image-paste');
      if (!uploadImage?.onPaste) {
        return;
      }

      const fakeEvent = {
        clipboardData: {
          items: [
            {
              type: file.type,
              getAsFile: () => file,
            },
          ],
        },
      } as unknown as ClipboardEvent;

      await uploadImage.onPaste(fakeEvent, editor);
    },
    parseExcelPaste: (text: string, html?: string) => {
      const tableLike =
        /<table|\t|\r?\n/.test(html ?? '') || /(\t|\r?\n)/.test(text);
      if (!tableLike) {
        return;
      }

      const lines = text
        .replace(/\r\n/g, '\n')
        .split('\n')
        .filter((line) => line.trim() !== '');

      if (!lines.length) {
        return;
      }

      const rows = lines.map((line) => line.split(/\t/));
      const cols = Math.max(...rows.map((row) => row.length));

      const tableNode: F1EditorNode = {
        type: 'table',
        attrs: { rows: rows.length, cols },
        content: rows.map((row) => ({
          type: 'tableRow',
          content: Array.from({ length: cols }, (_, index) => ({
            type: 'tableCell',
            content: [{ type: 'text', text: row[index] ?? '' }],
          })),
        })),
      };

      syncDoc({
        ...doc,
        content: [...doc.content, tableNode],
      });
    },
  };

  const handlePaste = async (event: React.ClipboardEvent<HTMLDivElement>) => {
    for (const extension of extensions) {
      if (extension.enabled === false) {
        continue;
      }

      if (extension.onPaste) {
        const handled = await extension.onPaste(event.nativeEvent, editor);
        if (handled) {
          return;
        }
      }
    }
  };

  const handleFieldChange = (
    key: string,
    nextValue: string | number | boolean | null,
  ) => {
    const next = {
      ...doc,
      content: doc.content.map((node) => {
        if (node.type !== 'field') {
          return node;
        }

        if (node.attrs.key !== key) {
          return node;
        }

        return {
          ...node,
          attrs: {
            ...node.attrs,
            value: nextValue,
          },
        };
      }),
    };

    syncDoc(next);
  };

  const updateEditableNodeValue = (index: number, nextText: string) => {
    const currentNode = docRef.current.content[index];
    if (
      !currentNode ||
      (currentNode.type !== 'paragraph' && currentNode.type !== 'heading')
    ) {
      return;
    }

    const previousText =
      currentNode.content?.[0]?.type === 'text'
        ? currentNode.content[0].text
        : '';

    if (previousText === nextText) {
      return;
    }

    const previousMarks =
      currentNode.content?.[0]?.type === 'text'
        ? currentNode.content[0].marks
        : undefined;

    const nextContent: F1EditorNode[] = docRef.current.content.map(
      (node, nodeIndex) => {
        if (nodeIndex !== index) {
          return node;
        }

        if (node.type !== 'paragraph' && node.type !== 'heading') {
          return node;
        }

        return {
          ...node,
          content: [
            {
              type: 'text',
              text: nextText,
              marks: previousMarks,
            },
          ],
        } as F1EditorNode;
      },
    );

    const next = {
      ...docRef.current,
      content: nextContent,
    };

    committedTextRef.current[index] = nextText;
    docRef.current = next;
    syncDoc(next);
  };

  const handleEditableTextInput = (
    index: number,
    event: React.FormEvent<HTMLElement>,
  ) => {
    const nativeEvent = event.nativeEvent as InputEvent;
    const isCompositionInput =
      nativeEvent?.isComposing ||
      nativeEvent?.inputType?.includes('composition') ||
      isComposingRef.current;

    if (isCompositionInput) {
      return;
    }

    isEditingRef.current = true;
    pendingTextRef.current[index] = event.currentTarget.textContent ?? '';
  };

  const renderInlineContent = (
    content: Array<any>,
    pathPrefix: number[],
    defaultFontWeight = 400,
  ): React.ReactNode =>
    content.map((item, itemIndex) => {
      const currentPath = [...pathPrefix, itemIndex];

      if (item.type === 'text') {
        const id = getTextNodeId(currentPath);
        const marks = item.marks ?? [];
        const textStyle: React.CSSProperties = {
          fontWeight: marks.includes('bold') ? 700 : defaultFontWeight,
          fontStyle: marks.includes('italic') ? 'italic' : 'normal',
          textDecoration:
            [
              marks.includes('underline') ? 'underline' : '',
              marks.includes('strike') ? 'line-through' : '',
            ]
              .filter(Boolean)
              .join(' ') || 'none',
          backgroundColor: marks.includes('highlight')
            ? '#fff7b3'
            : 'transparent',
          fontSize: item.attrs?.fontSize
            ? `${item.attrs.fontSize}px`
            : undefined,
          color: item.attrs?.color ?? 'inherit',
          fontFamily: marks.includes('code')
            ? 'ui-monospace, monospace'
            : 'inherit',
          borderRadius: marks.includes('code') ? 4 : undefined,
          padding: marks.includes('code') ? '2px 4px' : undefined,
          background: marks.includes('code') ? '#e2e8f0' : undefined,
        };

        const spanNode = (
          <span
            key={id}
            data-f1-text-node-id={id}
            onMouseUp={() => {
              selectionRef.current = id;
              getSelectedTextIds();
            }}
            style={textStyle}
          >
            {item.text}
          </span>
        );

        if (marks.includes('link') && item.attrs?.linkUrl) {
          return (
            <a
              key={`${id}-link`}
              href={item.attrs.linkUrl}
              target="_blank"
              rel="noreferrer"
              style={{ color: '#2563eb', textDecoration: 'underline' }}
              onClick={(event) => event.preventDefault()}
            >
              {spanNode}
            </a>
          );
        }

        return spanNode;
      }

      if (item.type === 'mention') {
        return (
          <span key={getTextNodeId(currentPath)} style={{ color: '#2563eb' }}>
            @{item.attrs.label}
          </span>
        );
      }

      return null;
    });

  const renderNode = (node: F1EditorNode, index: number): React.ReactNode => {
    if (node.type === 'heading') {
      const contents = node.content ?? [];
      const hasActualText = contents.some(
        (item) => item.type === 'text' && item.text.trim() !== '',
      );
      const placeholderText = '제목을 입력하세요';

      const textNodeId = getTextNodeId([index, 0]);
      const renderedText = contents
        .filter((item) => item.type === 'text')
        .map((item) => item.text)
        .join('');

      return (
        <Typography
          key={index}
          ref={setEditableElementRef(index, renderedText)}
          variant={node.attrs?.level === 1 ? 'h4' : 'h6'}
          data-placeholder={placeholderText}
          data-f1-text-node-id={textNodeId}
          aria-label={hasActualText ? undefined : placeholderText}
          sx={{
            mb: 1,
            display: 'block',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            border: 'none',
            outline: 'none',
            borderBottom: '1px solid rgba(148, 163, 184, 0.22)',
            pb: 1.5,
            mt: 0.5,
            fontSize: '1.25rem',
            lineHeight: 1.4,
            letterSpacing: '-0.02em',
            fontWeight: 700,
            color: 'text.primary',
            '&:empty:before': {
              content: 'attr(data-placeholder)',
              color: '#94a3b8',
              display: 'block',
            },
            '&:focus': {
              outline: 'none',
              border: 'none',
              borderBottom: '1px solid rgba(148, 163, 184, 0.22)',
            },
          }}
          onMouseDown={(event) => {
            event.currentTarget.focus();
          }}
          onMouseUp={getSelectedTextIds}
          onKeyUp={getSelectedTextIds}
          onFocus={() => {
            isEditingRef.current = true;
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === 'NumpadEnter') {
              event.preventDefault();
            }
          }}
          onBeforeInput={(event) => {
            const nativeEvent = event.nativeEvent as InputEvent;
            if (
              nativeEvent?.isComposing ||
              nativeEvent?.inputType?.includes('composition')
            ) {
              isComposingRef.current = true;
              isEditingRef.current = true;
            }
          }}
          onCompositionStart={() => {
            isComposingRef.current = true;
            isEditingRef.current = true;
          }}
          onCompositionEnd={(event) => {
            isComposingRef.current = false;
            isEditingRef.current = true;
            pendingTextRef.current[index] =
              event.currentTarget.textContent ?? '';
          }}
          onBlur={(event) => {
            if (isComposingRef.current) {
              return;
            }

            isEditingRef.current = false;
            const nextText = (event.currentTarget.textContent ?? '')
              .replace(/\u00A0/g, ' ')
              .replace(/\r?\n/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
            if (nextText !== committedTextRef.current[index]) {
              updateEditableNodeValue(index, nextText);
            }
            delete pendingTextRef.current[index];
          }}
          contentEditable={!readOnly}
          tabIndex={readOnly ? undefined : 0}
          suppressContentEditableWarning
          onInput={(event) => handleEditableTextInput(index, event)}
        >
          {readOnly && hasActualText ? renderedText : null}
        </Typography>
      );
    }

    if (node.type === 'paragraph') {
      const contents = node.content ?? [];
      const hasActualText = contents.some(
        (item) => item.type === 'text' && item.text.trim() !== '',
      );
      const placeholderText = '내용을 입력하세요';

      const textNodeId = getTextNodeId([index, 0]);
      const renderedText = contents
        .filter((item) => item.type === 'text')
        .map((item) => item.text)
        .join('');

      return (
        <Typography
          key={index}
          ref={setEditableElementRef(index, renderedText)}
          variant="body1"
          data-placeholder={placeholderText}
          data-f1-text-node-id={textNodeId}
          aria-label={hasActualText ? undefined : placeholderText}
          sx={{
            mb: 1.5,
            whiteSpace: 'pre-wrap',
            display: 'block',
            border: 'none',
            outline: 'none',
            minHeight: 170,
            pt: 1,
            fontSize: '1rem',
            fontWeight: 400,
            lineHeight: 1.8,
            color: 'text.primary',
            '&:empty:before': {
              content: 'attr(data-placeholder)',
              color: '#94a3b8',
              display: 'block',
            },
            '&:focus': { outline: 'none', border: 'none' },
          }}
          onMouseDown={(event) => {
            event.currentTarget.focus();
          }}
          onMouseUp={getSelectedTextIds}
          onKeyUp={getSelectedTextIds}
          onFocus={() => {
            isEditingRef.current = true;
          }}
          onBeforeInput={(event) => {
            const nativeEvent = event.nativeEvent as InputEvent;
            if (
              nativeEvent?.isComposing ||
              nativeEvent?.inputType?.includes('composition')
            ) {
              isComposingRef.current = true;
              isEditingRef.current = true;
            }
          }}
          onCompositionStart={() => {
            isComposingRef.current = true;
            isEditingRef.current = true;
          }}
          onCompositionEnd={(event) => {
            isComposingRef.current = false;
            isEditingRef.current = true;
            pendingTextRef.current[index] =
              event.currentTarget.textContent ?? '';
          }}
          onBlur={(event) => {
            if (isComposingRef.current) {
              return;
            }

            isEditingRef.current = false;
            const nextText = (event.currentTarget.textContent ?? '').replace(
              /\u00A0/g,
              ' ',
            );
            if (nextText !== committedTextRef.current[index]) {
              updateEditableNodeValue(index, nextText);
            }
            delete pendingTextRef.current[index];
          }}
          contentEditable={!readOnly}
          tabIndex={readOnly ? undefined : 0}
          suppressContentEditableWarning
          onInput={(event) => handleEditableTextInput(index, event)}
        >
          {readOnly && hasActualText ? renderedText : null}
        </Typography>
      );
    }

    if (node.type === 'field') {
      const field = schema.fields.find((item) => item.key === node.attrs.key);
      if (!field) {
        return null;
      }

      return (
        <Box key={index} sx={{ my: 1.5 }}>
          <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 700 }}>
            {field.label}
          </Typography>

          {field.type === 'textarea' ? (
            <TextField
              fullWidth
              multiline
              minRows={4}
              value={String(node.attrs.value ?? '')}
              onChange={(e) =>
                handleFieldChange(node.attrs.key, e.target.value)
              }
              disabled={readOnly}
            />
          ) : field.type === 'checkbox' ? (
            <Button
              variant={Boolean(node.attrs.value) ? 'contained' : 'outlined'}
              onClick={() =>
                handleFieldChange(node.attrs.key, !Boolean(node.attrs.value))
              }
              disabled={readOnly}
            >
              {Boolean(node.attrs.value) ? '사용' : '미사용'}
            </Button>
          ) : (
            <TextField
              fullWidth
              value={String(node.attrs.value ?? '')}
              onChange={(e) =>
                handleFieldChange(node.attrs.key, e.target.value)
              }
              disabled={readOnly}
            />
          )}
        </Box>
      );
    }

    if (node.type === 'section') {
      return (
        <Box key={index} sx={{ my: 2 }}>
          <Divider sx={{ mb: 1 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            {node.attrs?.title ?? '섹션'}
          </Typography>
          {node.content?.map((child, childIndex) =>
            renderNode(child, childIndex),
          )}
        </Box>
      );
    }

    if (node.type === 'table') {
      return (
        <Box key={index} sx={{ my: 2, overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              border: '1px solid #d0d7de',
            }}
          >
            <tbody>
              {node.content.map((row, rowIndex) => (
                <tr key={`${index}-${rowIndex}`}>
                  {row.content.map((cell, cellIndex) => (
                    <td
                      key={`${index}-${rowIndex}-${cellIndex}`}
                      style={{
                        border: '1px solid #d0d7de',
                        padding: '8px 12px',
                        minWidth: 120,
                      }}
                    >
                      {renderInlineContent(cell.content ?? [], [
                        index,
                        rowIndex,
                        cellIndex,
                      ])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      );
    }

    if (node.type === 'image') {
      return (
        <Box
          key={index}
          sx={{
            my: 2,
            display: 'flex',
            justifyContent:
              node.attrs.align === 'center' ? 'center' : 'flex-start',
          }}
        >
          <img
            src={node.attrs.src}
            alt={node.attrs.alt ?? '첨부 이미지'}
            style={{
              maxWidth: '100%',
              width: node.attrs.width ?? 720,
              borderRadius: 8,
            }}
          />
        </Box>
      );
    }

    return null;
  };

  const toolbarOptions = [
    {
      label: '굵게',
      icon: <FormatBoldOutlinedIcon fontSize="small" />,
      action: () => toggleMark('bold'),
    },
    {
      label: '기울임',
      icon: <FormatItalicOutlinedIcon fontSize="small" />,
      action: () => toggleMark('italic'),
    },
    {
      label: '밑줄',
      icon: <FormatUnderlinedOutlinedIcon fontSize="small" />,
      action: () => toggleMark('underline'),
    },
    {
      label: '취소선',
      icon: <StrikethroughSOutlinedIcon fontSize="small" />,
      action: () => toggleMark('strike'),
    },
    {
      label: '하이라이트',
      icon: <HighlightAltOutlinedIcon fontSize="small" />,
      action: () => toggleMark('highlight'),
    },
    {
      label: '코드',
      icon: <CodeOutlinedIcon fontSize="small" />,
      action: () => toggleMark('code'),
    },
    {
      label: '링크',
      icon: <LinkOutlinedIcon fontSize="small" />,
      action: () => toggleLink(),
    },
    {
      label: '테이블',
      icon: <TableChartOutlinedIcon fontSize="small" />,
      action: () => editor.insertTable(2, 3),
    },
    {
      label: '이미지',
      icon: <ImageOutlinedIcon fontSize="small" />,
      action: () => attachmentInputRef.current?.click(),
    },
  ];

  const formatFileSize = (size: number) => {
    if (size < 1024) return `${size}B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
    return `${(size / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <Box
      sx={{
        border: 'none',
        borderRadius: 0,
        overflow: 'hidden',
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        height: '100%',
        boxShadow: 'none',
      }}
      onPaste={handlePaste}
    >
      <Box
        sx={{
          //   display: 'grid',
          gap: 1,
          p: 2,
          pb: 1,
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
        }}
      >
        {doc.content.map((node, index) => renderNode(node, index))}
      </Box>

      {attachments.length > 0 && (
        <>
          <Divider sx={{ borderColor: 'rgba(148,163,184,0.28)' }} />
          <Box sx={{ px: 2, py: 1.5, display: 'grid', gap: 1 }}>
            {attachments.map((file, index) => (
              <Box
                key={`${file.name}-${index}`}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                  px: 1.25,
                  py: 0.9,
                  borderRadius: 1.5,
                  border: '1px solid rgba(148,163,184,0.28)',
                  bgcolor: 'rgba(148,163,184,0.03)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <Box
                    sx={{
                      width: 26,
                      height: 26,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 0.75,
                      bgcolor: '#dbeafe',
                      color: '#1d4ed8',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {file.type.startsWith('image/')
                      ? 'IMG'
                      : file.name.split('.').pop()?.toUpperCase() || 'FILE'}
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {file.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatFileSize(file.size)}
                    </Typography>
                  </Box>
                </Box>

                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  sx={{ minWidth: 0, px: 1.25, borderRadius: 1 }}
                >
                  ↓
                </Button>
              </Box>
            ))}
          </Box>
        </>
      )}

      {toolbar && (
        <Box
          sx={{
            borderTop: '1px solid rgba(148,163,184,0.2)',
            px: 1.5,
            py: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            bgcolor: 'rgba(148, 163, 184, 0.03)',
          }}
        >
          <Box
            sx={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <IconButton
              size="small"
              aria-label="툴바 열기"
              onClick={() => setToolbarOpen((open) => !open)}
              sx={{
                border: '1px solid rgba(148,163,184,0.4)',
                borderRadius: 1,
                width: 32,
                height: 32,
                bgcolor: 'background.paper',
              }}
            >
              <FormatBoldOutlinedIcon fontSize="small" />
            </IconButton>

            <IconButton
              size="small"
              aria-label="첨부 파일"
              onClick={() => attachmentInputRef.current?.click()}
              sx={{
                border: '1px solid rgba(148,163,184,0.4)',
                borderRadius: 1,
                width: 32,
                height: 32,
                bgcolor: 'background.paper',
              }}
            >
              <AttachFileOutlinedIcon fontSize="small" />
            </IconButton>

            <input
              ref={attachmentInputRef}
              type="file"
              accept="image/*,.xlsx,.xls,.csv,.pdf"
              hidden
              onChange={handleAttachmentSelect}
              aria-label="첨부 파일 선택"
            />

            {toolbarOpen && (
              <Box
                sx={{
                  position: 'absolute',
                  left: 0,
                  bottom: 'calc(100% + 8px)',
                  zIndex: 2,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 0.75,
                  p: 1,
                  borderRadius: 2,
                  border: '1px solid rgba(148,163,184,0.25)',
                  bgcolor: 'rgba(15, 23, 42, 0.96)',
                  boxShadow: '0 10px 25px rgba(15, 23, 42, 0.24)',
                }}
              >
                {toolbarOptions.map((action) => (
                  <Button
                    key={action.label}
                    size="small"
                    variant="contained"
                    onClick={action.action}
                    startIcon={action.icon}
                    sx={{
                      minWidth: 0,
                      whiteSpace: 'nowrap',
                      borderRadius: 1,
                      px: 1.25,
                      py: 0.75,
                      bgcolor: 'rgba(59, 130, 246, 0.18)',
                      color: '#e2e8f0',
                      '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.3)' },
                    }}
                  >
                    {action.label}
                  </Button>
                ))}
              </Box>
            )}
          </Box>

          {showFooterActions && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                variant="contained"
                onClick={() => onSubmit?.(finalizeEditableElements())}
                disabled={readOnly}
              >
                등록
              </Button>
              <Button variant="outlined" disabled={readOnly}>
                취소
              </Button>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
