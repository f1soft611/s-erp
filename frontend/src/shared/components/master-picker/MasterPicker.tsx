import { useState } from 'react';
import { Button, Stack, TextField } from '@mui/material';
import { MasterPickerDialog } from './MasterPickerDialog';
import type {
  MasterPickerOption,
  MasterPickerProps,
} from './masterPicker.types';

export function MasterPicker({
  label,
  value,
  search,
  onChange,
  disabled = false,
}: MasterPickerProps) {
  const [open, setOpen] = useState(false);

  const handleChange = (option: MasterPickerOption) => {
    onChange(option);
    setOpen(false);
  };

  return (
    <>
      <Stack direction="row" spacing={1} sx={{ minWidth: 0 }}>
        <TextField
          label={label}
          size="small"
          fullWidth
          value={value ? `${value.code} · ${value.name}` : ''}
          slotProps={{ input: { readOnly: true } }}
        />
        <Button
          type="button"
          variant="outlined"
          disabled={disabled}
          onClick={() => setOpen(true)}
          aria-label={`${label} 선택`}
          sx={{ flexShrink: 0, minWidth: 76, height: 40, minHeight: 40 }}
        >
          선택
        </Button>
      </Stack>
      <MasterPickerDialog
        label={label}
        open={open}
        search={search}
        onClose={() => setOpen(false)}
        onChange={handleChange}
      />
    </>
  );
}
