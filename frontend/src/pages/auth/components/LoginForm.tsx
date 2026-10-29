import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
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
  submitStatus: 'error' | null;
  showPassword: boolean;
  submitDisabled: boolean;
  rememberLogin: boolean;
  onRememberLoginChange: (checked: boolean) => void;
  onChange: (field: LoginFieldType, value: string) => void;
  onTogglePassword: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
};

export function LoginForm({
  values,
  errors,
  isSubmitting,
  submitMessage,
  submitStatus,
  showPassword,
  submitDisabled,
  rememberLogin,
  onRememberLoginChange,
  onChange,
  onTogglePassword,
  onSubmit,
}: LoginFormProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Card
      sx={{
        width: '100%',
        maxWidth: 450,
        borderRadius: 3,
        border: `1px solid ${alpha(theme.palette.divider, isDark ? 0.8 : 0.7)}`,
        boxShadow: isDark
          ? '0 18px 48px rgba(2, 6, 23, 0.34)'
          : '0 20px 52px rgba(15, 23, 42, 0.08)',
        bgcolor: 'background.paper',
      }}
    >
      <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
        <Stack spacing={1.5} component="form" onSubmit={onSubmit} noValidate>
          <Box sx={{ pb: 0.5 }}>
            <Typography
              variant="overline"
              color="primary.main"
              sx={{ letterSpacing: 1.8, fontWeight: 800, lineHeight: 1.5 }}
            >
              S-ERP
            </Typography>
            <Typography
              variant="h4"
              sx={{
                mt: 0.5,
                fontSize: { xs: '1.45rem', sm: '1.65rem' },
                lineHeight: 1.35,
                color: 'text.primary',
              }}
            >
              통합 ERP 시스템 로그인
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1, lineHeight: 1.65 }}
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
                  sx={{
                    color: 'text.secondary',
                  }}
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            }
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={rememberLogin}
                onChange={(_, checked) => onRememberLoginChange(checked)}
                disabled={isSubmitting}
              />
            }
            label="로그인 저장"
          />

          {submitMessage ? (
            <Alert severity={submitStatus === 'error' ? 'error' : 'success'}>
              {submitMessage}
            </Alert>
          ) : null}

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={submitDisabled}
            sx={{
              minHeight: 48,
              borderRadius: 1.5,
              fontWeight: 700,
              bgcolor: 'primary.main',
              boxShadow: `0 8px 18px ${alpha(theme.palette.primary.main, 0.2)}`,
              '&:hover': {
                bgcolor: 'primary.dark',
              },
            }}
          >
            {isSubmitting ? '로그인 중...' : '로그인'}
          </Button>

          {import.meta.env.DEV ? (
            <Box
              sx={{
                p: 1.25,
                borderRadius: 1.5,
                border: `1px solid ${alpha(theme.palette.divider, 0.55)}`,
                bgcolor: isDark
                  ? alpha(theme.palette.background.default, 0.4)
                  : alpha(theme.palette.background.default, 0.6),
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  color: 'text.secondary',
                  fontWeight: 600,
                  lineHeight: 1.5,
                }}
              >
                개발용 테스트 계정입니다.
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  color: 'text.secondary',
                  lineHeight: 1.5,
                  overflowWrap: 'anywhere',
                }}
              >
                (업체코드: T1358606250 / 아이디: admin / 비밀번호: f1soft@611)
              </Typography>
            </Box>
          ) : null}

          <Typography
            variant="caption"
            sx={{
              textAlign: 'center',
              color: 'text.secondary',
              opacity: 0.75,
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
