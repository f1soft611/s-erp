import { TextField } from '@mui/material';
import type { ComponentProps, ReactNode } from 'react';

type LoginFormFieldProps = Omit<
  ComponentProps<typeof TextField>,
  'variant' | 'onChange' | 'error'
> & {
  label: string;
  error?: string;
  onChange?: (value: string) => void;
  endAdornment?: ReactNode;
};

function LoginFormField({
  label,
  error,
  onChange,
  endAdornment,
  ...props
}: LoginFormFieldProps) {
  return (
    <TextField
      {...props}
      label={label}
      variant="outlined"
      error={Boolean(error)}
      helperText={error ?? ' '}
      onChange={(event) => onChange?.(event.target.value)}
      slotProps={{
        input: {
          endAdornment,
          sx: {
            borderRadius: 2,
            backgroundColor: '#f8fafc',
            minHeight: 52,
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#cbd5e1',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#94a3b8',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderWidth: 1.5,
              borderColor: '#2563eb',
            },
          },
        },
        formHelperText: {
          sx: {
            margin: 0,
            minHeight: '0.75em',
            lineHeight: 1.2,
          },
        },
      }}
      sx={{
        '& .MuiInputBase-root': {
          minHeight: 52,
        },
      }}
      aria-invalid={Boolean(error)}
    />
  );
}

export default LoginFormField;
