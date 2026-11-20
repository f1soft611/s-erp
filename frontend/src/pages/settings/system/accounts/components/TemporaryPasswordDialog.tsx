import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined';
import { Alert, Box, Button, Typography } from '@mui/material';
import { useState } from 'react';
import { CommonDialog } from '../../../../../shared/components/CommonDialog';
import type { PasswordResetResult } from '../types/account.types';

type Props = {
  result: PasswordResetResult;
  userNm: string;
  onClose: () => void;
};

/** 초기화로 발급한 임시 비밀번호를 한 번만 보여 준다. 닫으면 다시 볼 수 없다. */
export function TemporaryPasswordDialog({ result, userNm, onClose }: Props) {
  const [copied, setCopied] = useState<'done' | 'failed' | ''>('');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.temporaryPassword);
      setCopied('done');
    } catch {
      setCopied('failed');
    }
  };

  return (
    <CommonDialog
      open
      onClose={onClose}
      title="임시 비밀번호"
      description={`${userNm} (${result.loginCode})`}
      size="xs"
      fullScreenOnMobile
      actions={<Button variant="contained" onClick={onClose}>확인</Button>}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Alert severity="warning">
          이 창을 닫으면 임시 비밀번호를 다시 볼 수 없습니다. 사용자에게 전달해 주세요. 사용자는 첫 로그인 때 비밀번호를 반드시 변경해야 합니다.
        </Alert>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            component="code"
            aria-label="임시 비밀번호 값"
            sx={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 700, letterSpacing: 1, wordBreak: 'break-all' }}
          >
            {result.temporaryPassword}
          </Typography>
          <Button size="small" startIcon={<ContentCopyOutlined fontSize="small" />} onClick={() => void copy()}>
            복사
          </Button>
        </Box>
        {copied === 'done' ? <Typography variant="caption" color="success.main">복사했습니다.</Typography> : null}
        {copied === 'failed' ? (
          <Typography variant="caption" color="error">복사하지 못했습니다. 직접 선택해 복사해 주세요.</Typography>
        ) : null}
      </Box>
    </CommonDialog>
  );
}
