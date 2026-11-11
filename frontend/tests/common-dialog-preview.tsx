import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Box,
  Button,
  CssBaseline,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  ThemeProvider,
  Typography,
  createTheme,
} from '@mui/material';
import { CommonDialog } from '../src/shared/components/CommonDialog';
import { ImageViewerDialog } from '../src/shared/components/ImageViewerDialog';
import { UnsavedChangesConfirmDialog } from '../src/shared/components/UnsavedChangesConfirmDialog';
import { useCommonConfirmDialog } from '../src/shared/hooks/useCommonConfirmDialog';

const theme = createTheme();
const imageSource = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540"><rect width="100%" height="100%" fill="#dbeafe"/><circle cx="480" cy="270" r="120" fill="#2563eb"/><text x="480" y="430" text-anchor="middle" font-family="sans-serif" font-size="32" fill="#1e3a8a">이미지 뷰어</text></svg>',
)}`;
const previewType = new URLSearchParams(window.location.search).get('type') ?? 'confirm';

function Preview() {
  const [open, setOpen] = useState(true);
  const [result, setResult] = useState('');
  const { confirm, dialog } = useCommonConfirmDialog();

  useEffect(() => {
    if (previewType !== 'confirm') return;
    void confirm({
      title: '문서 삭제',
      subtitle: '삭제한 문서는 복구할 수 없습니다.',
      description: '선택한 문서를 삭제하시겠습니까? 삭제한 문서는 복구할 수 없습니다.',
      confirmLabel: '삭제',
    }).then((confirmed) => setResult(confirmed ? '삭제 확인됨' : '취소됨'));
  }, [confirm]);

  if (previewType === 'image') {
    return (
      <>
        <ImageViewerDialog
          open={open}
          src={imageSource}
          alt="브라우저 확인용 이미지"
          onClose={() => setOpen(false)}
        />
        <Typography role="status">{open ? '' : '닫힘'}</Typography>
      </>
    );
  }

  if (previewType === 'document-type') {
    return (
      <>
        <UnsavedChangesConfirmDialog
          open={open}
          title="문서 유형 변경"
          subtitle="유형 변경 시 결재선과 참조자가 초기화됩니다."
          description="다른 문서 유형으로 이동하시겠습니까? 결재선과 참조자는 초기화되며, 제목과 본문은 유지됩니다."
          cancelLabel="취소"
          continueLabel="이동"
          onCancel={() => setOpen(false)}
          onContinue={() => setOpen(false)}
        />
        <Typography role="status">{open ? '' : '닫힘'}</Typography>
      </>
    );
  }

  if (previewType === 'form') {
    return (
      <CommonDialog
        open={open}
        title="문서 수정"
        description="문서 정보를 수정합니다."
        size="md"
        onClose={() => setOpen(false)}
        actions={
          <>
            <Button variant="contained">저장</Button>
            <Button onClick={() => setOpen(false)}>취소</Button>
          </>
        }
      >
        <Stack spacing={2}>
          <TextField label="문서 제목" defaultValue="월간 운영 보고서" />
          <TextField label="담당 부서" defaultValue="운영팀" />
          <TextField label="비고" multiline minRows={3} />
        </Stack>
      </CommonDialog>
    );
  }

  if (previewType === 'selection') {
    return (
      <CommonDialog
        open={open}
        title="참조자 선택"
        description="문서에 추가할 참조자를 선택합니다."
        size="sm"
        onClose={() => setOpen(false)}
        actions={
          <>
            <Button variant="contained">선택 추가</Button>
            <Button onClick={() => setOpen(false)}>취소</Button>
          </>
        }
      >
        <RadioGroup defaultValue="user-1" aria-label="참조자 목록">
          <FormControlLabel value="user-1" control={<Radio />} label="김하나 · 운영팀" />
          <FormControlLabel value="user-2" control={<Radio />} label="이두리 · 영업팀" />
          <FormControlLabel value="user-3" control={<Radio />} label="박세명 · 지원팀" />
        </RadioGroup>
      </CommonDialog>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Button onClick={() => setOpen(true)}>확인창 열기</Button>
      <Typography role="status">{result}</Typography>
      {dialog}
    </Box>
  );
}

createRoot(document.getElementById('root')!).render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <Preview />
  </ThemeProvider>,
);
