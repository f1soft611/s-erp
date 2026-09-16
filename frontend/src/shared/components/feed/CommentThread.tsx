import { Box, Button, Typography } from '@mui/material';

export type FeedCommentItem = {
  id: string | number;
  author: string;
  time: string;
  content: string;
  replies?: FeedCommentItem[];
};

export type CommentThreadProps = {
  comments?: FeedCommentItem[];
  draft?: string;
  onDraftChange?: (value: string) => void;
  onSubmitComment?: (content: string) => void;
  onReply?: (commentId: string | number) => void;
  isDark?: boolean;
  showComposer?: boolean;
  placeholder?: string;
  composerLabel?: string;
  submitLabel?: string;
};

function renderCommentTree(
  comments: FeedCommentItem[] = [],
  depth = 0,
  onReply?: (commentId: string | number) => void,
) {
  return comments.map((comment) => (
    <Box key={comment.id} sx={{ mt: 1.5, pl: depth ? 2 : 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.65rem',
            fontWeight: 700,
            background: '#e2e8f0',
            color: '#334155',
          }}
        >
          {comment.author.slice(1, 3)}
        </Box>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              {comment.author}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {comment.time}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
            {comment.content}
          </Typography>
          <Button
            size="small"
            variant="text"
            onClick={() => onReply?.(comment.id)}
            sx={{
              minWidth: 0,
              p: 0,
              fontWeight: 600,
              color: 'text.secondary',
              mt: 0.5,
            }}
          >
            답글
          </Button>
          {comment.replies && comment.replies.length > 0 && (
            <Box sx={{ mt: 1 }}>
              {renderCommentTree(comment.replies, 1, onReply)}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  ));
}

export function CommentThread({
  comments = [],
  draft = '',
  onDraftChange,
  onSubmitComment,
  onReply,
  isDark = false,
  showComposer = true,
  placeholder = '댓글을 입력하세요',
  composerLabel = '댓글 입력',
  submitLabel = '등록',
}: CommentThreadProps) {
  return (
    <Box>
      {comments.length > 0 && (
        <Box
          sx={{
            mt: 2,
            borderTop: `1px solid ${
              isDark ? 'rgba(148,163,184,0.18)' : 'rgba(148,163,184,0.18)'
            }`,
            pt: 1.5,
          }}
        >
          {renderCommentTree(comments, 0, onReply)}
        </Box>
      )}

      {showComposer && (
        <Box
          sx={{
            mt: 2,
            border: `1px solid ${
              isDark ? 'rgba(148,163,184,0.18)' : 'rgba(148,163,184,0.18)'
            }`,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            p: 1,
            bgcolor: isDark ? 'rgba(15, 23, 42, 0.7)' : '#ffffff',
          }}
        >
          <Box
            sx={{
              width: 30,
              height: 30,
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
          <Box
            component="input"
            value={draft}
            onChange={(event) => onDraftChange?.(event.target.value)}
            placeholder={placeholder}
            aria-label={composerLabel}
            sx={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              outline: 'none',
              color: 'text.primary',
              fontSize: '0.9rem',
            }}
          />
          <Button
            size="small"
            variant="contained"
            onClick={() => {
              const content = draft.trim();
              if (!content) {
                return;
              }
              onSubmitComment?.(content);
            }}
            sx={{ minWidth: 0, px: 1.5 }}
          >
            {submitLabel}
          </Button>
        </Box>
      )}
    </Box>
  );
}
