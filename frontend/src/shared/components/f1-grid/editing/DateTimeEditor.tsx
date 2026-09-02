import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs from 'dayjs';
import type { KeyboardEvent } from 'react';

type DateTimeEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
};

const DATE_TIME_FORMAT = 'YYYY-MM-DD[T]HH:mm';

export function DateTimeEditor({
  value,
  onChange,
  onKeyDown,
}: DateTimeEditorProps) {
  const parsedValue = value ? dayjs(value, DATE_TIME_FORMAT) : null;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DateTimePicker
        value={parsedValue}
        format={DATE_TIME_FORMAT}
        onChange={(nextValue) =>
          onChange(
            nextValue?.isValid() ? nextValue.format(DATE_TIME_FORMAT) : '',
          )
        }
        slotProps={{
          textField: {
            autoFocus: true,
            fullWidth: true,
            margin: 'none',
            variant: 'standard',
            onKeyDown,
            slotProps: { input: { disableUnderline: true } },
            sx: {
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
              },
            },
          },
        }}
      />
    </LocalizationProvider>
  );
}
