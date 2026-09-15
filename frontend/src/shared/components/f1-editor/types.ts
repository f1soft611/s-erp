export type F1EditorMark =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'highlight'
  | 'code'
  | 'link'
  | 'fontSize';

export type F1EditorNodeType =
  | 'doc'
  | 'paragraph'
  | 'heading'
  | 'bulletList'
  | 'listItem'
  | 'section'
  | 'field'
  | 'approvalLine'
  | 'image'
  | 'table'
  | 'tableRow'
  | 'tableCell';

export type F1EditorTextNode = {
  type: 'text';
  text: string;
  marks?: F1EditorMark[];
  attrs?: {
    fontSize?: number;
    color?: string;
    backgroundColor?: string;
    align?: 'left' | 'center' | 'right';
    linkUrl?: string;
  };
};

export type F1EditorMentionNode = {
  type: 'mention';
  attrs: {
    id: string;
    label: string;
    type?: 'user' | 'department' | 'role';
  };
};

export type F1EditorInline =
  | F1EditorTextNode
  | F1EditorMentionNode
  | F1EditorImageNode;

export type F1EditorTableCellNode = {
  type: 'tableCell';
  attrs?: { colspan?: number; rowspan?: number };
  content?: F1EditorInline[];
};

export type F1EditorTableRowNode = {
  type: 'tableRow';
  content: F1EditorTableCellNode[];
};

export type F1EditorTableNode = {
  type: 'table';
  attrs: {
    rows: number;
    cols: number;
  };
  content: F1EditorTableRowNode[];
};

export type F1EditorImageNode = {
  type: 'image';
  attrs: {
    src: string;
    alt?: string;
    width?: number;
    align?: 'left' | 'center' | 'right';
  };
};

export type F1EditorNode =
  | {
      type: 'paragraph';
      attrs?: { align?: 'left' | 'center' | 'right' };
      content?: F1EditorInline[];
    }
  | {
      type: 'heading';
      attrs?: { level: 1 | 2 | 3 | 4 };
      content?: F1EditorInline[];
    }
  | {
      type: 'bulletList';
      content?: Array<{
        type: 'listItem';
        content?: F1EditorInline[];
      }>;
    }
  | {
      type: 'section';
      attrs?: { title?: string; code?: string };
      content?: F1EditorNode[];
    }
  | {
      type: 'field';
      attrs: {
        key: string;
        label: string;
        value?: string | number | boolean | null;
        required?: boolean;
      };
    }
  | {
      type: 'approvalLine';
      attrs: {
        approvers: string[];
        status?: 'pending' | 'approved' | 'rejected';
      };
    }
  | F1EditorImageNode
  | F1EditorTableNode;

export type F1EditorDocument = {
  type: 'doc';
  version: '1.0';
  meta?: {
    category?: string;
    writerId?: string;
    departmentId?: string;
    approvalId?: string;
    tenantId?: string;
  };
  content: F1EditorNode[];
};

export type F1EditorSchemaField = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number' | 'date' | 'checkbox';
  required?: boolean;
  options?: Array<{ label: string; value: string | number | boolean }>;
  defaultValue?: string | number | boolean | null;
};

export type F1EditorSchema = {
  fields: F1EditorSchemaField[];
  defaultDocument: F1EditorDocument;
};

export type F1EditorExtension = {
  id: string;
  name: string;
  enabled?: boolean;
  onPaste?: (
    event: ClipboardEvent,
    editor: F1EditorCore,
  ) => boolean | Promise<boolean>;
  onDrop?: (
    event: DragEvent,
    editor: F1EditorCore,
  ) => boolean | Promise<boolean>;
  commands?: Record<string, (...args: any[]) => void>;
};

export type F1EditorCore = {
  doc: F1EditorDocument;
  setDoc: (next: F1EditorDocument) => void;
  insertNode: (node: F1EditorNode) => void;
  insertTable: (rows: number, cols: number) => void;
  applyFontSize: (size: number) => void;
  toggleMark: (mark: F1EditorMark, enabled?: boolean) => void;
  pasteImage: (file: File) => Promise<void>;
  parseExcelPaste: (text: string, html?: string) => void;
};
