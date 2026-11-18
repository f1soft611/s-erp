import { Box } from '@mui/material';
import { useState } from 'react';
import { CalendarFooter } from './CalendarFooter';
import { CalendarHeader } from './CalendarHeader';
import { addMonths, parseIsoDate, todayIsoDate } from './calendarUtils';
import { DayGrid } from './DayGrid';

export type DatePanelProps = {
  /** `YYYY-MM-DD`. 비어 있거나 올바르지 않으면 오늘이 속한 달을 보여 준다. */
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  /** 하단 "오늘"과 오늘 점 표시에 쓸 날짜. 없으면 브라우저 날짜. */
  todayValue?: string;
};

export const CALENDAR_PANEL_WIDTH = 'min(calc(100vw - 32px), 296px)';

function viewOf(value: string, today: string) {
  const parsed = parseIsoDate(value) ?? parseIsoDate(today) ?? { year: new Date().getFullYear(), month: 1 };
  return { year: parsed.year, month: parsed.month };
}

/** 날짜 한 개를 고르는 달력(연·월 드롭다운, 주말 색, 오늘 표시, 오늘/삭제). */
export function DatePanel({ value, onChange, onClear, todayValue }: DatePanelProps) {
  const today = todayValue ?? todayIsoDate();
  const [view, setView] = useState(() => viewOf(value, today));
  const [previousInput, setPreviousInput] = useState({ value, today });

  if (previousInput.value !== value || previousInput.today !== today) {
    setPreviousInput({ value, today });
    if (parseIsoDate(value)) setView(viewOf(value, today));
  }

  const move = (delta: number) => setView((current) => addMonths(current.year, current.month, delta));
  const select = (iso: string) => {
    const parsed = parseIsoDate(iso);
    if (parsed) setView({ year: parsed.year, month: parsed.month });
    onChange(iso);
  };

  return (
    <Box sx={{ p: 1.5, width: CALENDAR_PANEL_WIDTH }} data-testid="date-panel">
      <CalendarHeader
        year={view.year}
        month={view.month}
        onYearChange={(year) => setView((current) => ({ ...current, year }))}
        onMonthChange={(month) => setView((current) => ({ ...current, month }))}
        onPrev={() => move(-1)}
        onNext={() => move(1)}
        prevLabel="이전 달"
        nextLabel="다음 달"
      />
      <DayGrid year={view.year} month={view.month} today={today} selected={value} onSelect={select} />
      <CalendarFooter todayLabel="오늘" onToday={() => select(today)} onClear={onClear} />
    </Box>
  );
}
