import SearchIcon from '@mui/icons-material/Search';
import {
  Autocomplete,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormHelperText,
  IconButton,
  InputAdornment,
  MenuItem,
  TextField,
  Tooltip,
} from '@mui/material';
import type {
  F1GridColumn,
  F1GridFormMode,
  F1GridOption,
} from '../types/grid.types';

export type GridFormFieldProps<T extends object> = {
  column: F1GridColumn<T>;
  row: T;
  mode: F1GridFormMode;
  value: unknown;
  readOnly: boolean;
  error?: string;
  onPatch: (patch: Partial<T>) => void;
};

export function GridFormField<T extends object>({
  column,
  row,
  value,
  readOnly,
  error,
  onPatch,
}: GridFormFieldProps<T>) {
  const fieldName = String(column.field);
  const helperTextId = `${fieldName}-form-helper-text`;
  const displayedValue = column.getValue ? column.getValue(row) : value;
  const options = column.options ?? [];

  const applyValue = (nextValue: unknown) => {
    onPatch(
      column.onValueChange?.(row, nextValue) ??
        ({ [column.field]: nextValue } as Partial<T>),
    );
  };

  const sharedTextFieldProps = {
    fullWidth: true,
    label: column.headerName,
    margin: 'none' as const,
    required: column.required,
    error: Boolean(error),
    helperText: error,
    slotProps: {
      htmlInput: {
        readOnly,
        'aria-describedby': error ? helperTextId : undefined,
      },
      formHelperText: { id: helperTextId },
    },
  };

  if (column.type === 'checkbox') {
    return (
      <FormControl required={column.required} error={Boolean(error)}>
        <FormControlLabel
          label={column.headerName}
          control={
            <Checkbox
              checked={Boolean(displayedValue)}
              required={column.required}
              slotProps={{
                input: {
                  readOnly,
                  'aria-describedby': error ? helperTextId : undefined,
                  'aria-invalid': Boolean(error),
                },
              }}
              onChange={(event) => {
                if (!readOnly) applyValue(event.target.checked);
              }}
            />
          }
        />
        {error && <FormHelperText id={helperTextId}>{error}</FormHelperText>}
      </FormControl>
    );
  }

  if (column.type === 'select') {
    return (
      <TextField
        {...sharedTextFieldProps}
        select
        value={String(displayedValue ?? '')}
        slotProps={{
          ...sharedTextFieldProps.slotProps,
          select: { readOnly },
        }}
        onChange={(event) => {
          const option = options.find(
            (candidate) => String(candidate.value) === event.target.value,
          );
          applyValue(option?.value ?? event.target.value);
        }}
      >
        {options.map((option) => (
          <MenuItem key={String(option.value)} value={String(option.value)}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  if (column.type === 'autocomplete') {
    const selectedOption = options.find((option) =>
      Object.is(option.value, displayedValue),
    );

    return (
      <Autocomplete
        fullWidth
        readOnly={readOnly}
        options={options}
        value={selectedOption ?? null}
        getOptionLabel={(option) => option.label}
        isOptionEqualToValue={(option, selected) =>
          Object.is(option.value, selected.value)
        }
        onChange={(_event, option: F1GridOption | null) =>
          applyValue(option?.value ?? '')
        }
        renderInput={(params) => (
          <TextField
            {...params}
            fullWidth
            label={column.headerName}
            margin="none"
            required={column.required}
            error={Boolean(error)}
            helperText={error}
            slotProps={{
              ...params.slotProps,
              htmlInput: {
                ...params.slotProps.htmlInput,
                readOnly,
                'aria-describedby': error ? helperTextId : undefined,
              },
              formHelperText: { id: helperTextId },
            }}
          />
        )}
      />
    );
  }

  if (column.type === 'code') {
    const openCodePicker = () => {
      const mergedPatch: Partial<T> = {};
      const returnedPatch = column.onOpenCodePicker?.(row, (patch) => {
        Object.assign(mergedPatch, patch);
      });
      if (returnedPatch) Object.assign(mergedPatch, returnedPatch);
      if (Object.keys(mergedPatch).length > 0) onPatch(mergedPatch);
    };

    return (
      <TextField
        {...sharedTextFieldProps}
        value={String(displayedValue ?? '')}
        slotProps={{
          ...sharedTextFieldProps.slotProps,
          htmlInput: {
            ...sharedTextFieldProps.slotProps.htmlInput,
            readOnly: true,
          },
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title={`${column.headerName} 선택`}>
                  <span>
                    <IconButton
                      aria-label={`${column.headerName} 선택`}
                      disabled={readOnly || !column.onOpenCodePicker}
                      edge="end"
                      onClick={openCodePicker}
                    >
                      <SearchIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              </InputAdornment>
            ),
          },
        }}
      />
    );
  }

  const isNumber =
    column.type === 'number' ||
    column.type === 'decimal' ||
    column.type === 'currency';
  const inputType = isNumber
    ? 'number'
    : column.type === 'datetime'
      ? 'datetime-local'
      : column.type === 'date' || column.type === 'time'
        ? column.type
        : 'text';

  return (
    <TextField
      {...sharedTextFieldProps}
      type={inputType}
      value={displayedValue == null ? '' : String(displayedValue)}
      onChange={(event) => {
        const nextValue =
          isNumber && event.target.value !== ''
            ? Number(event.target.value)
            : event.target.value;
        applyValue(nextValue);
      }}
    />
  );
}
