import { Box } from '@mui/material';
import { useState } from 'react';
import { CALENDAR_PANEL_WIDTH } from './DatePanel';
import { CalendarFooter } from './CalendarFooter';
import { CalendarHeader } from './CalendarHeader';
import { addMonths, orderRange, parseIsoDate, todayIsoDate } from './calendarUtils';
import { DayGrid } from './DayGrid';

export type DateRangePanelProps = {
  /** `YYYY-MM-DD`(비어 있을 수 있음) */
  from: string;
  to: string;
  /**
   * 범위가 바뀔 때마다 호출한다. 첫 클릭은 그 하루를 시작=종료로 보내고(`done=false`),
   * 두 번째 클릭은 순서를 바로잡아 완성된 범위를 보낸다(`done=true`).
   */
  onChange: (from: string, to: string, done: boolean) => void;
  onClear: () => void;
  todayValue?: string;
};

/** 한 달력에서 시작일과 종료일을 이어서 고르는 범위 달력. 사이 날짜를 칠하고 종료일 선택 전에는 호버 미리보기를 보여 준다. */
export function DateRangePanel({ from, to, onChange, onClear, todayValue }: DateRangePanelProps) {
  const today = todayValue ?? todayIsoDate();
  const initial = parseIsoDate(from) ?? parseIsoDate(today) ?? { year: new Date().getFullYear(), month: 1 };
  const [view, setView] = useState({ year: initial.year, month: initial.month });
  const [anchor, setAnchor] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  const move = (delta: number) => setView((current) => addMonths(current.year, current.month, delta));
  const goTo = (iso: string) => {
    const parsed = parseIsoDate(iso);
    if (parsed) setView({ year: parsed.year, month: parsed.month });
  };

  const select = (iso: string) => {
    goTo(iso);
    if (anchor === null) {
      setAnchor(iso);
      onChange(iso, iso, false);
      return;
    }
    const [start, end] = orderRange(anchor, iso);
    setAnchor(null);
    setHover(null);
    onChange(start, end, true);
  };

  // 종료일을 고르는 중에는 시작일부터 호버한 날짜까지 미리 칠한다.
  const rangeStart = anchor !== null ? anchor : from;
  const rangeEnd = anchor !== null ? (hover ?? anchor) : to;

  return (
    <Box sx={{ p: 1.5, width: CALENDAR_PANEL_WIDTH }} data-testid="date-range-panel">
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
      <DayGrid
        year={view.year}
        month={view.month}
        today={today}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        onSelect={select}
        onHover={anchor !== null ? setHover : undefined}
      />
      <CalendarFooter
        todayLabel="오늘"
        onToday={() => {
          setAnchor(null);
          onChange(today, today, true);
        }}
        onClear={() => {
          setAnchor(null);
          onClear();
        }}
      />
    </Box>
  );
}
