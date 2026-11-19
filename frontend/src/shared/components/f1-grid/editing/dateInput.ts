import dayjs from 'dayjs';

export const DATE_FORMAT = 'YYYY-MM-DD';

function buildIsoDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function isIsoDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsedValue = dayjs(value, DATE_FORMAT);
  return parsedValue.isValid() && parsedValue.format(DATE_FORMAT) === value;
}

export function normalizeDateInput(input: string, now = dayjs()): string {
  const value = input.trim().replace(/[^\d-]/g, '');
  const baseYear = now.year();
  const baseMonth = now.month() + 1;
  let candidate = '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    candidate = value;
  } else if (/^\d{8}$/.test(value)) {
    candidate = buildIsoDate(
      Number(value.slice(0, 4)),
      Number(value.slice(4, 6)),
      Number(value.slice(6)),
    );
  } else if (/^\d{6}$/.test(value)) {
    candidate = buildIsoDate(
      2000 + Number(value.slice(0, 2)),
      Number(value.slice(2, 4)),
      Number(value.slice(4)),
    );
  } else if (/^\d{4}$/.test(value)) {
    candidate = buildIsoDate(
      baseYear,
      Number(value.slice(0, 2)),
      Number(value.slice(2)),
    );
  } else if (/^\d{1,2}$/.test(value)) {
    candidate = buildIsoDate(baseYear, baseMonth, Number(value));
  } else {
    const monthDayMatch = value.match(/^(\d{1,2})-(\d{1,2})$/);
    if (monthDayMatch) {
      candidate = buildIsoDate(
        baseYear,
        Number(monthDayMatch[1]),
        Number(monthDayMatch[2]),
      );
    }
  }

  return isIsoDateString(candidate) ? candidate : '';
}
