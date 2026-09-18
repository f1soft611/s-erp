import { Box, IconButton, Typography } from '@mui/material';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';

export type AttachmentListItem = {
  id: string;
  name: string;
  size?: number;
  extension?: string;
};

export type AttachmentListProps = {
  files: AttachmentListItem[];
  isDark?: boolean;
  mode?: 'view' | 'edit';
  showActions?: boolean;
  onDownload?: (id: string) => void;
  onRemove?: (id: string) => void;
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

export function AttachmentList({
  files,
  isDark = false,
  mode = 'view',
  showActions = true,
  onDownload,
  onRemove,
}: AttachmentListProps) {
  if (files.length === 0) {
    return null;
  }

  return (
    <Box data-testid="notice-attachment-list" sx={{ display: 'grid', gap: 1 }}>
      {files.map((file) => {
        const iconMeta = getFileIconMeta(file.name);

        return (
          <Box
            key={file.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderRadius: 1.5,
              border: `1px solid ${
                isDark ? 'rgba(148,163,184,0.12)' : 'rgba(148,163,184,0.18)'
              }`,
              bgcolor: isDark ? 'rgba(30,41,59,0.8)' : '#ffffff',
              px: 1.25,
              py: 0.9,
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                minWidth: 0,
                flex: 1,
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
                  flexShrink: 0,
                }}
              >
                {iconMeta.label}
              </Box>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: isDark ? '#e2e8f0' : '#0f172a',
                }}
              >
                {file.name}
              </Typography>
            </Box>

            {showActions && (
              <IconButton
                size="small"
                aria-label={
                  mode === 'edit' ? '첨부 파일 삭제' : '첨부 파일 다운로드'
                }
                onClick={() => {
                  if (mode === 'edit') {
                    onRemove?.(file.id);
                    return;
                  }
                  onDownload?.(file.id);
                }}
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
                  backgroundColor: isDark ? 'rgba(15, 23, 42, 0.7)' : '#f8fafc',
                  '&:hover': {
                    borderColor: isDark
                      ? 'rgba(96,165,250,0.5)'
                      : 'rgba(59,130,246,0.35)',
                    backgroundColor: isDark ? 'rgba(30,41,59,0.9)' : '#f1f5f9',
                  },
                }}
              >
                {mode === 'edit' ? (
                  <DeleteOutlinedIcon fontSize="small" />
                ) : (
                  <FileDownloadOutlinedIcon fontSize="small" />
                )}
              </IconButton>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
