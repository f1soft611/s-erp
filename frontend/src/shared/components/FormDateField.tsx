import { useState } from 'react';
import { DateEditor, normalizeDateInput } from './f1-grid/editing/DateEditor';

type FormDateFieldProps = {
  /** 필드 이름(예: 입고일). 오류 문구와 접근성 이름에 쓴다. */
  label: string;
  value: string;
  /** 입력·달력 선택·blur 정규화 결과를 전달한다. */
  onChange: (value: string) => void;
  /** 편집 불가. 입력과 달력 버튼이 모두 비활성이고 달력은 열리지 않는다. */
  disabled?: boolean;
  /** 기본 true. 라벨에 `*`를 표시한다(필수 검증은 저장 시). */
  required?: boolean;
  /** 저장 직전 검증 등 외부 오류 문구. blur 오류보다 우선한다. */
  error?: string;
};

/**
 * 저장 직전 검증용: 입력을 `YYYY-MM-DD`로 정규화한다.
 * `invalid`는 값이 비어 있지 않은데 올바른 날짜가 아닌 경우이며, 이때 `date`는 빈 문자열이다.
 */
export function normalizeFormDate(value: string): { date: string; invalid: boolean } {
  const date = value.trim() ? normalizeDateInput(value) : '';
  return { date, invalid: Boolean(value.trim()) && !date };
}

/**
 * 작성 화면의 날짜 입력. 공통 `DateEditor`(한국어 달력, 축약 입력)에 blur 정규화와 오류 표시를 더했다.
 * blur에서 유효하면 `YYYY-MM-DD`로 확정하고, 무효면 입력을 보존한 채 필드 오류를 보인다.
 */
export function FormDateField({ label, value, onChange, disabled = false, required = true, error }: FormDateFieldProps) {
  const [blurError, setBlurError] = useState('');
  const message = error || blurError;

  return (
    <DateEditor
      label={label}
      variant="outlined"
      autoFocus={false}
      selectOnFocus={false}
      required={required}
      disabled={disabled}
      value={value}
      onChange={(next) => {
        setBlurError('');
        onChange(next);
      }}
      onBlur={() => {
        const { date, invalid } = normalizeFormDate(value);
        if (date) {
          setBlurError('');
          if (date !== value) onChange(date);
        } else {
          setBlurError(invalid ? `올바른 ${label}을(를) 입력해 주세요.` : '');
        }
      }}
      error={Boolean(message)}
      helperText={message || undefined}
    />
  );
}
