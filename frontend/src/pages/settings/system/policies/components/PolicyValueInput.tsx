import { useEffect, useState } from 'react';
import { Alert, Autocomplete, Box, Chip, FormControlLabel, MenuItem, Stack, Switch, TextField, Typography } from '@mui/material';
import type { PolicyPayload, PolicyUser, PolicyValue } from '../types/systemPolicy.types';
import { searchPolicyUsers } from '../services/systemPolicy.service';

function PolicyUserInput({ value, onChange, disabled }: { value: number[]; onChange: (value: PolicyValue) => void; disabled: boolean }) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<PolicyUser[]>([]);
  const [knownUsers, setKnownUsers] = useState<PolicyUser[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      void searchPolicyUsers(query).then((result) => {
        if (!active) return;
        setUsers(result);
        setKnownUsers((current) => [...new Map([...current, ...result].map((user) => [user.userId, user])).values()]);
        setError('');
      }).catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : '사용자 조회에 실패했습니다.');
      }).finally(() => { if (active) setLoading(false); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query]);
  const selected = value.map((id) => knownUsers.find((user) => user.userId === id) ?? { userId: id, userName: `사용자 #${id}` });
  return (
    <Stack spacing={1}>
      <Autocomplete multiple disabled={disabled} loading={loading} options={[...new Map([...selected, ...users].map((user) => [user.userId, user])).values()]}
        value={selected} filterOptions={(options) => options} isOptionEqualToValue={(a, b) => a.userId === b.userId}
        getOptionLabel={(user) => `${user.userName} (#${user.userId})`}
        onInputChange={(_event, input, reason) => { if (reason === 'input' || reason === 'clear') setQuery(input); }}
        onChange={(_event, next) => onChange(next.map((user) => user.userId))}
        noOptionsText="검색된 사용자가 없습니다." loadingText="사용자 조회 중"
        renderInput={(params) => <TextField {...params} label="대상 사용자" helperText="현재 회사의 활성 사용자만 선택할 수 있습니다. 최대 100명" />}
      />
      {error && <Alert severity="error">{error}</Alert>}
      <Typography variant="caption" color="text.secondary">선택하지 않으면 빈 목록으로 저장됩니다.</Typography>
    </Stack>
  );
}

export function PolicyValueInput({ draft, onChange, disabled = false }: { draft: PolicyPayload; onChange: (value: PolicyValue) => void; disabled?: boolean }) {
  if (draft.valueType === 'BOOLEAN') {
    return <Box><FormControlLabel control={<Switch checked={draft.value === true} onChange={(_event, checked) => onChange(checked)} disabled={disabled} />} label="정책 사용" /><Chip size="small" label={draft.value === true ? '사용' : '미사용'} /></Box>;
  }
  if (draft.valueType === 'USER_LIST') return <PolicyUserInput value={Array.isArray(draft.value) ? draft.value : []} onChange={onChange} disabled={disabled} />;
  if (draft.valueType === 'SELECT') {
    return <TextField select fullWidth label="정책값" value={draft.value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
      <MenuItem value="" disabled>선택하세요</MenuItem>
      {draft.options.filter((option) => option.value.trim()).map((option, index) => <MenuItem key={index} value={option.value.trim()}>{option.label || option.value}</MenuItem>)}
    </TextField>;
  }
  return <TextField fullWidth label="정책값" type={draft.valueType === 'NUMBER' ? 'number' : draft.valueType === 'DATE' ? 'date' : 'text'}
    value={draft.value} disabled={disabled} multiline={draft.valueType === 'TEXT'} minRows={draft.valueType === 'TEXT' ? 2 : undefined}
    slotProps={{
      inputLabel: draft.valueType === 'DATE' ? { shrink: true } : undefined,
      htmlInput: draft.valueType === 'NUMBER' ? { min: draft.minValue ?? undefined, max: draft.maxValue ?? undefined, step: 'any' } : { maxLength: 2000 },
    }}
    helperText={draft.valueType === 'NUMBER' ? `허용 범위: ${draft.minValue ?? '제한 없음'} ~ ${draft.maxValue ?? '제한 없음'} ${draft.unit}` : undefined}
    onChange={(event) => onChange(draft.valueType === 'NUMBER' && event.target.value !== '' ? Number(event.target.value) : event.target.value)} />;
}
