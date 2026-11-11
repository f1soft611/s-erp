import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import HistoryEduOutlinedIcon from '@mui/icons-material/HistoryEduOutlined';
import MoveUpOutlinedIcon from '@mui/icons-material/MoveUpOutlined';
import { Box, Button, MenuItem, Paper, TextField, Typography } from '@mui/material';
import type { F1GridOption } from '../../../../../shared/components/f1-grid';
import { MaterialPicker } from '../../../../../shared/components/master-picker/MasterPickers';
import type { MasterPickerOption } from '../../../../../shared/components/master-picker/masterPicker.types';
import {
  PRODUCT_CATEGORY_OPTIONS,
  PRODUCTION_UNIT_OPTIONS,
  SHELF_LIFE_BASE_OPTIONS,
} from '../data/workStandard.data';
import { searchWorkStandardMaterials } from '../services/workStandard.service';
import type { WorkStandardHeader } from '../types/workStandard.types';

type Props = {
  header: WorkStandardHeader;
  onChange: (patch: Partial<WorkStandardHeader>) => void;
  disabled?: boolean;
  /** 백엔드 연결 전까지 복사·버전 개정·이관 업무 버튼은 비활성화한다. */
  actionsDisabled?: boolean;
  /** 등록·변경 이력 요약 문구 */
  auditText?: string;
};

function toItemAccount(value: string | undefined): WorkStandardHeader['itemAccount'] {
  return value === '제품' || value === '반제품' || value === '원료' ? value : '';
}

export function WorkStandardBasicInfo({
  header,
  onChange,
  disabled = false,
  actionsDisabled = true,
  auditText,
}: Props) {
  const materialValue: MasterPickerOption | null = header.materialCode
    ? {
        id: header.materialId ?? 0,
        code: header.materialCode,
        name: header.materialName,
      }
    : null;
  const textProps = (field: keyof WorkStandardHeader) => ({
    size: 'small' as const,
    value: header[field] ?? '',
    disabled,
    onChange: (event: { target: { value: string } }) =>
      onChange({ [field]: event.target.value } as Partial<WorkStandardHeader>),
  });
  const numberProps = (field: keyof WorkStandardHeader) => ({
    size: 'small' as const,
    type: 'number',
    value: header[field] ?? 0,
    disabled,
    onChange: (event: { target: { value: string } }) =>
      onChange({
        [field]: Math.max(0, Number(event.target.value) || 0),
      } as Partial<WorkStandardHeader>),
    slotProps: { htmlInput: { min: 0 } },
  });
  const dateProps = (field: keyof WorkStandardHeader) => ({
    ...textProps(field),
    type: 'date',
    slotProps: { inputLabel: { shrink: true } },
  });

  return (
    <Paper
      variant="outlined"
      aria-label="작업표준서 기본정보"
      component="section"
      sx={{ p: { xs: 1.5, sm: 2 }, minWidth: 0, borderRadius: 1 }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
          mb: 2,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            flexWrap: 'wrap',
            columnGap: 1.5,
            minWidth: 0,
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            작업표준서 기본정보
          </Typography>
          {auditText ? (
            <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
              {auditText}
            </Typography>
          ) : null}
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<ContentCopyOutlinedIcon fontSize="small" />}
            disabled={actionsDisabled}
          >
            복사
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<HistoryEduOutlinedIcon fontSize="small" />}
            disabled={actionsDisabled}
          >
            버전 개정
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<MoveUpOutlinedIcon fontSize="small" />}
            disabled={actionsDisabled}
          >
            샘플→양산 이관
          </Button>
        </Box>
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr)',
            sm: 'repeat(2, minmax(0, 1fr))',
            lg: 'repeat(4, minmax(0, 1fr))',
          },
          columnGap: 2,
          rowGap: 1,
          '& > .MuiFormControl-root': { m: 0 },
          '& > .MuiStack-root': { mt: 0 },
        }}
      >
        <TextField
          label="품목코드"
          size="small"
          value={header.materialCode || '품목 선택 시 자동 입력'}
          slotProps={{ input: { readOnly: true } }}
        />
        <MaterialPicker
          value={materialValue}
          search={searchWorkStandardMaterials}
          triggerMode="icon"
          disabled={disabled}
          required
          onChange={(option) => {
            const detail = (label: string) =>
              option.details?.find((item) => item.label === label)?.value;
            onChange({
              materialId: option.id,
              materialCode: option.code,
              materialName: option.name,
              itemAccount: toItemAccount(detail('품목계정')),
            });
          }}
        />
        <TextField
          label="품목계정"
          size="small"
          value={header.itemAccount}
          slotProps={{ input: { readOnly: true } }}
        />
        <SelectField
          label="제품분류"
          required
          options={PRODUCT_CATEGORY_OPTIONS}
          {...textProps('productCategory')}
        />
        <TextField
          label="버전"
          size="small"
          value={`Rev. ${header.version}${header.revisionCount ? ` (개정 ${header.revisionCount}회)` : ''}`}
          slotProps={{ input: { readOnly: true } }}
        />
        <TextField
          label="버전 상태"
          size="small"
          value={
            header.versionStatus
              ? `${header.versionStatus}${header.versionStatusSince ? ` (${header.versionStatusSince}~)` : ''}`
              : ''
          }
          slotProps={{ input: { readOnly: true } }}
        />
        <TextField label="적용시작일" required {...dateProps('applyStartDt')} />
        <TextField label="적용종료일" {...dateProps('applyEndDt')} />
        <SelectField
          label="생산단위"
          required
          options={PRODUCTION_UNIT_OPTIONS}
          {...textProps('productionUnit')}
        />
        <TextField label="기준 생산량" required {...numberProps('baseQty')} />
        <TextField label="판당 개수" {...numberProps('piecesPerPlate')} />
        <SelectField
          label="소비기한 기준"
          options={SHELF_LIFE_BASE_OPTIONS}
          {...textProps('shelfLifeBase')}
        />
        <TextField label="제정일자" {...dateProps('establishedDt')} />
        <TextField label="개정일자" {...dateProps('revisedDt')} />
        <TextField label="생산책임자" {...textProps('productionManager')} />
        <TextField label="담당연구원" {...textProps('researcher')} />
      </Box>
    </Paper>
  );
}

type SelectFieldProps = {
  label: string;
  options: F1GridOption[];
  required?: boolean;
  size: 'small';
  value: unknown;
  disabled: boolean;
  onChange: (event: { target: { value: string } }) => void;
};

function SelectField({ options, value, ...props }: SelectFieldProps) {
  return (
    <TextField select {...props} value={String(value ?? '')}>
      <MenuItem value="">
        <em>선택</em>
      </MenuItem>
      {options.map((option) => (
        <MenuItem key={String(option.value)} value={String(option.value)}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
}
