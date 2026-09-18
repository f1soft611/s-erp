import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { EditorContent, useEditor } from '@tiptap/react';
import Placeholder from '@tiptap/extension-placeholder';
import StarterKit from '@tiptap/starter-kit';
import { AttachmentList } from './AttachmentList';
import { sanitizeHtml } from '../../utils/sanitizeHtml';

export type FeedCommentAttachment = { id: string; name: string; size?: number };
export type FeedCommentItem = {
  id: string | number;
  author: string;
  time: string;
  content: string;
  isDeleted?: boolean;
  isEditable?: boolean;
  attachments?: FeedCommentAttachment[];
  replies?: FeedCommentItem[];
};
export type CommentThreadProps = {
  comments?: FeedCommentItem[];
  onSubmitComment?: (content: string, files: File[]) => Promise<void> | void;
  onSubmitReply?: (
    commentId: string | number,
    content: string,
    files: File[],
    rootCommentId: string | number,
  ) => Promise<void> | void;
  onReply?: (commentId: string | number) => void;
  onEditComment?: (
    commentId: string | number,
    content: string,
    files: File[],
  ) => Promise<void> | void;
  onDeleteComment?: (commentId: string | number) => Promise<void> | void;
  onDownloadAttachment?: (
    commentId: string | number,
    attachmentId: string,
  ) => Promise<void> | void;
  onDeleteAttachment?: (
    commentId: string | number,
    attachmentId: string,
  ) => Promise<void> | void;
  isDark?: boolean;
  showComposer?: boolean;
  placeholder?: string;
  composerLabel?: string;
  submitLabel?: string;
};

export const sanitizeCommentHtml = sanitizeHtml;
export function isCommentSubmitKey(event: {
  key: string;
  shiftKey: boolean;
  isComposing: boolean;
}): boolean {
  return event.key === 'Enter' && !event.shiftKey && !event.isComposing;
}

function hasCommentText(html: string): boolean {
  if (typeof DOMParser === 'undefined')
    return html.replace(/<[^>]*>/g, '').trim().length > 0;
  return Boolean(
    new DOMParser().parseFromString(html, 'text/html').body.textContent?.trim(),
  );
}

type EditorProps = {
  initialContent?: string;
  label: string;
  fileInputLabel: string;
  placeholder: string;
  submitLabel: string;
  isDark: boolean;
  onSubmit: (content: string, files: File[]) => Promise<void> | void;
  onCancel?: () => void;
};
function CommentEditor({
  initialContent = '<p></p>',
  label,
  fileInputLabel,
  placeholder,
  submitLabel,
  isDark,
  onSubmit,
  onCancel,
}: EditorProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const submitRef = useRef<() => void>(() => undefined);
  const [files, setFiles] = useState<File[]>([]);
  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder })],
    content: initialContent || '<p></p>',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-label': label,
        'aria-multiline': 'true',
      },
    },
  });
  useEffect(() => {
    if (!editor) return;
    const nextContent = initialContent || '<p></p>';
    if (editor.getHTML() !== nextContent)
      editor.commands.setContent(nextContent);
  }, [editor, initialContent]);
  const submit = async () => {
    if (!editor) return;
    const editorHtml = editor.isEmpty
      ? editor.view.dom.innerHTML
      : editor.getHTML();
    const content = sanitizeCommentHtml(editorHtml);
    if (!hasCommentText(content)) return;
    try {
      await onSubmit(content, files);
      editor.commands.clearContent();
      setFiles([]);
    } catch {
      // Keep the editor content and selected files when the API rejects.
    }
  };
  submitRef.current = () => {
    void submit();
  };
  return (
    <Box
      sx={{
        mt: 1,
        minWidth: 0,
        border: `1px solid ${isDark ? 'rgba(148,163,184,0.24)' : 'rgba(148,163,184,0.3)'}`,
        borderRadius: 1.5,
        bgcolor: isDark ? 'rgba(15,23,42,0.76)' : '#fff',
        overflow: 'hidden',
      }}
      onKeyDownCapture={(event) => {
        if (!editor || event.target !== editor.view.dom) {
          return;
        }
        if (
          !isCommentSubmitKey({
            key: event.key,
            shiftKey: event.shiftKey,
            isComposing: event.nativeEvent.isComposing,
          })
        ) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        submitRef.current();
      }}
    >
      <Box
        sx={{
          minHeight: 42,
          px: 1,
          py: 0.5,
          '& .ProseMirror': {
            minHeight: 28,
            outline: 'none',
            fontSize: '0.86rem',
            lineHeight: 1.5,
            color: 'text.primary',
            '& p': { m: 0 },
            '& p.is-editor-empty:first-of-type::before': {
              content: 'attr(data-placeholder)',
              color: 'text.disabled',
              float: 'left',
              height: 0,
              pointerEvents: 'none',
            },
          },
        }}
      >
        <EditorContent editor={editor} />
      </Box>
      {files.length > 0 && (
        <Stack
          direction="row"
          sx={{ px: 1, pb: 0.75, flexWrap: 'wrap', gap: 0.5 }}
        >
          {files.map((file) => (
            <Typography
              key={`${file.name}-${file.lastModified}`}
              variant="caption"
            >
              {file.name}
            </Typography>
          ))}
        </Stack>
      )}
      <Stack
        direction="row"
        sx={{
          px: 0.75,
          py: 0.5,
          borderTop: '1px solid',
          borderColor: 'divider',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 0.5,
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          aria-label={fileInputLabel}
          onChange={(event) => {
            setFiles((current) => [
              ...current,
              ...Array.from(event.target.files ?? []),
            ]);
            event.target.value = '';
          }}
        />
        <IconButton
          size="small"
          aria-label={`${fileInputLabel} 추가`}
          onClick={() => fileInputRef.current?.click()}
        >
          <AttachFileOutlinedIcon fontSize="small" />
        </IconButton>
        {onCancel && (
          <Button size="small" onClick={onCancel}>
            취소
          </Button>
        )}
        <Button
          size="small"
          variant="contained"
          aria-label={label === '댓글 수정 입력' ? '댓글 수정 완료' : undefined}
          onClick={() => void submit()}
        >
          {submitLabel}
        </Button>
      </Stack>
    </Box>
  );
}

type ItemProps = {
  comment: FeedCommentItem;
  depth: number;
  rootCommentId: string | number;
  props: CommentThreadProps;
  replyTargetId: string | number | null;
  setReplyTargetId: (id: string | number | null) => void;
  editingCommentId: string | number | null;
  setEditingCommentId: (id: string | number | null) => void;
};
function CommentItem({
  comment,
  depth,
  rootCommentId,
  props,
  replyTargetId,
  setReplyTargetId,
  editingCommentId,
  setEditingCommentId,
}: ItemProps) {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const isDark = Boolean(props.isDark);
  const isEditing = editingCommentId === comment.id;
  const isReplying = replyTargetId === comment.id;
  const replyParentId = rootCommentId ?? comment.id;
  const isDeleted = comment.isDeleted === true;
  const canEditAttachments = isEditing;
  return (
    <Box
      sx={{
        mt: depth ? 0.75 : 1.25,
        pl: depth ? { xs: 1.5, sm: 3 } : 0,
        minWidth: 0,
      }}
    >
      <Box
        sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, minWidth: 0 }}
      >
        <Box
          sx={{
            width: 28,
            height: 28,
            flexShrink: 0,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.65rem',
            fontWeight: 700,
            bgcolor: isDark ? '#334155' : '#e2e8f0',
            color: isDark ? '#e2e8f0' : '#334155',
          }}
        >
          {comment.author.slice(0, 2)}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" sx={{ mb: 0.5, alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              {comment.author}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {comment.time}
            </Typography>
            <Box sx={{ ml: 'auto' }}>
              {!isDeleted && (
                <IconButton
                  size="small"
                  aria-label={`댓글 메뉴 ${comment.author}`}
                  onClick={(event) => setMenuAnchor(event.currentTarget)}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              )}
              <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={() => setMenuAnchor(null)}
              >
                <MenuItem
                  onClick={() => {
                    setEditingCommentId(comment.id);
                    setMenuAnchor(null);
                  }}
                >
                  댓글 수정 {comment.author}
                </MenuItem>
                <MenuItem
                  onClick={async () => {
                    setMenuAnchor(null);
                    await props.onDeleteComment?.(comment.id);
                  }}
                >
                  댓글 삭제 {comment.author}
                </MenuItem>
              </Menu>
            </Box>
          </Stack>
          <Box
            sx={{
              fontSize: '0.9rem',
              lineHeight: 1.7,
              overflowWrap: 'anywhere',
              '& p': { m: 0 },
              '& ul, & ol': { pl: 2.5, my: 0.5 },
            }}
            dangerouslySetInnerHTML={{
              __html: sanitizeCommentHtml(comment.content),
            }}
          />
          {comment.attachments && comment.attachments.length > 0 && (
            <Box sx={{ mt: 0.75, maxWidth: '100%' }}>
              <AttachmentList
                files={comment.attachments}
                isDark={isDark}
                mode={canEditAttachments ? 'edit' : 'view'}
                showActions
                onDownload={(attachmentId) =>
                  void props.onDownloadAttachment?.(comment.id, attachmentId)
                }
                onRemove={(attachmentId) => {
                  void Promise.resolve(
                    props.onDeleteAttachment?.(comment.id, attachmentId),
                  ).catch(() => undefined);
                }}
              />
            </Box>
          )}
          {!isDeleted && (
            <Button
              size="small"
              variant="text"
              onClick={() => {
                props.onReply?.(replyParentId);
                setReplyTargetId(isReplying ? null : comment.id);
              }}
              sx={{
                minWidth: 0,
                p: 0,
                mt: 0.5,
                color: 'text.secondary',
                fontWeight: 600,
              }}
            >
              답글
            </Button>
          )}
          {isEditing && !isDeleted && (
            <CommentEditor
              initialContent={comment.content}
              label="댓글 수정 입력"
              fileInputLabel="댓글 수정 첨부파일 선택"
              placeholder="댓글을 수정하세요"
              submitLabel="수정 완료"
              isDark={isDark}
              onCancel={() => setEditingCommentId(null)}
              onSubmit={async (content, files) => {
                await props.onEditComment?.(comment.id, content, files);
                setEditingCommentId(null);
              }}
            />
          )}
          {isReplying && !isDeleted && (
            <CommentEditor
              label="답글 입력"
              fileInputLabel="답글 첨부파일 선택"
              placeholder="답글을 입력하세요"
              submitLabel="답글 등록"
              isDark={isDark}
              onCancel={() => setReplyTargetId(null)}
              onSubmit={async (content, files) => {
                await props.onSubmitReply?.(
                  comment.id,
                  content,
                  files,
                  comment.id,
                );
                setReplyTargetId(null);
              }}
            />
          )}
          {comment.replies?.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              rootCommentId={rootCommentId}
              props={props}
              replyTargetId={replyTargetId}
              setReplyTargetId={setReplyTargetId}
              editingCommentId={editingCommentId}
              setEditingCommentId={setEditingCommentId}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function flattenReplies(replies: FeedCommentItem[] = []): FeedCommentItem[] {
  return replies.flatMap((reply) => [
    { ...reply, replies: [] },
    ...flattenReplies(reply.replies),
  ]);
}

export function TiptapCommentThread({
  comments = [],
  onSubmitComment,
  onSubmitReply,
  onReply,
  onEditComment,
  onDeleteComment,
  onDownloadAttachment,
  onDeleteAttachment,
  isDark = false,
  showComposer = true,
  placeholder = '댓글을 입력하세요',
  composerLabel = '댓글 입력',
  submitLabel = '등록',
}: CommentThreadProps) {
  const [replyTargetId, setReplyTargetId] = useState<string | number | null>(
    null,
  );
  const [editingCommentId, setEditingCommentId] = useState<
    string | number | null
  >(null);
  const props: CommentThreadProps = {
    comments,
    onSubmitComment,
    onSubmitReply,
    onReply,
    onEditComment,
    onDeleteComment,
    onDownloadAttachment,
    onDeleteAttachment,
    isDark,
    showComposer,
    placeholder,
    composerLabel,
    submitLabel,
  };
  return (
    <Box sx={{ minWidth: 0 }}>
      {comments.length > 0 && (
        <Box
          sx={{
            mt: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            pt: 1.5,
          }}
        >
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={{
                ...comment,
                replies: flattenReplies(comment.replies),
              }}
              depth={0}
              rootCommentId={comment.id}
              props={props}
              replyTargetId={replyTargetId}
              setReplyTargetId={setReplyTargetId}
              editingCommentId={editingCommentId}
              setEditingCommentId={setEditingCommentId}
            />
          ))}
        </Box>
      )}
      {showComposer && (
        <Box
          sx={{
            mt: 2,
            display: 'flex',
            gap: 1,
            alignItems: 'flex-start',
            minWidth: 0,
          }}
        >
          <Box
            sx={{
              width: 30,
              height: 30,
              flexShrink: 0,
              mt: 1,
              borderRadius: '50%',
              bgcolor: isDark ? '#1e293b' : '#e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.7rem',
              fontWeight: 700,
            }}
          >
            나
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <CommentEditor
              label={composerLabel}
              fileInputLabel="댓글 첨부파일 선택"
              placeholder={placeholder}
              submitLabel={submitLabel}
              isDark={isDark}
              onSubmit={async (content, files) => {
                await onSubmitComment?.(content, files);
              }}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
}
