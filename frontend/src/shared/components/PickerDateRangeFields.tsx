import { Box } from '@mui/material';
import { FormDateField } from './FormDateField';

/**
 * 불러오기 창 검색 줄의 기간 입력(시작·종료). 공통 달력을 쓰며 필수 표시는 하지 않는다(비우면 기간 없이 조회).
 * `label`은 조회 기준 이름이다. 예) `발주일` → `발주일 시작`, `발주일 종료`.
 */
export function PickerDateRangeFields({ label, fromDt, toDt, onFromChange, onToChange }: {
  label: string;
  fromDt: string;
  toDt: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}) {
  return (
    <>
      <Box sx={{ width: 168, flexShrink: 0 }}>
        <FormDateField label={`${label} 시작`} required={false} value={fromDt} onChange={onFromChange} />
      </Box>
      <Box sx={{ width: 168, flexShrink: 0 }}>
        <FormDateField label={`${label} 종료`} required={false} value={toDt} onChange={onToChange} />
      </Box>
    </>
  );
}
