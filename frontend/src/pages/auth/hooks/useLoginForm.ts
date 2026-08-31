import { useMemo, useState, type FormEvent } from 'react';
import type {
  LoginFormField as LoginFieldType,
  LoginFormValues,
} from '../types/auth';
import { login } from '../../../shared/services/authService';

const initialValues: LoginFormValues = {
  tenantCode: '',
  userId: '',
  password: '',
};

export function useLoginForm() {
  const [values, setValues] = useState<LoginFormValues>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<LoginFieldType, string>>>(
    {},
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<'error' | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const submitDisabled = useMemo(() => isSubmitting, [isSubmitting]);

  const validate = (nextValues: LoginFormValues) => {
    const nextErrors: Partial<Record<LoginFieldType, string>> = {};

    if (!nextValues.tenantCode.trim()) {
      nextErrors.tenantCode = '업체코드를 입력해주세요.';
    }

    if (!nextValues.userId.trim()) {
      nextErrors.userId = '사용자 ID를 입력해주세요.';
    }

    if (!nextValues.password.trim()) {
      nextErrors.password = '비밀번호를 입력해주세요.';
    }

    return nextErrors;
  };

  const handleChange = (field: LoginFieldType, value: string) => {
    const nextValues = {
      ...values,
      [field]: value,
    };

    setValues(nextValues);

    if (errors[field]) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        [field]: undefined,
      }));
    }

    if (submitMessage) {
      setSubmitMessage(null);
      setSubmitStatus(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validate(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setSubmitMessage(null);
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage(null);
    setSubmitStatus(null);

    try {
      await login(values);
      return { ok: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '로그인에 실패했습니다.';
      setSubmitMessage(errorMessage);
      setSubmitStatus('error');
      return { ok: false, error: errorMessage };
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
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
  };
}
