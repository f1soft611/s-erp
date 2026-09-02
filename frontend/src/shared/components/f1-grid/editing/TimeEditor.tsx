import AccessTimeIcon from '@mui/icons-material/AccessTime';
import {
  Dialog,
  DialogContent,
  IconButton,
  InputAdornment,
  TextField,
} from '@mui/material';
import { DigitalClock } from '@mui/x-date-pickers/DigitalClock';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { useState, type KeyboardEvent } from 'react';

type TimeEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
};

const TIME_FORMAT = 'HH:mm';

export function TimeEditor({ value, onChange, onKeyDown }: TimeEditorProps) {
  const [open, setOpen] = useState(false);
  const parsedValue = value ? dayjs(value, TIME_FORMAT) : null;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <TextField
        autoFocus
        fullWidth
        margin="none"
        variant="standard"
        value={value}
        onChange={(event) => onChange(event.target.value.slice(0, 5))}
        onKeyDown={onKeyDown}
        slotProps={{
          input: {
            disableUnderline: true,
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  aria-label="Choose time"
                  onClick={() => setOpen(true)}
                >
                  <AccessTimeIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
        sx={{
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
          '& .MuiInputAdornment-root': {
            marginLeft: 0,
          },
        }}
      />
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogContent>
          <DigitalClock
            value={parsedValue}
            onChange={(nextValue) => {
              const nextTime = nextValue?.isValid()
                ? nextValue.format(TIME_FORMAT)
                : '';
              onChange(nextTime);
              setOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </LocalizationProvider>
  );
}
