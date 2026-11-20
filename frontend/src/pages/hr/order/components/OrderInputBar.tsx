import { Box, Button, InputAdornment, MenuItem, TextField } from '@mui/material';
import { FormDateField } from '../../../../shared/components/FormDateField';
import type { OrderPost } from '../data/orderGridData';
import type { OrderCodeOptions, OrderTypeDef } from '../types/order.types';

type Props = {
  types: OrderTypeDef[];
  type: OrderTypeDef | undefined;
  typeCode: string;
  codeOptions: OrderCodeOptions;
  orderDt: string;
  bar: OrderPost;
  remark: string;
  disabled: boolean;
  onTypeChange: (code: string) => void;
  onOrderDtChange: (value: string) => void;
  onBarChange: (post: OrderPost) => void;
  onRemarkChange: (value: string) => void;
  onOpenDepartmentPicker: () => void;
};

/**
 * 명령 입력 줄. 명령 유형·명령일·명령 후 값(유형별 입력)·비고를 한 번에 입력하면 대상 사원 모두에 적용된다.
 * 대상 사원 표에서 사원별로 명령 후 값을 따로 고칠 수 있다.
 */
export function OrderInputBar({
  types, type, typeCode, codeOptions, orderDt, bar, remark, disabled,
  onTypeChange, onOrderDtChange, onBarChange, onRemarkChange, onOpenDepartmentPicker,
}: Props) {
  const postLabel = `${type?.fieldName ?? '값'}(명령 후)`;

  const postControl = () => {
    if (!type) {
      return <TextField size="small" label="명령 후 값" disabled placeholder="명령 유형을 먼저 선택해 주세요." fullWidth />;
    }
    if (type.inputKind === 'department') {
      return (
        <TextField
          size="small"
          fullWidth
          label={postLabel}
          value={bar.label}
          placeholder="부서 선택"
          disabled={disabled}
          onClick={() => { if (!disabled) onOpenDepartmentPicker(); }}
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: { readOnly: true, 'aria-label': postLabel },
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <Button size="small" disabled={disabled} onClick={onOpenDepartmentPicker}>부서 선택</Button>
                </InputAdornment>
              ),
            },
          }}
        />
      );
    }
    if (type.inputKind === 'code') {
      return (
        <TextField
          select
          size="small"
          fullWidth
          label={postLabel}
          value={bar.value}
          disabled={disabled}
          onChange={(event) => {
            const option = (codeOptions[type.codeGroup] ?? []).find((candidate) => candidate.value === event.target.value);
            onBarChange({ value: event.target.value, label: option?.label ?? '' });
          }}
          slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
        >
          <MenuItem value=""><em>선택</em></MenuItem>
          {(codeOptions[type.codeGroup] ?? []).map((option) => (
            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
          ))}
        </TextField>
      );
    }
    return (
      <FormDateField
        label={postLabel}
        value={bar.value}
        disabled={disabled}
        onChange={(value) => onBarChange({ value, label: '' })}
      />
    );
  };

  return (
    <Box
      component="section"
      aria-label="명령 입력"
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' },
        gap: 2,
        alignItems: 'start',
        '& .MuiTextField-root': { margin: 0 },
      }}
    >
      <TextField
        select
        size="small"
        fullWidth
        label="명령 유형"
        required
        value={typeCode}
        disabled={disabled || types.length === 0}
        onChange={(event) => onTypeChange(event.target.value)}
        slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
      >
        <MenuItem value=""><em>선택</em></MenuItem>
        {types.map((item) => <MenuItem key={item.code} value={item.code}>{item.name}</MenuItem>)}
      </TextField>
      <FormDateField label="명령일" value={orderDt} disabled={disabled} onChange={onOrderDtChange} />
      {postControl()}
      <TextField
        size="small"
        fullWidth
        label="비고"
        value={remark}
        disabled={disabled}
        onChange={(event) => onRemarkChange(event.target.value)}
        slotProps={{ htmlInput: { maxLength: 500 }, inputLabel: { shrink: true } }}
      />
    </Box>
  );
}
