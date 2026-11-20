import { useState } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  Tooltip,
} from '@mui/material';
import { MasterPickerDialog } from './MasterPickerDialog';
import type { MasterPickerMultiSelectProps } from './masterPicker.types';
import ClearIcon from '@mui/icons-material/Clear';

export function CustomerMultiPicker({
  selectedValues,
  search,
  onApply,
  disabled = false,
  required = false,
  error = false,
  helperText,
}: MasterPickerMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const selectedLabels = selectedValues.length > 1
    ? `${selectedValues[0].name} 외 ${selectedValues.length - 1}건`
    : selectedValues[0]
      ? `${selectedValues[0].code} · ${selectedValues[0].name}`
      : '';
  const handleOpen = () => {
    setDialogKey((currentKey) => currentKey + 1);
    setOpen(true);
  };

  return (
    <>
      <Stack spacing={0.75} sx={{ minWidth: 0 }}>
        <TextField
          label="거래처"
          size="small"
          fullWidth
          required={required}
          error={error}
          helperText={helperText}
          value={selectedLabels}
          slotProps={{
            input: {
              readOnly: true,
              className: disabled ? undefined : 'app-selectable-readonly',
              endAdornment: (
                <InputAdornment position="end">
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                    <span
                      aria-label={`선택된 거래처 ${selectedValues.length}개`}
                    >
                      {selectedValues.length}개
                    </span>
                    <Tooltip title="거래처 선택">
                      <span>
                        <IconButton
                          aria-label="거래처 선택"
                          disabled={disabled}
                          edge="end"
                          onClick={handleOpen}
                          size="small"
                        >
                          <SearchIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                </InputAdornment>
              ),
            },
          }}
          sx={{
            '& .MuiInputBase-root': { height: 40, borderRadius: 1 },
            '& .MuiFormHelperText-root': { whiteSpace: 'nowrap' },
            '& input': { textOverflow: 'ellipsis' },
          }}
        />
        {selectedValues.length > 0 ? (
          <Stack
            direction="row"
            spacing={0.75}
            useFlexGap
            aria-label="선택된 거래처"
            sx={{ minWidth: 0, flexWrap: 'wrap' }}
          >
            {selectedValues.map((customer) => (
              <Box
                key={customer.id}
                sx={(theme) => ({
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.25,
                  maxWidth: '100%',
                  pl: 1,
                  pr: 0.25,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 999,
                  backgroundColor: theme.palette.action.hover,
                })}
              >
                <Typography variant="caption" noWrap sx={{ minWidth: 0 }}>
                  {customer.code} · {customer.name}
                </Typography>
                <IconButton
                  type="button"
                  size="small"
                  disabled={disabled}
                  aria-label={`거래처 ${customer.name} 제거`}
                  onClick={() => onApply(selectedValues.filter(({ id }) => id !== customer.id))}
                  sx={{ p: 0.25 }}
                >
                  <ClearIcon fontSize="inherit" />
                </IconButton>
              </Box>
            ))}
          </Stack>
        ) : null}
      </Stack>
      <MasterPickerDialog
        key={dialogKey}
        label="거래처"
        multiple
        open={open}
        search={search}
        selectedValues={selectedValues}
        onApply={onApply}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
