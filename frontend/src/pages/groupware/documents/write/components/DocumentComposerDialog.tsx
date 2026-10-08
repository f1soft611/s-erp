import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined';
import { useTheme } from '@mui/material/styles';
import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  MenuItem,
  Tab,
  Tabs,
  TextField,
  Divider,
} from '@mui/material';
import {
  RichTextEditor,
  RichTextEditorToolbar,
  richTextEditorIconButtonSx,
} from '../../../../../shared/components/rich-text-editor/RichTextEditor';
import { CommonDialog } from '../../../../../shared/components/CommonDialog';
import { richTextContentStyles } from '../../../../../shared/components/rich-text-editor/contentStyles';
import { UnsavedChangesConfirmDialog } from '../../../../../shared/components/UnsavedChangesConfirmDialog';
import type { DocumentKind } from '../types/documentWrite.types';
import {
  ALL_CATEGORY_VALUE,
  useDocumentComposer,
} from '../hooks/useDocumentComposer';
import { DocumentApprovalFields } from './DocumentApprovalFields';
import { DocumentApprovalSettingsDialog } from './DocumentApprovalSettingsDialog';

type DocumentComposerDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function DocumentComposerDialog({
  open,
  onClose,
}: DocumentComposerDialogProps) {
  const theme = useTheme();
  const [approvalSettingsOpen, setApprovalSettingsOpen] = useState(false);
  const [approvalSettingsSession, setApprovalSettingsSession] = useState(0);
  const {
    activeDocumentKind,
    setActiveDocumentKind,
    composerTitle,
    setComposerTitle,
    draftDate,
    drafterName,
    categoryItems,
    availableForms,
    userOptions,
    selectedCategoryId,
    selectedFormId,
    handleFormChange,
    handleCategoryChange,
    templateError,
    templateLoading,
    templateReplaceConfirmOpen,
    cancelTemplateReplacement,
    confirmTemplateReplacement,
    approvalStages,
    selectedApprovalUserIds,
    referenceUserIds,
    addApproval,
    addAgreement,
    removeApprovalUser,
    replaceApprovalLine,
    handleApprovalUserChange,
    handleReferenceUserChange,
    loadError,
    isLoading,
    attachments,
    setAttachments,
    attachmentInputRef,
    editor,
    handleEditorReady,
    handleAttachmentSelect,
    closeComposer: resetComposer,
    editorSurfaceBackground,
    fieldSurfaceBackground,
  } = useDocumentComposer(open, onClose);
  const closeComposer = () => {
    setApprovalSettingsOpen(false);
    resetComposer();
  };
  const openApprovalSettings = () => {
    setApprovalSettingsSession((current) => current + 1);
    setApprovalSettingsOpen(true);
  };
  const panelBorder = theme.palette.divider;
  const editorTextColor = theme.palette.text.primary;
  const editorPlaceholderColor = theme.palette.text.disabled;
  const formFieldSx = {
    '& .MuiInputBase-root': {
      minHeight: 38,
    },
    '& .MuiInputBase-input, & .MuiSelect-select': {
      fontSize: '0.93rem',
      paddingBottom: '8.5px',
      paddingTop: '8.5px',
    },
    '& .MuiInputLabel-root': {
      color: 'text.secondary',
      fontSize: '0.82rem',
      fontWeight: 600,
      opacity: 1,
    },
    '& .MuiInputLabel-root.Mui-focused': {
      color: 'primary.main',
    },
  };

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
    <>
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
        data-testid="document-composer-layout"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          height: '100%',
          minHeight: 0,
          minWidth: 0,
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
        {activeDocumentKind === '기안서' && (
          <>
            {isLoading && (
              <Alert severity="info">기안서 정보를 불러오는 중입니다.</Alert>
            )}
            {templateLoading && (
              <Alert severity="info">기안양식 본문을 불러오는 중입니다.</Alert>
            )}
            {loadError && <Alert severity="error">{loadError}</Alert>}
            {templateError && <Alert severity="error">{templateError}</Alert>}
            <Box
              data-testid="document-draft-metadata"
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'minmax(0, 1fr)',
                  sm: 'repeat(2, minmax(0, 1fr))',
                },
                gap: 1.25,
                flexShrink: 0,
              }}
            >
              <TextField
                label="기안일"
                value={draftDate}
                fullWidth
                size="small"
                margin="none"
                slotProps={{ htmlInput: { readOnly: true } }}
                sx={formFieldSx}
              />
              <TextField
                label="기안자"
                value={drafterName}
                fullWidth
                size="small"
                margin="none"
                slotProps={{ htmlInput: { readOnly: true } }}
                sx={formFieldSx}
              />
              <TextField
                select
                label="구분"
                value={selectedCategoryId}
                onChange={(event) => handleCategoryChange(event.target.value)}
                fullWidth
                size="small"
                margin="none"
                disabled={isLoading || templateLoading}
                helperText={
                  !isLoading && categoryItems.length === 0
                    ? '등록된 분류가 없습니다.'
                    : undefined
                }
                sx={formFieldSx}
              >
                <MenuItem value={ALL_CATEGORY_VALUE}>전체</MenuItem>
                {categoryItems.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.itemNm}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="기안양식"
                value={selectedFormId}
                onChange={(event) => handleFormChange(event.target.value)}
                fullWidth
                size="small"
                margin="none"
                disabled={
                  isLoading || templateLoading || availableForms.length === 0
                }
                helperText={
                  !isLoading && availableForms.length === 0
                    ? '선택 가능한 기안양식이 없습니다.'
                    : undefined
                }
                sx={formFieldSx}
              >
                {availableForms.map((form) => (
                  <MenuItem
                    key={form.draftingWorkCategoryId}
                    value={String(form.draftingWorkCategoryId)}
                  >
                    {form.codeName}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <Divider />

            <DocumentApprovalFields
              userOptions={userOptions}
              selectedApprovalUserIds={selectedApprovalUserIds}
              referenceUserIds={referenceUserIds}
              approvalStages={approvalStages}
              approvalSettingsDisabled={isLoading}
              onApprovalUserChange={handleApprovalUserChange}
              onReferenceUserChange={handleReferenceUserChange}
              onAddApproval={addApproval}
              onAddAgreement={addAgreement}
              onOpenApprovalSettings={openApprovalSettings}
              onRemoveApprovalUser={removeApprovalUser}
            />
          </>
        )}

        <Divider />
        <TextField
          value={composerTitle}
          onChange={(event) => setComposerTitle(event.target.value)}
          fullWidth
          size="small"
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
          data-testid="document-composer-editor-panel"
          sx={{
            display: 'flex',
            flex: '1 0 auto',
            flexDirection: 'column',
            minHeight: 200,
            width: '100%',
            minWidth: 0,
            bgcolor: editorSurfaceBackground,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flex: '1 0 auto',
              flexDirection: 'column',
              width: '100%',
              minHeight: 0,
              minWidth: 0,
              borderTop: `1px solid ${panelBorder}`,
              // borderBottom: `1px solid ${panelBorder}`,
            }}
          >
            <Box
              sx={{
                minHeight: 180,
                display: 'flex',
                flex: '1 0 auto',
                width: '100%',
                minWidth: 0,
                bgcolor: editorSurfaceBackground,
                '& .document-composer-editor': {
                  flex: '1 0 auto',
                  width: '100%',
                  minWidth: 0,
                  minHeight: 180,
                  height: 'auto',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'visible',
                },
                '& .document-composer-editor .rich-text-editor-content': {
                  flex: '1 0 auto',
                  minHeight: 180,
                  height: 'auto',
                  overflow: 'visible',
                },
                '& .document-composer-editor .ProseMirror': {
                  ...richTextContentStyles,
                  display: 'block',
                  width: '100%',
                  minWidth: 0,
                  flex: '1 0 auto',
                  minHeight: 180,
                  maxHeight: 'none',
                  overflowY: 'visible',
                  overflowX: 'auto',
                  outline: 'none',
                  px: 2,
                  py: 1.5,
                  color: editorTextColor,
                  fontWeight: 400,
                  bgcolor: editorSurfaceBackground,
                  boxSizing: 'border-box',
                  '& p.is-editor-empty:first-of-type::before': {
                    content: 'attr(data-placeholder)',
                    color: editorPlaceholderColor,
                    float: 'left',
                    height: 0,
                    pointerEvents: 'none',
                  },
                  '& > :first-of-type': { marginTop: 0 },
                  '& > :last-child': { marginBottom: 0 },
                },
                '& .document-composer-editor .rich-text-editor-content > .ProseMirror':
                  {
                    flex: '1 0 auto',
                    minHeight: 180,
                    maxHeight: 'none',
                    overflowY: 'visible',
                  },
              }}
            >
              <RichTextEditor
                onEditorReady={handleEditorReady}
                className="document-composer-editor"
                readOnly={templateLoading}
                contentSx={{
                  ...richTextContentStyles,
                  display: 'block',
                  width: '100%',
                  minWidth: 0,
                  minHeight: 180,
                  maxHeight: 'none',
                  overflowY: 'visible',
                  overflowX: 'auto',
                  outline: 'none',
                  px: 2,
                  py: 1.5,
                  color: editorTextColor,
                  fontWeight: 400,
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
                    sx={{
                      bgcolor: 'grey.100',
                      color: '#0f172a',
                      '& .MuiChip-deleteIcon': { color: '#475569' },
                    }}
                  />
                ))}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
      <UnsavedChangesConfirmDialog
        open={templateReplaceConfirmOpen}
        title="작성 중인 본문 교체"
        description="선택한 기안양식의 본문으로 현재 내용을 바꾸시겠습니까?"
        cancelLabel="취소"
        continueLabel="교체"
        onCancel={cancelTemplateReplacement}
        onContinue={confirmTemplateReplacement}
      />
    </CommonDialog>
    <DocumentApprovalSettingsDialog
      key={approvalSettingsSession}
      open={approvalSettingsOpen}
      userOptions={userOptions}
      userOptionsError={
        userOptions.length === 0 && !isLoading
          ? loadError || undefined
          : undefined
      }
      approvalStages={approvalStages}
      referenceUserIds={referenceUserIds}
      onClose={() => setApprovalSettingsOpen(false)}
      onApply={replaceApprovalLine}
    />
    </>
  );
}
