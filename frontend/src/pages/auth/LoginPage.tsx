import { Alert } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { resolvePushNotificationPath } from '../../shared/utils/notificationPath';
import AuthLayout from '../../shared/components/layout/AuthLayout';
import {
  readSessionNotice,
  setSessionNotice,
} from '../../shared/services/authService';
import { useLoginForm } from './hooks/useLoginForm';
import { LoginForm } from './components/LoginForm';

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const sessionNotice = readSessionNotice();
  const {
    values,
    errors,
    isSubmitting,
    submitMessage,
    submitStatus,
    showPassword,
    submitDisabled,
    rememberLogin,
    handleRememberLoginChange,
    setShowPassword,
    handleChange,
    handleSubmit,
  } = useLoginForm();

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    const result = await handleSubmit(event);
    console.log(
      'submit result',
      result,
      'path-before',
      window.location.pathname,
    );

    if (result?.ok) {
      setSessionNotice(null);
      navigate(resolvePushNotificationPath(location.state?.pushNotificationId) ?? '/', { replace: true });
    }
  };

  return (
    <AuthLayout>
      {sessionNotice ? (
        <Alert severity="error" sx={{ width: '100%', maxWidth: 450, mb: 2 }}>
          {sessionNotice}
        </Alert>
      ) : null}
      <LoginForm
        values={values}
        errors={errors}
        isSubmitting={isSubmitting}
        submitMessage={submitMessage}
        submitStatus={submitStatus}
        showPassword={showPassword}
        submitDisabled={submitDisabled}
        rememberLogin={rememberLogin}
        onRememberLoginChange={handleRememberLoginChange}
        onChange={handleChange}
        onTogglePassword={() => setShowPassword((current) => !current)}
        onSubmit={onSubmit}
      />
    </AuthLayout>
  );
}

export default LoginPage;
