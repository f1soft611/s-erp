import { InputBase } from '@mui/material';
import type { KeyboardEvent } from 'react';
import type { F1GridOption } from '../types/grid.types';

type AutocompleteEditorProps = {
  value: string;
  options: F1GridOption[];
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  onSelectChange: (value: F1GridOption['value']) => void;
};

export function AutocompleteEditor({
  value,
  options,
  onChange,
  onKeyDown,
  onSelectChange,
}: AutocompleteEditorProps) {
  return (
    <>
      <InputBase
        autoFocus
        fullWidth
        role="combobox"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            const option = options.find(
              (candidate) =>
                candidate.label === value || String(candidate.value) === value,
            );
            if (option) {
              event.preventDefault();
              event.stopPropagation();
              onSelectChange(option.value);
              return;
            }
          }
          onKeyDown(event);
        }}
        inputProps={{ list: 'f1-grid-autocomplete-options' }}
        sx={{ width: '100%', fontSize: 'inherit', bgcolor: 'background.paper' }}
      />
      <datalist id="f1-grid-autocomplete-options">
        {options.map((option) => (
          <option key={String(option.value)} value={option.label} />
        ))}
      </datalist>
    </>
  );
}
