import { alpha } from '@mui/material/styles';

/** 컬럼 색이 있으면 윤곽선·글자·옅은 배경을 그 색으로, 없으면 기본 칩 모양으로 칠한다. */
export function columnChipProps(color?: string) {
  if (!color) return { color: 'primary' as const };
  return {
    'data-column-color': color,
    sx: { borderColor: color, color, bgcolor: alpha(color, 0.08), fontWeight: 600 },
  };
}
