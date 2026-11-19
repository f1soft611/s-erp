import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { getSystemDate } from '../services/systemDateService';

type UseServerDateDefaultOptions = {
  /** 신규 작성 화면이면 true. 저장된 자료를 여는 화면(수정·조회)은 저장된 날짜를 쓰므로 false다. */
  enabled: boolean;
  /** 서버 날짜가 도착했을 때 호출한다. 사용자가 먼저 날짜를 바꿨다면 호출하지 않는다. */
  onDate: (date: string) => void;
  /** 서버 날짜를 불러오지 못했을 때 화면 오류 영역에 보여 줄 메시지를 받는다. */
  onError: (message: string) => void;
};

function failureMessage(cause: unknown): string {
  return cause instanceof Error
    ? `서버 기준일을 불러오지 못했습니다. ${cause.message}`
    : '서버 기준일을 불러오지 못했습니다.';
}

/**
 * 작성 화면의 오늘 날짜 기본값을 브라우저 시계가 아니라 서버 날짜(`GET /api/v1/common/system-date`)로 채운다.
 * 서버 날짜를 못 가져오면 브라우저 날짜로 대체하지 않고 `onError`만 호출한다.
 */
export function useServerDateDefault({ enabled, onDate, onError }: UseServerDateDefaultOptions) {
  const touchedRef = useRef(false);
  const onDateRef = useRef(onDate);
  const onErrorRef = useRef(onError);
  const mountedRef = useRef(true);

  useLayoutEffect(() => {
    onDateRef.current = onDate;
    onErrorRef.current = onError;
  }, [onDate, onError]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    getSystemDate()
      .then((date) => {
        if (!active || touchedRef.current) return;
        touchedRef.current = true;
        onDateRef.current(date);
      })
      .catch((cause: unknown) => {
        if (active) onErrorRef.current(failureMessage(cause));
      });
    return () => {
      active = false;
    };
  }, [enabled]);

  /** 사용자가 날짜를 직접 입력했을 때 호출해 늦게 도착한 서버 날짜가 입력값을 덮어쓰지 않게 한다. */
  const markTouched = useCallback(() => {
    touchedRef.current = true;
  }, []);

  /** 초기화용: 서버 날짜를 다시 조회해 `onDate`로 전달한다. */
  const reload = useCallback(async () => {
    touchedRef.current = false;
    try {
      const date = await getSystemDate();
      if (!mountedRef.current || touchedRef.current) return;
      touchedRef.current = true;
      onDateRef.current(date);
    } catch (cause) {
      if (mountedRef.current) onErrorRef.current(failureMessage(cause));
    }
  }, []);

  return { markTouched, reload };
}
