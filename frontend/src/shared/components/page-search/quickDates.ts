import dayjs, { type Dayjs } from 'dayjs';

export type QuickDatePreset = {
  key: string;
  label: string;
  resolve: (now: Dayjs) => { from: string; to: string };
};

const FORMAT = 'YYYY-MM-DD';

function range(from: Dayjs, to: Dayjs) {
  return { from: from.format(FORMAT), to: to.format(FORMAT) };
}

// 주의 시작은 월요일 기준이다.
function startOfWeek(now: Dayjs): Dayjs {
  return now.startOf('day').subtract((now.day() + 6) % 7, 'day');
}

export const QUICK_DATE_PRESETS: QuickDatePreset[] = [
  { key: 'today', label: '오늘', resolve: (now) => range(now, now) },
  {
    key: 'thisWeek',
    label: '이번주',
    resolve: (now) => {
      const start = startOfWeek(now);
      return range(start, start.add(6, 'day'));
    },
  },
  {
    key: 'thisMonth',
    label: '이번달',
    resolve: (now) => range(now.startOf('month'), now.endOf('month')),
  },
  {
    key: 'lastMonth',
    label: '전월',
    resolve: (now) => {
      const previous = now.startOf('month').subtract(1, 'month');
      return range(previous, previous.endOf('month'));
    },
  },
  {
    key: 'last30Days',
    label: '최근 30일',
    resolve: (now) => range(now.subtract(29, 'day'), now),
  },
];

export function resolveQuickDate(preset: QuickDatePreset, now = dayjs()) {
  return preset.resolve(now);
}
