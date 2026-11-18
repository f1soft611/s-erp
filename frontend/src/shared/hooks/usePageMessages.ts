import { useCallback, useState } from 'react';

/**
 * 등록 화면 상단에 보이는 일시 메시지(입력 검증 오류, 성공 안내, 저장 후 경고, 서버·처리 오류)를 한 곳에서 관리한다.
 *
 * 사용자가 값을 고치거나 새 동작을 시작하면 `clearMessages()`로 모두 비우고, 그 동작의 결과만 보여준다.
 * 상태에서 계산되는 안내(취소된 문서, 확정과 다른 행, 출력됨, 잠금 안내 등)는 이 훅과 무관하게 표시한다.
 * 동작이 새 오류를 만들 때는 먼저 `clearMessages()`를 부르고 그다음에 `setError(...)`를 부른다.
 */
export function usePageMessages() {
  const [validationMessages, setValidationMessages] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [warning, setWarning] = useState('');
  const [error, setError] = useState('');

  const clearMessages = useCallback(() => {
    setValidationMessages((current) => (current.length === 0 ? current : []));
    setNotice('');
    setWarning('');
    setError('');
  }, []);

  return {
    validationMessages,
    setValidationMessages,
    notice,
    setNotice,
    warning,
    setWarning,
    error,
    setError,
    clearMessages,
  };
}
