import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { IconButton, InputAdornment, Popover, TextField } from '@mui/material';
import { useEffect, useState } from 'react';
import { MonthPanel } from '../../calendar/MonthPanel';
import { formatMonthValue, normalizeMonthInput } from './monthInput';

type MonthEditorProps = {
  /** `YYYYMM` 여섯 자리(입력 중에는 일부만 있을 수 있다). */
  value: string;
  /** 입력한 값에서 숫자만 남긴 `YYYYMM` 또는 입력 중인 일부 숫자. */
  onChange: (value: string) => void;
  label?: string;
  onBlur?: () => void;
  required?: boolean;
  error?: boolean;
  helperText?: string;
};

/** 달력(연·월 선택)으로 월을 고르는 입력. 날짜 입력 `DateEditor`와 같은 모양이며 값은 `YYYYMM`이다. */
export function MonthEditor({ value, onChange, label, onBlur, required, error, helperText }: MonthEditorProps) {
  const [draft, setDraft] = useState(formatMonthValue(value));
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);

  useEffect(() => {
    setDraft((current) => (current.replace(/[^\d]/g, '') === value ? current : formatMonthValue(value)));
  }, [value]);

  const normalized = normalizeMonthInput(value);

  return (
    <>
      <TextField
        fullWidth
        size="small"
        margin="none"
        variant="outlined"
        label={label}
        required={required}
        placeholder="YYYY-MM"
        error={error}
        helperText={helperText}
        value={draft}
        onChange={(event) => {
          const digits = event.target.value.replace(/[^\d]/g, '').slice(0, 6);
          setDraft(digits.length > 4 ? `${digits.slice(0, 4)}-${digits.slice(4)}` : digits);
          onChange(digits);
        }}
        onBlur={onBlur}
        slotProps={{
          htmlInput: { 'aria-label': label, inputMode: 'numeric' },
          inputLabel: { shrink: true },
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  aria-label={label ? `${label} 달력 열기` : '달력 열기'}
                  onClick={(event) => setAnchor(event.currentTarget)}
                >
                  <CalendarMonthIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
        sx={{ minWidth: 0, '& .MuiInputBase-input': { minWidth: 0 } }}
      />
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <MonthPanel
          value={normalized}
          onChange={(month) => {
            setDraft(formatMonthValue(month));
            onChange(month);
            setAnchor(null);
          }}
          onClear={() => {
            setDraft('');
            onChange('');
            setAnchor(null);
          }}
        />
      </Popover>
    </>
  );
}
