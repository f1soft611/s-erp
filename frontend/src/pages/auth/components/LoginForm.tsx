import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  Stack,
  Typography,
} from '@mui/material';
import LoginFormField from '../../../shared/components/LoginFormField';
import type {
  LoginFormField as LoginFieldType,
  LoginFormValues,
} from '../types/auth';

type LoginFormProps = {
  values: LoginFormValues;
  errors: Partial<Record<LoginFieldType, string>>;
  isSubmitting: boolean;
  submitMessage: string | null;
  showPassword: boolean;
  submitDisabled: boolean;
  onChange: (field: LoginFieldType, value: string) => void;
  onTogglePassword: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
};

export function LoginForm({
  values,
  errors,
  isSubmitting,
  submitMessage,
  showPassword,
  submitDisabled,
  onChange,
  onTogglePassword,
  onSubmit,
}: LoginFormProps) {
  return (
    <Card
      sx={{
        width: '100%',
        maxWidth: 450,
        borderRadius: 2.5,
        border: '1px solid rgba(148, 163, 184, 0.18)',
        boxShadow: '0 16px 28px rgba(15, 23, 42, 0.08)',
        background: 'rgba(255,255,255,0.96)',
      }}
    >
      <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
        <Stack spacing={1.5} component="form" onSubmit={onSubmit} noValidate>
          <Box sx={{ pb: 0.25 }}>
            <Typography
              variant="overline"
              color="primary.main"
              sx={{ letterSpacing: 1.5, fontWeight: 800 }}
            >
              S-ERP
            </Typography>
            <Typography variant="h4" sx={{ mt: 0.75, fontSize: '1.7rem' }}>
              통합 ERP 시스템 로그인
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.75 }}
            >
              기업 운영 정보를 안전하게 관리하기 위한 로그인 페이지입니다.
            </Typography>
          </Box>

          <LoginFormField
            label="업체코드"
            value={values.tenantCode}
            error={errors.tenantCode}
            onChange={(value) => onChange('tenantCode', value)}
            autoComplete="organization"
            placeholder="예: A001"
          />

          <LoginFormField
            label="사용자 ID"
            value={values.userId}
            error={errors.userId}
            onChange={(value) => onChange('userId', value)}
            autoComplete="username"
            placeholder="사용자 ID를 입력하세요"
          />

          <LoginFormField
            label="비밀번호"
            type={showPassword ? 'text' : 'password'}
            value={values.password}
            error={errors.password}
            onChange={(value) => onChange('password', value)}
            autoComplete="current-password"
            placeholder="비밀번호를 입력하세요"
            endAdornment={
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={onTogglePassword}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            }
          />

          {submitMessage ? (
            <Alert
              severity={submitMessage.includes('실패') ? 'error' : 'success'}
            >
              {submitMessage}
            </Alert>
          ) : null}

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={submitDisabled}
            sx={{
              minHeight: 46,
              borderRadius: 2,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              boxShadow: '0 10px 18px rgba(37, 99, 235, 0.18)',
              '&:hover': {
                background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
              },
            }}
          >
            {isSubmitting ? '로그인 중...' : '로그인'}
          </Button>

          <Typography
            variant="caption"
            sx={{
              textAlign: 'center',
              color: '#9aa4b2',
              letterSpacing: '0.02em',
              pt: 0.25,
            }}
          >
            © F1soft Inc.
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
