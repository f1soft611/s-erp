import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePageMessages } from '../src/shared/hooks/usePageMessages';

describe('usePageMessages', () => {
  it('starts empty and clears validation, notice, warning and error together', () => {
    const { result } = renderHook(() => usePageMessages());
    expect(result.current).toMatchObject({ validationMessages: [], notice: '', warning: '', error: '' });

    act(() => {
      result.current.setValidationMessages(['발주일을 입력해 주세요.']);
      result.current.setNotice('저장했습니다.');
      result.current.setWarning('확인해 주세요.');
      result.current.setError('서버 오류');
    });
    expect(result.current).toMatchObject({
      validationMessages: ['발주일을 입력해 주세요.'], notice: '저장했습니다.', warning: '확인해 주세요.', error: '서버 오류',
    });

    act(() => result.current.clearMessages());
    expect(result.current).toMatchObject({ validationMessages: [], notice: '', warning: '', error: '' });
  });

  it('keeps a message that is set right after clearing in the same action', () => {
    const { result } = renderHook(() => usePageMessages());
    act(() => {
      result.current.setError('이전 오류');
      result.current.setNotice('이전 성공');
    });
    act(() => {
      // 동작이 새 오류를 만든다: 먼저 비우고 새 메시지를 설정한다.
      result.current.clearMessages();
      result.current.setError('새 오류');
    });
    expect(result.current.error).toBe('새 오류');
    expect(result.current.notice).toBe('');
  });

  it('keeps clearMessages and the setters referentially stable so they are safe in hook dependencies', () => {
    const { result, rerender } = renderHook(() => usePageMessages());
    const first = result.current;
    act(() => result.current.setError('오류'));
    rerender();
    expect(result.current.clearMessages).toBe(first.clearMessages);
    expect(result.current.setError).toBe(first.setError);
    expect(result.current.setValidationMessages).toBe(first.setValidationMessages);
  });
});
