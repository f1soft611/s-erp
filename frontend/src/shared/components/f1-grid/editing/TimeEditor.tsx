import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import dayjs from 'dayjs';
import type { KeyboardEvent } from 'react';

type TimeEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
};

const TIME_FORMAT = 'HH:mm';

export function TimeEditor({ value, onChange, onKeyDown }: TimeEditorProps) {
  const parsedValue = value ? dayjs(value, TIME_FORMAT) : null;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <TimePicker
        value={parsedValue}
        format={TIME_FORMAT}
        onChange={(nextValue) =>
          onChange(nextValue?.isValid() ? nextValue.format(TIME_FORMAT) : '')
        }
        slotProps={{
          textField: {
            autoFocus: true,
            fullWidth: true,
            variant: 'standard',
            onKeyDown,
            slotProps: { input: { disableUnderline: true } },
            sx: {
              width: '100%',
              fontSize: 'inherit',
              bgcolor: 'background.paper',
            },
          },
        }}
      />
    </LocalizationProvider>
  );
}
