import { Box, Chip, Stack, Typography } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import {
  isGridDecimalPolicy,
  ROUNDING_LABELS,
  type GridDecimalPolicyValue,
  type SystemPolicy,
} from '../types/systemPolicy.types';

type Side = 'before' | 'after';
type DecimalType = 'number' | 'decimal' | 'currency';
type RuleKey = keyof GridDecimalPolicyValue;
type Segment = { text: string; changed: boolean };
type Row = { key: string; label: string | null; segments: Segment[] };

const DECIMAL_TYPES: DecimalType[] = ['number', 'decimal', 'currency'];
const RULE_KEYS: RuleKey[] = ['places', 'trailingZeros', 'rounding'];

function decimalRule(value: unknown): GridDecimalPolicyValue | null {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return { places: value, trailingZeros: 'FIXED', rounding: 'HALF_UP' };
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const rule = value as Record<string, unknown>;
  if (!Number.isInteger(rule.places) || Number(rule.places) < 0) return null;
  if (rule.trailingZeros !== undefined && rule.trailingZeros !== 'FIXED' && rule.trailingZeros !== 'AUTO') return null;
  if (rule.rounding !== undefined && rule.rounding !== 'HALF_UP' && rule.rounding !== 'UP' && rule.rounding !== 'DOWN') return null;
  return {
    places: rule.places as number,
    trailingZeros: rule.trailingZeros === 'AUTO' ? 'AUTO' : 'FIXED',
    rounding: rule.rounding === 'UP' || rule.rounding === 'DOWN' ? rule.rounding : 'HALF_UP',
  };
}

/** 단일 규칙이면 전체 타입, 타입별 값이면 각 타입 규칙으로 해석한다. 해석할 수 없으면 null. */
function decimalRules(value: unknown): { single: boolean; rules: Record<DecimalType, GridDecimalPolicyValue> } | null {
  if (value === null || value === undefined) return null;
  const single = decimalRule(value);
  if (single) return { single: true, rules: { number: single, decimal: single, currency: single } };
  if (typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const rules = {} as Record<DecimalType, GridDecimalPolicyValue>;
  for (const type of DECIMAL_TYPES) {
    const rule = decimalRule(source[type]);
    if (!rule) return null;
    rules[type] = rule;
  }
  return { single: false, rules };
}

function ruleSegmentText(rule: GridDecimalPolicyValue, key: RuleKey) {
  if (key === 'places') return `${rule.places}자리`;
  if (key === 'trailingZeros') return rule.trailingZeros === 'AUTO' ? '0 있을 때만 표시' : '0 항상 표시';
  return ROUNDING_LABELS[rule.rounding];
}

function fallbackValue(policy: SystemPolicy, value: unknown): string {
  if (value === null || value === undefined) return '없음';
  if (policy.valueType === 'BOOLEAN' && typeof value === 'boolean') return value ? '사용' : '미사용';
  if (policy.valueType === 'SELECT' && typeof value === 'string') return policy.options.find((option) => option.value === value)?.label ?? value;
  if (policy.valueType === 'USER_LIST' && Array.isArray(value)) return `${value.length}명 선택`;
  if (typeof value === 'number') return `${value}${policy.unit}`;
  if (typeof value === 'string') return value || '(빈 값)';
  return JSON.stringify(value) ?? '없음';
}

const sameValue = (left: unknown, right: unknown) => JSON.stringify(left ?? null) === JSON.stringify(right ?? null);

/** 비교 대상과 다른 항목(타입·자릿수·0 표시·반올림)을 표시하도록 행을 만든다. */
function buildRows(policy: SystemPolicy, value: unknown, other: unknown): Row[] {
  const own = isGridDecimalPolicy(policy) ? decimalRules(value) : null;
  if (own) {
    const counterpart = decimalRules(other);
    const types = own.single ? DECIMAL_TYPES : null;
    const segmentsFor = (rule: GridDecimalPolicyValue, compareTypes: DecimalType[]) => RULE_KEYS.map((key) => ({
      text: ruleSegmentText(rule, key),
      changed: !counterpart || compareTypes.some((type) => counterpart.rules[type][key] !== rule[key]),
    }));
    if (types) return [{ key: 'all', label: '전체 타입', segments: segmentsFor(own.rules.number, types) }];
    return DECIMAL_TYPES.map((type) => ({ key: type, label: type, segments: segmentsFor(own.rules[type], [type]) }));
  }
  return [{ key: 'value', label: null, segments: [{ text: fallbackValue(policy, value), changed: !sameValue(value, other) }] }];
}

const highlightSx = (side: Side) => (theme: Theme) => side === 'after'
  ? { bgcolor: alpha(theme.palette.success.main, 0.18), color: theme.palette.success.dark, fontWeight: 700 }
  : { bgcolor: alpha(theme.palette.error.main, 0.12), color: theme.palette.error.dark, textDecoration: 'line-through' };

function HistoryRows({ rows, side }: { rows: Row[]; side: Side }) {
  return <Stack spacing={0.75}>
    {rows.map((row) => {
      const rowChanged = row.segments.some((segment) => segment.changed);
      return <Box
        key={row.key}
        data-testid="policy-history-row"
        data-changed={rowChanged ? 'true' : 'false'}
        sx={(theme) => ({
          pl: 1,
          borderLeft: '3px solid',
          borderLeftColor: rowChanged ? (side === 'after' ? theme.palette.success.main : theme.palette.error.light) : 'transparent',
        })}
      >
        {row.label && <Typography variant="caption" color="text.secondary">{row.label}</Typography>}
        <Typography variant="body2" component="div" color={rowChanged ? 'text.primary' : 'text.secondary'} sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
          {row.segments.map((segment, index) => <span key={index}>
            {index > 0 && ' · '}
            {segment.changed
              ? <Box component="mark" data-changed="true" sx={[{ px: 0.5, borderRadius: 0.5 }, highlightSx(side)]}>{segment.text}</Box>
              : segment.text}
          </span>)}
        </Typography>
      </Box>;
    })}
  </Stack>;
}

/** 정책 변경 이력 한 건의 변경 전 → 변경 후 값을 변경 부분 강조와 함께 표시한다. */
export function PolicyHistoryChange({ policy, beforeValue, afterValue }: { policy: SystemPolicy; beforeValue: unknown; afterValue: unknown }) {
  const sides = [
    { side: 'before' as const, label: '변경 전', rows: buildRows(policy, beforeValue, afterValue) },
    { side: 'after' as const, label: '변경 후', rows: buildRows(policy, afterValue, beforeValue) },
  ];
  const changedCount = sides[1].rows.reduce((sum, row) => sum + row.segments.filter((segment) => segment.changed).length, 0);
  const box = ({ side, label, rows }: typeof sides[number]) => <Box
    key={side}
    role="group"
    aria-label={label}
    sx={(theme) => ({
      p: 1.5,
      borderRadius: 1,
      minWidth: 0,
      border: '1px solid',
      ...(side === 'after'
        ? { borderColor: alpha(theme.palette.success.main, 0.5), bgcolor: alpha(theme.palette.success.main, 0.04) }
        : { borderColor: 'divider', bgcolor: 'action.hover' }),
    })}
  >
    <Stack direction="row" spacing={1} sx={{ mb: 0.75, alignItems: 'center' }}>
      <Typography variant="subtitle2" color={side === 'after' ? 'success.dark' : 'text.secondary'}>{label}</Typography>
      {side === 'after' && changedCount > 0 && <Chip size="small" color="success" variant="outlined" label={`${changedCount}곳 변경`} />}
    </Stack>
    <HistoryRows rows={rows} side={side} />
  </Box>;

  return <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'minmax(0, 1fr) auto minmax(0, 1fr)' }, gap: 1.5, mt: 1.5 }}>
    {box(sides[0])}
    <Box aria-hidden sx={{ display: 'flex', justifyContent: 'center', alignSelf: 'center' }}>
      <Box sx={(theme) => ({
        width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: alpha(theme.palette.success.main, 0.12), color: 'success.main',
      })}>
        <ArrowForwardIcon data-testid="policy-history-arrow" fontSize="small" sx={{ transform: { xs: 'rotate(90deg)', sm: 'none' } }} />
      </Box>
    </Box>
    {box(sides[1])}
  </Box>;
}
