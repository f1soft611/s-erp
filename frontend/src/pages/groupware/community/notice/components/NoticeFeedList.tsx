import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';
import BookmarkBorderOutlinedIcon from '@mui/icons-material/BookmarkBorderOutlined';
import type { NoticeCommentItem, NoticeFeedItem } from '../data/noticeData';

type NoticeFeedListProps = {
  items: NoticeFeedItem[];
  isDark: boolean;
  expandedNoticeId?: number | null;
  onToggleExpand?: (id: number) => void;
};

function getFileIconMeta(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, { bg: string; color: string; label: string }> = {
    pdf: { bg: '#fecaca', color: '#991b1b', label: 'PDF' },
    xls: { bg: '#bbf7d0', color: '#166534', label: 'XLS' },
    xlsx: { bg: '#bbf7d0', color: '#166534', label: 'XLSX' },
    doc: { bg: '#bfdbfe', color: '#1d4ed8', label: 'DOC' },
    docx: { bg: '#bfdbfe', color: '#1d4ed8', label: 'DOCX' },
    ppt: { bg: '#fed7aa', color: '#b45309', label: 'PPT' },
    pptx: { bg: '#fed7aa', color: '#b45309', label: 'PPTX' },
    png: { bg: '#ddd6fe', color: '#5b21b6', label: 'PNG' },
    jpg: { bg: '#d1fae5', color: '#065f46', label: 'JPG' },
    jpeg: { bg: '#d1fae5', color: '#065f46', label: 'JPG' },
    zip: { bg: '#e5e7eb', color: '#374151', label: 'ZIP' },
    hwp: { bg: '#dbeafe', color: '#1d4ed8', label: 'HWP' },
  };

  return map[extension] ?? { bg: '#e2e8f0', color: '#475569', label: 'FILE' };
}

function renderCommentTree(comments: NoticeCommentItem[] = [], depth = 0) {
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
            <Box sx={{ mt: 1 }}>{renderCommentTree(comment.replies, 1)}</Box>
          )}
        </Box>
      </Box>
    </Box>
  ));
}

export function NoticeFeedList({
  items,
  isDark,
  expandedNoticeId,
  onToggleExpand,
}: NoticeFeedListProps) {
  return (
    <Stack spacing={2}>
      {items.map((item) => {
        const isExpanded = expandedNoticeId === item.id;
        const displayBody = isExpanded ? item.body : item.summary;

        return (
          <Card
            key={item.id}
            sx={{
              borderRadius: 3,
              border: `1px solid ${
                isDark ? 'rgba(148,163,184,0.18)' : 'rgba(148,163,184,0.18)'
              }`,
              boxShadow: 'none',
              bgcolor: item.highlight
                ? isDark
                  ? 'rgba(30, 41, 59, 0.9)'
                  : '#fff7ed'
                : isDark
                  ? 'rgba(15, 23, 42, 0.75)'
                  : '#ffffff',
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}
              >
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    background: isDark
                      ? 'linear-gradient(135deg, #60a5fa, #a78bfa)'
                      : 'linear-gradient(135deg, #dbeafe, #ede9fe)',
                    color: isDark ? '#eff6ff' : '#1f2937',
                  }}
                >
                  {item.meta.slice(1, 3)}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {item.meta.split('·')[0].trim()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.meta}
                  </Typography>
                </Box>
                <Chip
                  label={item.state}
                  size="small"
                  sx={{
                    bgcolor: item.highlight
                      ? '#f59e0b'
                      : isDark
                        ? 'rgba(59,130,246,0.18)'
                        : '#dbeafe',
                    color: item.highlight ? '#fff' : '#2563eb',
                    fontWeight: 700,
                  }}
                />
              </Box>

              <Typography
                variant="h6"
                sx={{
                  fontSize: '1.25rem',
                  lineHeight: 1.4,
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  mb: 1.5,
                  color: 'text.primary',
                }}
              >
                {item.title}
              </Typography>

              <Typography
                variant="body1"
                sx={{
                  fontSize: '1rem',
                  fontWeight: 400,
                  color: 'text.primary',
                  lineHeight: 1.8,
                  whiteSpace: 'pre-line',
                  display: isExpanded ? 'block' : '-webkit-box',
                  WebkitLineClamp: isExpanded ? 'unset' : 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  mb: 1.5,
                }}
              >
                {displayBody}
              </Typography>

              {item.body !== item.summary && (
                <Button
                  variant="text"
                  size="small"
                  onClick={() => onToggleExpand?.(item.id)}
                  sx={{
                    minWidth: 0,
                    p: 0,
                    fontWeight: 700,
                    color: 'primary.main',
                    mb: 1.5,
                  }}
                >
                  {isExpanded ? '접기' : '더보기'}
                </Button>
              )}

              {item.attachments && item.attachments.length > 0 && (
                <Box sx={{ mt: 1.5 }}>
                  <Divider sx={{ my: 1.5 }} />
                  <Stack spacing={1}>
                    {item.attachments.map((attachment) => {
                      const iconMeta = getFileIconMeta(attachment);

                      return (
                        <Box
                          key={attachment}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderRadius: 1.5,
                            border: `1px solid ${
                              isDark
                                ? 'rgba(148,163,184,0.12)'
                                : 'rgba(148,163,184,0.18)'
                            }`,
                            bgcolor: isDark ? 'rgba(30,41,59,0.8)' : '#ffffff',
                            px: 1.25,
                            py: 0.9,
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                            }}
                          >
                            <Box
                              sx={{
                                width: 24,
                                height: 24,
                                borderRadius: 1,
                                backgroundColor: iconMeta.bg,
                                color: iconMeta.color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.62rem',
                                fontWeight: 800,
                              }}
                            >
                              {iconMeta.label}
                            </Box>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 600 }}
                            >
                              {attachment}
                            </Typography>
                          </Box>
                          <Button
                            size="small"
                            variant="outlined"
                            aria-label={`다운로드: ${attachment}`}
                            sx={{
                              minWidth: 0,
                              width: 32,
                              height: 32,
                              p: 0,
                              borderRadius: 1.5,
                              borderColor: isDark
                                ? 'rgba(148,163,184,0.28)'
                                : 'rgba(148,163,184,0.25)',
                              color: isDark ? '#e2e8f0' : '#475569',
                              backgroundColor: isDark
                                ? 'rgba(15, 23, 42, 0.7)'
                                : '#f8fafc',
                              '&:hover': {
                                borderColor: isDark
                                  ? 'rgba(96,165,250,0.5)'
                                  : 'rgba(59,130,246,0.35)',
                                backgroundColor: isDark
                                  ? 'rgba(30,41,59,0.9)'
                                  : '#f1f5f9',
                              },
                            }}
                          >
                            ↓
                          </Button>
                        </Box>
                      );
                    })}
                  </Stack>
                </Box>
              )}

              <Divider sx={{ my: 1.5 }} />

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                  flexWrap: 'wrap',
                  color: 'text.secondary',
                }}
              >
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<FavoriteBorderOutlinedIcon fontSize="small" />}
                    sx={{
                      minWidth: 0,
                      px: 1,
                      py: 0.5,
                      borderRadius: 1.5,
                      color: isDark ? '#cbd5e1' : '#475569',
                      backgroundColor: 'transparent',
                      transition: 'all 0.2s ease',
                      '& .MuiButton-startIcon': {
                        marginRight: 0.5,
                        color: isDark ? '#f472b6' : '#ec4899',
                      },
                      '&:hover': {
                        backgroundColor: isDark
                          ? 'rgba(244, 114, 182, 0.12)'
                          : 'rgba(236, 72, 153, 0.08)',
                        color: isDark ? '#fce7f3' : '#be185d',
                        '& .MuiButton-startIcon': {
                          color: isDark ? '#f472b6' : '#db2777',
                        },
                      },
                    }}
                  >
                    좋아요 11
                  </Button>
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<BookmarkBorderOutlinedIcon fontSize="small" />}
                    sx={{
                      minWidth: 0,
                      px: 1,
                      py: 0.5,
                      borderRadius: 1.5,
                      color: isDark ? '#cbd5e1' : '#475569',
                      backgroundColor: 'transparent',
                      transition: 'all 0.2s ease',
                      '& .MuiButton-startIcon': {
                        marginRight: 0.5,
                        color: isDark ? '#fbbf24' : '#f59e0b',
                      },
                      '&:hover': {
                        backgroundColor: isDark
                          ? 'rgba(251, 191, 36, 0.12)'
                          : 'rgba(245, 158, 11, 0.08)',
                        color: isDark ? '#fef3c7' : '#b45309',
                        '& .MuiButton-startIcon': {
                          color: isDark ? '#fbbf24' : '#d97706',
                        },
                      },
                    }}
                  >
                    북마크
                  </Button>
                </Stack>
                <Typography variant="body2">
                  댓글 {item.commentCount}
                </Typography>
              </Box>

              {item.comments && item.comments.length > 0 && (
                <Box
                  sx={{
                    mt: 2,
                    borderTop: `1px solid ${isDark ? 'rgba(148,163,184,0.18)' : 'rgba(148,163,184,0.18)'}`,
                    pt: 1.5,
                  }}
                >
                  {renderCommentTree(item.comments)}
                </Box>
              )}

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
                  placeholder="댓글을 입력하세요"
                  aria-label="댓글 입력"
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
                  sx={{ minWidth: 0, px: 1.5 }}
                >
                  등록
                </Button>
              </Box>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
}
