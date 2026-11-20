import LockOutlined from '@mui/icons-material/LockOutlined';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { useState, type FormEvent } from 'react';
import AuthLayout from '../../shared/components/layout/AuthLayout';
import { logout } from '../../shared/services/authService';
import { changeMyPassword } from '../dashboard/services/profileSettings.service';

const MIN_PASSWORD_LENGTH = 8;
export const PASSWORD_CHANGED_NOTICE = '비밀번호를 변경했습니다. 새 비밀번호로 다시 로그인해 주세요.';

/**
 * 비밀번호를 바꿔야 하는 계정(관리자 초기화·최초 발급)이 로그인했을 때 메뉴 대신 보여 주는 화면.
 * 변경하기 전에는 서버가 비밀번호 변경 외의 API를 거부한다. 변경이 끝나면 로그아웃하고 새 비밀번호로 다시 로그인하게 한다.
 */
export function ForcePasswordChangePage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentPassword || !newPassword || !newPasswordConfirm) {
      setError('모든 비밀번호를 입력해 주세요.');
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setError('변경 비밀번호와 확인값이 일치하지 않습니다.');
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`변경 비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`);
      return;
    }
    if (newPassword === currentPassword) {
      setError('새 비밀번호는 현재(임시) 비밀번호와 달라야 합니다.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await changeMyPassword({ currentPassword, newPassword, newPasswordConfirm });
      logout({ message: PASSWORD_CHANGED_NOTICE, severity: 'info' });
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? cause.message : '비밀번호를 변경하지 못했습니다.');
      setSaving(false);
    }
  };

  return (
    <AuthLayout>
      <Paper variant="outlined" sx={{ width: '100%', maxWidth: 450, p: { xs: 2, sm: 3 } }}>
        <Box component="form" onSubmit={(event) => void submit(event)} noValidate>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <LockOutlined color="primary" />
              <Typography component="h1" variant="h6" sx={{ fontWeight: 800 }}>
                비밀번호 변경
              </Typography>
            </Stack>
            <Alert severity="info">
              임시 비밀번호로 로그인했습니다. 계속하려면 새 비밀번호로 변경해 주세요.
            </Alert>
            {error ? <Alert severity="error">{error}</Alert> : null}
            <TextField
              label="현재(임시) 비밀번호"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
              disabled={saving}
            />
            <TextField
              label="변경 비밀번호"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              helperText={`${MIN_PASSWORD_LENGTH}자 이상`}
              disabled={saving}
            />
            <TextField
              label="변경 비밀번호 확인"
              type="password"
              value={newPasswordConfirm}
              onChange={(event) => setNewPasswordConfirm(event.target.value)}
              autoComplete="new-password"
              disabled={saving}
            />
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Button onClick={() => logout()} disabled={saving}>로그아웃</Button>
              <Button type="submit" variant="contained" disabled={saving}>비밀번호 변경</Button>
            </Stack>
          </Stack>
        </Box>
      </Paper>
    </AuthLayout>
  );
}

export default ForcePasswordChangePage;
