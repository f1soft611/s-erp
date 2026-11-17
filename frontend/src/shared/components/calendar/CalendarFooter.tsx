import { Box, Button } from '@mui/material';

type CalendarFooterProps = {
  todayLabel: string;
  onToday: () => void;
  onClear: () => void;
};

/** 달력 하단의 좌 "오늘"(또는 "이번 달"), 우 "삭제" 단추. */
export function CalendarFooter({ todayLabel, onToday, onClear }: CalendarFooterProps) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
      <Button size="small" color="inherit" onClick={onToday} sx={{ minWidth: 0, color: 'text.secondary' }}>
        {todayLabel}
        <Box
          component="span"
          aria-hidden="true"
          sx={{ ml: 0.5, width: 5, height: 5, borderRadius: '50%', bgcolor: 'warning.main', alignSelf: 'flex-start' }}
        />
      </Button>
      <Button size="small" color="inherit" onClick={onClear} sx={{ minWidth: 0, color: 'text.secondary' }}>
        삭제
      </Button>
    </Box>
  );
}
