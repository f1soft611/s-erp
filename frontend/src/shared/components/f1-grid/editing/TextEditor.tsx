import { InputBase } from '@mui/material';
import type { KeyboardEvent } from 'react';

type TextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
};

export function TextEditor({ value, onChange, onKeyDown }: TextEditorProps) {
  return (
    <InputBase
      autoFocus
      fullWidth
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
      sx={{
        width: '100%',
        height: '100%',
        minHeight: 0,
        fontSize: 'inherit',
        bgcolor: 'background.paper',
        '& .MuiInputBase-input': {
          height: '100%',
          minHeight: 0,
          boxSizing: 'border-box',
          paddingTop: 0,
          paddingBottom: 0,
        },
      }}
    />
  );
}
