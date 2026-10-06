import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Tab,
  Tabs,
  TextField,
} from '@mui/material';
import {
  RichTextEditor,
  RichTextEditorToolbar,
  richTextEditorIconButtonSx,
} from '../../../../../shared/components/rich-text-editor/RichTextEditor';
import { CommonDialog } from '../../../../../shared/components/CommonDialog';
import { richTextContentStyles } from '../../../../../shared/components/rich-text-editor/contentStyles';
import type { DocumentKind } from '../types/documentWrite.types';
import { useDocumentComposer } from '../hooks/useDocumentComposer';

type DocumentComposerDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function DocumentComposerDialog({
  open,
  onClose,
}: DocumentComposerDialogProps) {
  const theme = useTheme();
  const {
    activeDocumentKind,
    setActiveDocumentKind,
    composerTitle,
    setComposerTitle,
    attachments,
    setAttachments,
    attachmentInputRef,
    editor,
    setEditor,
    handleAttachmentSelect,
    closeComposer,
    editorSurfaceBackground,
    fieldSurfaceBackground,
  } = useDocumentComposer(onClose);
  const panelBorder = theme.palette.divider;

  const composerFooterStart = (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <RichTextEditorToolbar
        editor={editor}
        panelTestId="document-composer-toolbar-popup"
      />
      <IconButton
        size="small"
        aria-label="첨부 링크"
        onClick={() => attachmentInputRef.current?.click()}
        sx={richTextEditorIconButtonSx}
      >
        <AttachFileOutlinedIcon fontSize="small" />
      </IconButton>
      <input
        ref={attachmentInputRef}
        type="file"
        multiple
        hidden
        onChange={handleAttachmentSelect}
        aria-label="첨부 파일 선택"
      />
    </Box>
  );

  return (
    <CommonDialog
      open={open}
      onClose={closeComposer}
      title="문서 작성"
      size="lg"
      bodyMode="fill"
      footerStart={composerFooterStart}
      actions={
        <>
          <Button
            variant="contained"
            disabled
            sx={{
              borderRadius: 1.5,
              fontWeight: 700,
              minWidth: 96,
              px: 2.5,
              boxShadow: 'none',
            }}
          >
            저장
          </Button>
          <Button
            variant="text"
            color="primary"
            onClick={closeComposer}
            sx={{ borderRadius: 1.5, fontWeight: 600, px: 2 }}
          >
            취소
          </Button>
        </>
      }
      dialogProps={{ 'data-testid': 'document-composer-dialog-root' }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          height: '100%',
          minHeight: 0,
        }}
      >
        <Tabs
          value={activeDocumentKind}
          onChange={(_, value: DocumentKind) => setActiveDocumentKind(value)}
          aria-label="결재문서 구분"
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            flexShrink: 0,
            mb: 0,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Tab value="기안서" label="기안서" />
          <Tab value="업무연락" label="업무연락" />
          <Tab value="지출결의서" label="지출결의서" disabled />
          <Tab value="근태신청" label="근태신청" disabled />
        </Tabs>
        <TextField
          value={composerTitle}
          onChange={(event) => setComposerTitle(event.target.value)}
          fullWidth
          margin="none"
          placeholder="제목을 입력하세요."
          slotProps={{ input: { 'aria-label': '제목' } }}
          sx={{
            flexShrink: 0,
            '& .MuiOutlinedInput-root': {
              bgcolor: fieldSurfaceBackground,
              borderRadius: 1.5,
              border: 'none',
              '& fieldset': { border: 'none' },
            },
            '& .MuiInputBase-root': {
              bgcolor: fieldSurfaceBackground,
              borderRadius: 1.5,
            },
            '& .MuiInputBase-input::placeholder': {
              color: theme.palette.text.disabled,
              opacity: 1,
            },
            '& .MuiInputBase-input': {
              fontSize: '1.25rem',
              lineHeight: 1.4,
              fontWeight: 700,
              letterSpacing: '-0.02em',
            },
          }}
        />
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            width: '100%',
            minWidth: 0,
            bgcolor: editorSurfaceBackground,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              width: '100%',
              minWidth: 0,
              borderTop: `1px solid ${panelBorder}`,
              borderBottom: `1px solid ${panelBorder}`,
            }}
          >
            <Box
              sx={{
                flex: 1,
                minHeight: 180,
                display: 'flex',
                width: '100%',
                minWidth: 0,
                overflow: 'hidden',
                bgcolor: editorSurfaceBackground,
                '& .document-composer-editor': {
                  width: '100%',
                  minWidth: 0,
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                },
                '& .document-composer-editor .ProseMirror': {
                  ...richTextContentStyles,
                  display: 'block',
                  width: '100%',
                  minWidth: 0,
                  flex: 1,
                  minHeight: 180,
                  maxHeight: '100%',
                  overflowY: 'auto',
                  overflowX: 'auto',
                  outline: 'none',
                  px: 2,
                  py: 1.5,
                  color: theme.palette.text.primary,
                  bgcolor: editorSurfaceBackground,
                  boxSizing: 'border-box',
                  '& p.is-editor-empty:first-of-type::before': {
                    content: 'attr(data-placeholder)',
                    color: theme.palette.text.disabled,
                    float: 'left',
                    height: 0,
                    pointerEvents: 'none',
                  },
                },
              }}
            >
              <RichTextEditor
                onEditorReady={setEditor}
                className="document-composer-editor"
                contentSx={{
                  ...richTextContentStyles,
                  display: 'block',
                  width: '100%',
                  minWidth: 0,
                  flex: 1,
                  minHeight: 180,
                  maxHeight: '100%',
                  overflowY: 'auto',
                  overflowX: 'auto',
                  outline: 'none',
                  px: 2,
                  py: 1.5,
                  color: theme.palette.text.primary,
                  bgcolor: editorSurfaceBackground,
                  boxSizing: 'border-box',
                }}
              />
            </Box>
            {attachments.length > 0 && (
              <Box
                data-testid="document-composer-attachments"
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1,
                  borderTop: `1px solid ${panelBorder}`,
                  p: 1.5,
                  bgcolor: editorSurfaceBackground,
                }}
              >
                {attachments.map((file, index) => (
                  <Chip
                    key={`${file.name}-${file.lastModified}-${index}`}
                    label={file.name}
                    onDelete={() =>
                      setAttachments((current) =>
                        current.filter((_, fileIndex) => fileIndex !== index),
                      )
                    }
                  />
                ))}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </CommonDialog>
  );
}
