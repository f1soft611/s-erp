import { InputBase } from '@mui/material';
import type { KeyboardEvent } from 'react';

type DateTimeEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
};

export function DateTimeEditor({
  value,
  onChange,
  onKeyDown,
}: DateTimeEditorProps) {
  return (
    <InputBase
      autoFocus
      fullWidth
      type="datetime-local"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
      sx={{ width: '100%', fontSize: 'inherit', bgcolor: 'background.paper' }}
    />
  );
}
