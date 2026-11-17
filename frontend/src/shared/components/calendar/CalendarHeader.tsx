import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Box, IconButton, TextField } from '@mui/material';

type CalendarHeaderProps = {
  year: number;
  /** 월 드롭다운을 보이지 않으려면(월 달력) 생략한다. */
  month?: number;
  onYearChange: (year: number) => void;
  onMonthChange?: (month: number) => void;
  onPrev: () => void;
  onNext: () => void;
  prevLabel: string;
  nextLabel: string;
};

const YEARS_BEFORE = 50;
const YEARS_AFTER = 20;

const selectSx = {
  minWidth: 0,
  '& .MuiInputBase-root': { fontSize: 14, fontWeight: 600, bgcolor: 'background.paper' },
  // 연도 네 자리가 잘리지 않도록 오른쪽 화살표 자리를 넉넉히 둔다.
  '& select': { py: '4px !important', pl: '12px !important', pr: '32px !important', minWidth: '4.5ch', textOverflow: 'clip' },
  '& .MuiNativeSelect-icon, & .MuiSelect-icon': { right: 4 },
} as const;

/** 이전/다음 화살표와 연도·월 드롭다운. 날짜·기간·월 달력이 함께 쓴다. */
export function CalendarHeader({
  year,
  month,
  onYearChange,
  onMonthChange,
  onPrev,
  onNext,
  prevLabel,
  nextLabel,
}: CalendarHeaderProps) {
  const years: number[] = [];
  for (let value = year - YEARS_BEFORE; value <= year + YEARS_AFTER; value += 1) years.push(value);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5, mb: 1 }}>
      <IconButton size="small" aria-label={prevLabel} onClick={onPrev}>
        <ChevronLeftIcon fontSize="small" />
      </IconButton>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <TextField
          select
          size="small"
          value={year}
          onChange={(event) => onYearChange(Number(event.target.value))}
          slotProps={{ select: { native: true }, htmlInput: { 'aria-label': '연도' } }}
          sx={{ ...selectSx, width: 112, flexShrink: 0 }}
        >
          {years.map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </TextField>
        {month !== undefined && onMonthChange ? (
          <TextField
            select
            size="small"
            value={month}
            onChange={(event) => onMonthChange(Number(event.target.value))}
            slotProps={{ select: { native: true }, htmlInput: { 'aria-label': '월' } }}
            sx={{ ...selectSx, width: 84, flexShrink: 0 }}
          >
            {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </TextField>
        ) : null}
      </Box>
      <IconButton size="small" aria-label={nextLabel} onClick={onNext}>
        <ChevronRightIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}
