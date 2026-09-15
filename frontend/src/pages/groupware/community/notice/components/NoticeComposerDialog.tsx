import {
  Box,
  Button,
  Dialog,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ImageOutlined from '@mui/icons-material/ImageOutlined';

type NoticeComposerDialogProps = {
  open: boolean;
  isDark: boolean;
  onClose: () => void;
};

const attachmentFiles = [
  '2026_안내문.pdf',
  '3분기_일정표.xlsx',
  '운영가이드.png',
];

export function NoticeComposerDialog({
  open,
  isDark,
  onClose,
}: NoticeComposerDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            backgroundColor: isDark ? '#0f172a' : '#ffffff',
          },
        },
      }}
    >
      <Box sx={{ p: 2.5, bgcolor: isDark ? '#0f172a' : '#f8fafc' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            새 공지 작성
          </Typography>
          <IconButton onClick={onClose} size="small" aria-label="닫기">
            <CloseIcon />
          </IconButton>
        </Box>

        <Box
          sx={{
            border: `1px solid ${
              isDark ? 'rgba(148,163,184,0.18)' : 'rgba(148,163,184,0.18)'
            }`,
            borderRadius: 2,
            bgcolor: isDark ? '#111827' : '#ffffff',
          }}
        >
          <TextField
            label="제목"
            aria-label="제목"
            fullWidth
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': { border: 'none', borderRadius: 0 },
              '& .MuiInputLabel-root': { fontWeight: 700 },
            }}
          />
          <Divider />

          <Box
            sx={{
              px: 2,
              py: 1.5,
              borderBottom: `1px solid ${
                isDark ? 'rgba(148,163,184,0.18)' : 'rgba(148,163,184,0.18)'
              }`,
            }}
          >
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              {['B', 'I', 'A', '◦', '•', '1.'].map((tool) => (
                <Button
                  key={tool}
                  variant="text"
                  aria-label={
                    tool === 'B'
                      ? '굵게'
                      : tool === 'I'
                        ? '기울임'
                        : tool === 'A'
                          ? '단락'
                          : '도구'
                  }
                  sx={{
                    minWidth: 0,
                    px: 1,
                    py: 0.5,
                    color: 'text.primary',
                    fontWeight: tool === 'B' ? 800 : 600,
                    fontStyle: tool === 'I' ? 'italic' : 'normal',
                  }}
                >
                  {tool}
                </Button>
              ))}
            </Stack>
          </Box>

          <TextField
            label="본문"
            aria-label="본문"
            multiline
            minRows={8}
            fullWidth
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': { border: 'none', borderRadius: 0 },
              '& .MuiInputLabel-root': { fontWeight: 700 },
            }}
          />

          <Box
            sx={{
              p: 2,
              borderTop: `1px solid ${
                isDark ? 'rgba(148,163,184,0.18)' : 'rgba(148,163,184,0.18)'
              }`,
            }}
          >
            <Button
              variant="outlined"
              startIcon={<ImageOutlined />}
              sx={{ mb: 2, borderRadius: 2 }}
            >
              이미지 첨부
            </Button>

            <Stack spacing={1}>
              {attachmentFiles.map((file) => {
                const extension = file.split('.').pop()?.toLowerCase() ?? '';
                const fileMeta: Record<
                  string,
                  { bg: string; color: string; label: string }
                > = {
                  pdf: { bg: '#fecaca', color: '#991b1b', label: 'PDF' },
                  xlsx: { bg: '#bbf7d0', color: '#166534', label: 'XLSX' },
                  png: { bg: '#ddd6fe', color: '#5b21b6', label: 'PNG' },
                };
                const meta = fileMeta[extension] ?? {
                  bg: '#e2e8f0',
                  color: '#475569',
                  label: 'FILE',
                };

                return (
                  <Box
                    key={file}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      border: `1px solid ${
                        isDark
                          ? 'rgba(148,163,184,0.18)'
                          : 'rgba(148,163,184,0.18)'
                      }`,
                      borderRadius: 2,
                      px: 1.25,
                      py: 0.9,
                      bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 26,
                          height: 26,
                          borderRadius: 1,
                          backgroundColor: meta.bg,
                          color: meta.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.65rem',
                          fontWeight: 800,
                        }}
                      >
                        {meta.label}
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {file}
                      </Typography>
                    </Box>
                    <Button size="small" variant="text" sx={{ minWidth: 0 }}>
                      삭제
                    </Button>
                  </Box>
                );
              })}
            </Stack>
          </Box>

          <Box
            sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, p: 2 }}
          >
            <Button variant="outlined" onClick={onClose}>
              취소
            </Button>
            <Button variant="contained" color="primary">
              등록
            </Button>
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
}
