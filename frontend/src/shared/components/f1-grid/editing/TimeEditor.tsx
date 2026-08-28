import { InputBase } from '@mui/material';
import type { KeyboardEvent } from 'react';

type TimeEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
};

export function TimeEditor({ value, onChange, onKeyDown }: TimeEditorProps) {
  return (
    <InputBase
      autoFocus
      fullWidth
      type="time"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
      sx={{ width: '100%', fontSize: 'inherit', bgcolor: 'background.paper' }}
    />
  );
}
