import { InputBase } from '@mui/material';
import type { KeyboardEvent } from 'react';
import { useF1GridNumberDraft } from './useF1GridNumberDraft';

type NumberEditorProps = {
  value: string;
  decimalPlaces?: number;
  exactDecimal?: boolean;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  selectOnFocus?: boolean;
};

function allowsExactInput(next: string, previous: string, decimalPlaces?: number): boolean {
  if (!/^[+-]?\d*(?:\.\d*)?$/.test(next)) return false;
  if (decimalPlaces === undefined || !Number.isInteger(decimalPlaces) || decimalPlaces < 0) return true;
  const dot = next.indexOf('.');
  if (dot === -1 || (decimalPlaces > 0 && next.length - dot - 1 <= decimalPlaces)) return true;
  if (next.length >= previous.length) return false;
  let position = 0;
  for (const character of previous) {
    if (character === next[position]) position++;
  }
  return position === next.length;
}

export function NumberEditor({
  value,
  decimalPlaces,
  exactDecimal = false,
  onChange,
  onKeyDown,
  selectOnFocus = true,
}: NumberEditorProps) {
  const { displayedValue, normalizeInput, clearDraft } =
    useF1GridNumberDraft(value, exactDecimal ? undefined : decimalPlaces);

  return (
    <InputBase
      autoFocus
      fullWidth
      type="number"
      inputMode={exactDecimal && decimalPlaces !== 0 ? 'decimal' : 'numeric'}
      value={displayedValue}
      onChange={(event) => {
        const next = event.target.value;
        if (exactDecimal && !allowsExactInput(next, value, decimalPlaces)) return;
        onChange(normalizeInput(next));
      }}
      onBlur={clearDraft}
      onKeyDown={(event) => {
        if (decimalPlaces === 0 && (event.key === '.' || event.key === ',')) {
          event.preventDefault();
          return;
        }
        onKeyDown(event);
      }}
      onBeforeInput={(event) => {
        const inserted = (event.nativeEvent as InputEvent).data;
        if (decimalPlaces === 0 && inserted && /[.,]/.test(inserted)) {
          event.preventDefault();
        }
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
          if (
            typeof input.selectionStart !== 'number' ||
            typeof input.selectionEnd !== 'number'
          ) {
            Object.defineProperty(input, 'selectionStart', {
              configurable: true,
              get: () => 0,
              set: () => undefined,
            });
            Object.defineProperty(input, 'selectionEnd', {
              configurable: true,
              get: () => input.value.length,
              set: () => undefined,
            });
          }

          input.focus();
          input.select();
          if (typeof input.setSelectionRange === 'function') {
            try {
              input.setSelectionRange(0, input.value.length);
            } catch {
              // Number inputs can reject selection range APIs in jsdom/browser gaps.
            }
          }
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
