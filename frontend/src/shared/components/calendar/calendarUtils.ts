import dayjs from 'dayjs';

/** 달력 헤더의 요일(주 시작은 일요일). */
export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

export type CalendarCell = {
  /** `YYYY-MM-DD` */
  iso: string;
  day: number;
  /** 표시 중인 월에 속하면 true, 이전·다음 달 날짜면 false */
  inMonth: boolean;
  /** 0=일 … 6=토 */
  weekday: number;
};

export function toIsoDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function parseIsoDate(value: string): { year: number; month: number; day: number } | null {
  if (!isIsoDate(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  return { year, month, day };
}

export function isIsoDate(value: string | null | undefined): boolean {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = dayjs(value, 'YYYY-MM-DD', true);
  return parsed.isValid() && parsed.format('YYYY-MM-DD') === value;
}

/** 오늘 날짜(브라우저). 입력 기본값이 아니라 달력의 "오늘" 이동·표시에만 쓴다. */
export function todayIsoDate(): string {
  return dayjs().format('YYYY-MM-DD');
}

/** 표시 월(1~12)을 `delta`개월 옮긴다. */
export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12 + 12) % 12 + 1 };
}

/** 일요일부터 시작하는 6주×7일 고정 격자. 이전·다음 달 날짜도 포함한다. */
export function buildMonthGrid(year: number, month: number): CalendarCell[][] {
  const first = dayjs(toIsoDate(year, month, 1));
  const start = first.subtract(first.day(), 'day');
  const weeks: CalendarCell[][] = [];
  for (let week = 0; week < 6; week += 1) {
    const cells: CalendarCell[] = [];
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const date = start.add(week * 7 + weekday, 'day');
      cells.push({
        iso: date.format('YYYY-MM-DD'),
        day: date.date(),
        inMonth: date.month() + 1 === month && date.year() === year,
        weekday,
      });
    }
    weeks.push(cells);
  }
  return weeks;
}

/** 두 날짜를 오름차순으로 돌려준다. */
export function orderRange(a: string, b: string): [string, string] {
  return a <= b ? [a, b] : [b, a];
}

/** `iso`가 두 끝 날짜(순서 무관) 사이에 있는지(경계 포함). 한쪽이 비어 있으면 false. */
export function isWithinRange(iso: string, a: string, b: string): boolean {
  if (!a || !b) return false;
  const [from, to] = orderRange(a, b);
  return iso >= from && iso <= to;
}
