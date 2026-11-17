import { Box, ButtonBase } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { buildMonthGrid, isWithinRange, orderRange, WEEKDAY_LABELS } from './calendarUtils';

type DayGridProps = {
  year: number;
  month: number;
  today: string;
  /** 단일 날짜 선택값(`DatePanel`) */
  selected?: string;
  /** 범위 선택(`DateRangePanel`): 두 끝 날짜(순서 무관). 한쪽이 비면 범위로 칠하지 않는다. */
  rangeStart?: string;
  rangeEnd?: string;
  onSelect: (iso: string) => void;
  onHover?: (iso: string | null) => void;
};

const CELL_HEIGHT = 34;

/** 요일 머리글과 6주×7일 날짜 격자. 선택·범위·오늘 표시와 주말 색을 그린다. */
export function DayGrid({
  year,
  month,
  today,
  selected,
  rangeStart,
  rangeEnd,
  onSelect,
  onHover,
}: DayGridProps) {
  const weeks = buildMonthGrid(year, month);
  const hasRange = Boolean(rangeStart && rangeEnd);
  const [rangeFrom, rangeTo] = hasRange ? orderRange(rangeStart as string, rangeEnd as string) : ['', ''];

  return (
    <Box role="grid" aria-label={`${year}년 ${month}월`} onMouseLeave={() => onHover?.(null)}>
      <Box role="row" sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 0.5 }}>
        {WEEKDAY_LABELS.map((label, index) => (
          <Box
            key={label}
            role="columnheader"
            sx={(theme) => ({
              textAlign: 'center',
              fontSize: 13,
              fontWeight: 600,
              py: 0.5,
              color: index === 0 ? theme.palette.error.main : index === 6 ? theme.palette.info.main : 'text.primary',
            })}
          >
            {label}
          </Box>
        ))}
      </Box>
      {weeks.map((week) => (
        <Box key={week[0].iso} role="row" sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {week.map((cell) => {
            const isEdge = hasRange && (cell.iso === rangeFrom || cell.iso === rangeTo);
            const inRange = hasRange && isWithinRange(cell.iso, rangeFrom, rangeTo);
            const isSelected = isEdge || cell.iso === selected;
            const isToday = cell.iso === today;
            return (
              <ButtonBase
                key={cell.iso}
                role="gridcell"
                aria-label={cell.iso}
                aria-selected={isSelected}
                aria-current={isToday ? 'date' : undefined}
                onClick={() => onSelect(cell.iso)}
                onMouseEnter={() => onHover?.(cell.iso)}
                sx={(theme) => {
                  const weekendColor = cell.weekday === 0
                    ? theme.palette.error.main
                    : cell.weekday === 6
                      ? theme.palette.info.main
                      : theme.palette.text.primary;
                  return {
                    position: 'relative',
                    height: CELL_HEIGHT,
                    fontSize: 14,
                    borderRadius: isSelected ? 1.5 : 0,
                    color: isSelected ? theme.palette.primary.contrastText : weekendColor,
                    opacity: cell.inMonth || isSelected ? 1 : 0.4,
                    fontWeight: isSelected ? 700 : 400,
                    bgcolor: isSelected
                      ? theme.palette.primary.main
                      : inRange
                        ? alpha(theme.palette.primary.main, 0.16)
                        : 'transparent',
                    '&:hover': {
                      bgcolor: isSelected ? theme.palette.primary.dark : alpha(theme.palette.primary.main, 0.1),
                    },
                    '&::after': isToday
                      ? {
                          content: '""',
                          position: 'absolute',
                          top: 4,
                          right: 6,
                          width: 5,
                          height: 5,
                          borderRadius: '50%',
                          bgcolor: theme.palette.warning.main,
                        }
                      : undefined,
                  };
                }}
              >
                {cell.day}
              </ButtonBase>
            );
          })}
        </Box>
      ))}
    </Box>
  );
}
