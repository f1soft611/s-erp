import { useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { getSystemDate } from '../services/systemDateService';

/**
 * 불러오기 창의 기본 조회 기간(개월). 업체마다 다를 수 있어 한 곳에서만 정의한다.
 * 정책으로 관리하게 되면 이 값을 정책 조회 결과로 바꾸면 된다.
 */
export const PICKER_DEFAULT_RANGE_MONTHS = 1;

/**
 * 불러오기 창의 날짜 조건 상태. 창이 처음 열릴 때 서버 날짜 기준으로 종료일=오늘, 시작일=기본 기간 전으로 채운다.
 * 서버 날짜를 못 가져오면 브라우저 날짜로 대체하지 않고 기간 없이(전체) 조회하도록 비워 둔다.
 * `ready`가 true가 된 뒤에 첫 조회를 해야 기본 기간이 조건에 반영된다.
 */
export function usePickerDateRange(open: boolean) {
  const [fromDt, setFromDt] = useState('');
  const [toDt, setToDt] = useState('');
  const [ready, setReady] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (!open || started.current) return undefined;
    started.current = true;
    let active = true;
    getSystemDate()
      .then((today) => {
        if (!active) return;
        setToDt(today);
        setFromDt(dayjs(today).subtract(PICKER_DEFAULT_RANGE_MONTHS, 'month').format('YYYY-MM-DD'));
      })
      .catch(() => {
        /* 서버 날짜를 못 받으면 기간 없이 조회한다 */
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [open]);

  return { fromDt, toDt, setFromDt, setToDt, ready };
}
