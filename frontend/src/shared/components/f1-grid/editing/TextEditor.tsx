import { InputBase } from '@mui/material';
import type { KeyboardEvent } from 'react';

type TextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  selectOnFocus?: boolean;
};

export function TextEditor({
  value,
  onChange,
  onKeyDown,
  selectOnFocus = true,
}: TextEditorProps) {
  return (
    <InputBase
      autoFocus
      fullWidth
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
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
          font: 'inherit',
        },
      }}
    />
  );
}
