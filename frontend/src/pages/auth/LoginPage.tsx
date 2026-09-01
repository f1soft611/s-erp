import { Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../../shared/components/layout/AuthLayout';
import {
  readSessionNotice,
  setSessionNotice,
} from '../../shared/services/authService';
import { useLoginForm } from './hooks/useLoginForm';
import { LoginForm } from './components/LoginForm';

function LoginPage() {
  const navigate = useNavigate();
  const sessionNotice = readSessionNotice();
  const {
    values,
    errors,
    isSubmitting,
    submitMessage,
    submitStatus,
    showPassword,
    submitDisabled,
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
      window.history.pushState({}, '', '/dashboard');
      window.dispatchEvent(new PopStateEvent('popstate'));
      console.log('navigating to dashboard path', window.location.pathname);
      navigate('/dashboard', { replace: true });
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
        onChange={handleChange}
        onTogglePassword={() => setShowPassword((current) => !current)}
        onSubmit={onSubmit}
      />
    </AuthLayout>
  );
}

export default LoginPage;
