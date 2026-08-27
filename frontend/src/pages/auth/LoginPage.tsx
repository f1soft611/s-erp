import { useNavigate } from 'react-router-dom';
import AuthLayout from '../../shared/components/layout/AuthLayout';
import { useLoginForm } from './hooks/useLoginForm';
import { LoginForm } from './components/LoginForm';

function LoginPage() {
  const navigate = useNavigate();
  const {
    values,
    errors,
    isSubmitting,
    submitMessage,
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
      window.history.pushState({}, '', '/dashboard');
      window.dispatchEvent(new PopStateEvent('popstate'));
      console.log('navigating to dashboard path', window.location.pathname);
      navigate('/dashboard', { replace: true });
    }
  };

  return (
    <AuthLayout>
      <LoginForm
        values={values}
        errors={errors}
        isSubmitting={isSubmitting}
        submitMessage={submitMessage}
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
