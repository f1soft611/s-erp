import { Input, MenuItem, Select } from '@mui/material';
import type { F1GridOption } from '../types/grid.types';

type SelectEditorProps = {
  value: string | number | boolean;
  options: F1GridOption[];
  onChange: (value: string | number | boolean) => void;
};

export function SelectEditor({ value, options, onChange }: SelectEditorProps) {
  return (
    <Select
      autoFocus
      fullWidth
      size="small"
      input={<Input disableUnderline />}
      value={String(value)}
      onChange={(event) =>
        onChange(
          options.find((option) => String(option.value) === event.target.value)
            ?.value ?? event.target.value,
        )
      }
      sx={{
        width: '100%',
        fontSize: 'inherit',
        '& .MuiSelect-select': {
          display: 'flex',
          alignItems: 'center',
          py: 0,
          pl: 0,
          pr: 3,
          minHeight: 'unset',
        },
      }}
    >
      {options.map((option) => (
        <MenuItem key={String(option.value)} value={String(option.value)}>
          {option.label}
        </MenuItem>
      ))}
    </Select>
  );
}
