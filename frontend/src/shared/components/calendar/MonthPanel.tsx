import { Box, ButtonBase } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useEffect, useState } from 'react';
import { CALENDAR_PANEL_WIDTH } from './DatePanel';
import { CalendarFooter } from './CalendarFooter';
import { CalendarHeader } from './CalendarHeader';
import { todayIsoDate } from './calendarUtils';

export type MonthPanelProps = {
  /** `YYYYMM`. 비어 있거나 올바르지 않으면 이번 달이 속한 연도를 보여 준다. */
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  /** 이번 달 기준 날짜(`YYYY-MM-DD`). 없으면 브라우저 날짜. */
  todayValue?: string;
};

function yearOf(value: string, today: string): number {
  const fromValue = /^(\d{4})(0[1-9]|1[0-2])$/.exec(value);
  if (fromValue) return Number(fromValue[1]);
  const fromToday = /^(\d{4})-/.exec(today);
  return fromToday ? Number(fromToday[1]) : new Date().getFullYear();
}

/** 월(`YYYYMM`)을 고르는 달력(연 화살표·연도 드롭다운, 1월~12월 단추, 이번 달/삭제). */
export function MonthPanel({ value, onChange, onClear, todayValue }: MonthPanelProps) {
  const today = todayValue ?? todayIsoDate();
  const [year, setYear] = useState(() => yearOf(value, today));
  useEffect(() => {
    if (/^\d{6}$/.test(value)) setYear(yearOf(value, today));
  }, [value, today]);

  const thisMonth = today.slice(0, 7).replace('-', '');
  const pick = (month: number) => onChange(`${year}${String(month).padStart(2, '0')}`);

  return (
    <Box sx={{ p: 1.5, width: CALENDAR_PANEL_WIDTH }} data-testid="month-panel">
      <CalendarHeader
        year={year}
        onYearChange={setYear}
        onPrev={() => setYear((current) => current - 1)}
        onNext={() => setYear((current) => current + 1)}
        prevLabel="이전 연도"
        nextLabel="다음 연도"
      />
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0.5 }}>
        {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => {
          const key = `${year}${String(month).padStart(2, '0')}`;
          const selected = key === value;
          const current = key === thisMonth;
          return (
            <ButtonBase
              key={month}
              aria-pressed={selected}
              aria-current={current ? 'date' : undefined}
              onClick={() => pick(month)}
              sx={(theme) => ({
                position: 'relative',
                height: 40,
                borderRadius: 1.5,
                fontSize: 14,
                fontWeight: selected ? 700 : 400,
                color: selected ? theme.palette.primary.contrastText : theme.palette.text.primary,
                bgcolor: selected ? theme.palette.primary.main : 'transparent',
                '&:hover': { bgcolor: selected ? theme.palette.primary.dark : alpha(theme.palette.primary.main, 0.1) },
                '&::after': current
                  ? {
                      content: '""',
                      position: 'absolute',
                      top: 6,
                      right: 10,
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      bgcolor: theme.palette.warning.main,
                    }
                  : undefined,
              })}
            >
              {month}월
            </ButtonBase>
          );
        })}
      </Box>
      <CalendarFooter todayLabel="이번 달" onToday={() => onChange(thisMonth)} onClear={onClear} />
    </Box>
  );
}
