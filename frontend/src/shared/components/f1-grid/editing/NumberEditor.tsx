import { InputBase } from '@mui/material';
import type { KeyboardEvent } from 'react';

type NumberEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
};

export function NumberEditor({
  value,
  onChange,
  onKeyDown,
}: NumberEditorProps) {
  return (
    <InputBase
      autoFocus
      fullWidth
      type="number"
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
