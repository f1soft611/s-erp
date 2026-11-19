import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { IconButton, InputAdornment, Popover, TextField } from '@mui/material';
import { useState, type KeyboardEvent, type ReactNode } from 'react';
import { DatePanel } from '../../calendar/DatePanel';
import { DATE_FORMAT, normalizeDateInput } from './dateInput';

type DateEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
  selectOnFocus?: boolean;
  autoFocus?: boolean;
  variant?: 'standard' | 'outlined';
  label?: string;
  onBlur?: () => void;
  required?: boolean;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  /**
   * 달력 팝업 내용을 직접 그린다(예: 기간 검색의 범위 달력). 없으면 날짜 하나를 고르는 기본 달력을 쓴다.
   * `value`는 현재 입력 값이고 `close`는 팝업을 닫는다.
   */
  renderCalendar?: (api: { value: string; close: () => void }) => ReactNode;
};

export function DateEditor({
  value,
  onChange,
  onKeyDown,
  selectOnFocus = true,
  autoFocus = true,
  variant = 'standard',
  label,
  onBlur,
  required,
  error,
  helperText,
  disabled = false,
  renderCalendar,
}: DateEditorProps) {
  const [draftValue, setDraftValue] = useState(value);
  const [calendarAnchor, setCalendarAnchor] =
    useState<HTMLButtonElement | null>(null);
  const [previousInput, setPreviousInput] = useState({ value, disabled });

  if (previousInput.value !== value || previousInput.disabled !== disabled) {
    setPreviousInput({ value, disabled });
    setDraftValue(value);
    if (disabled) setCalendarAnchor(null);
  }

  const closeCalendar = () => setCalendarAnchor(null);
  const normalizedValue = normalizeDateInput(value);

  return (
    <>
      <TextField
        autoFocus={autoFocus}
        fullWidth
        size={variant === 'outlined' ? 'small' : undefined}
        margin="none"
        variant={variant}
        label={label}
        required={required}
        placeholder={variant === 'outlined' ? DATE_FORMAT : undefined}
        error={error}
        helperText={helperText}
        disabled={disabled}
        value={draftValue}
        onChange={(event) => {
          const nextValue = event.target.value
            .replace(/[^\d-]/g, '')
            .slice(0, 10);
          setDraftValue(nextValue);
          onChange(nextValue);
        }}
        onFocus={(event) => {
          if (!selectOnFocus) return;
          const input =
            (event.currentTarget as HTMLElement | null)?.querySelector('input') ??
            (event.target instanceof HTMLInputElement ? event.target : null);
          if (!(input instanceof HTMLInputElement) || input.value.length === 0) {
            return;
          }
          try {
            input.setSelectionRange(0, input.value.length);
          } catch {
            // Ignore invalid state on wrapped MUI inputs.
          }
        }}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        slotProps={{
          htmlInput: {
            'aria-label': label,
            ...(variant === 'outlined' ? { inputMode: 'numeric' } : {}),
          },
          ...(variant === 'outlined' ? { inputLabel: { shrink: true } } : {}),
          input: {
            ...(variant === 'standard' ? { disableUnderline: true } : {}),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  disabled={disabled}
                  aria-label={label ? `${label} 달력 열기` : '달력 열기'}
                  onClick={(event) => setCalendarAnchor(event.currentTarget)}
                >
                  <CalendarMonthIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
        sx={
          variant === 'standard'
            ? {
                width: '100%',
                height: '100%',
                minHeight: 0,
                fontSize: 'inherit',
                bgcolor: 'background.paper',
                '& .MuiInputBase-root': {
                  height: '100%',
                  minHeight: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '0 !important',
                  padding: 0,
                  fontSize: 'inherit',
                  '&:before, &:after': {
                    borderBottom: '0 !important',
                  },
                },
                '& .MuiInputBase-input': {
                  padding: '0 4px',
                  lineHeight: 'normal',
                  height: 'auto',
                  minHeight: 0,
                  boxSizing: 'border-box',
                  textAlign: 'center',
                  font: 'inherit',
                  fontSize: 'inherit',
                },
                '& .MuiInputAdornment-root': {
                  marginLeft: 0,
                },
              }
            : { minWidth: 0, '& .MuiInputBase-input': { minWidth: 0 } }
        }
      />
      <Popover
        open={!disabled && Boolean(calendarAnchor)}
        anchorEl={calendarAnchor}
        onClose={() => setCalendarAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        {renderCalendar ? (
          renderCalendar({ value, close: closeCalendar })
        ) : (
          <DatePanel
            value={normalizedValue}
            onChange={(nextDate) => {
              setDraftValue(nextDate);
              onChange(nextDate);
              closeCalendar();
            }}
            onClear={() => {
              setDraftValue('');
              onChange('');
              closeCalendar();
            }}
          />
        )}
      </Popover>
    </>
  );
}
