import { roundGridNumber } from '../../../../shared/components/f1-grid/utils/grid.utils';
import {
  getDecimalColumnContract,
  resolveDecimalColumn,
} from '../../../../shared/services/decimalColumnContract';
import type { GridDecimalModuleRule, GridDecimalRule } from '../../../../shared/services/gridDecimalPolicy.service';

const UNITS = ['KB', 'MB', 'GB', 'TB'];

/** 그룹웨어 파일 크기(`groupware.file.fileSize`, decimal)의 정책 규칙. 정책이 없으면 undefined. */
export function resolveFileSizeRule(policy?: GridDecimalModuleRule): GridDecimalRule | undefined {
  return policy ? resolveDecimalColumn(getDecimalColumnContract('groupware.file').fileSize, policy) : undefined;
}

/**
 * 바이트를 B/KB/MB/GB/TB 단위로 환산해 표시한다. 환산한 숫자는 정책 규칙(자릿수·반올림·0 표시)을 따르고
 * 1024바이트 미만은 정수 바이트로 표시한다. 정책이 없으면 소수 자릿수를 정하지 않고 바이트로 표시한다.
 */
export function formatFileSize(bytes: number, rule?: GridDecimalRule): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024 || !rule) return `${bytes.toLocaleString('ko-KR')} B`;
  let unitIndex = 0;
  let value = bytes / 1024;
  while (value >= 1024 && unitIndex < UNITS.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const rounded = roundGridNumber(value, rule.places, rule.rounding);
  const text = rounded.toLocaleString('ko-KR', {
    minimumFractionDigits: rule.trailingZeros === 'AUTO' ? 0 : rule.places,
    maximumFractionDigits: rule.places,
  });
  return `${text} ${UNITS[unitIndex]}`;
}
