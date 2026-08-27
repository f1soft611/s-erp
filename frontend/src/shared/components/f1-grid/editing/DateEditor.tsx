import { InputBase } from '@mui/material';
import type { KeyboardEvent } from 'react';

type DateEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
};

export function DateEditor({ value, onChange, onKeyDown }: DateEditorProps) {
  return (
    <InputBase
      autoFocus
      fullWidth
      type="date"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
      sx={{
        width: '100%',
        fontSize: 'inherit',
        bgcolor: 'background.paper',
      }}
    />
  );
}
