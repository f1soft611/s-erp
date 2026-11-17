import { MenuItem, TextField } from '@mui/material';
import type { QuotationCodeOption } from '../services/quotationCommonCode.service';

type Props = {
  label: string;
  value: string;
  options: QuotationCodeOption[];
  disabled: boolean;
  onChange: (value: string) => void;
};

export function QuotationCodeSelect({ label, value, options, disabled, onChange }: Props) {
  const legacyValue = value && !options.some((option) => option.value === value);
  return (
    <TextField select label={label} size="small" value={value}
      disabled={disabled || options.length === 0}
      onChange={(event) => onChange(event.target.value)}>
      <MenuItem value="">선택 안 함</MenuItem>
      {legacyValue ? <MenuItem value={value} disabled>{value}</MenuItem> : null}
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
      ))}
    </TextField>
  );
}
