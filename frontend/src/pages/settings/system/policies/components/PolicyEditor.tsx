import { useRef, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, MenuItem, Stack, TextField, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { UnsavedChangesConfirmDialog } from '../../../../../shared/components/UnsavedChangesConfirmDialog';
import { useUnsavedChangesBeforeUnload } from '../../../../../shared/hooks/useUnsavedChangesBeforeUnload';
import { createPolicy, updatePolicy } from '../services/systemPolicy.service';
import { initialPolicyValue, newPolicy, POLICY_TYPES, validatePolicy, type PolicyPayload, type PolicyValueType, type SystemPolicy } from '../types/systemPolicy.types';
import { PolicyValueInput } from './PolicyValueInput';

export function PolicyEditor({ policy, onClose, onSaved }: { policy: SystemPolicy | null; onClose: () => void; onSaved: (item: SystemPolicy) => void }) {
  const [draft, setDraft] = useState<PolicyPayload>(() => policy ? {
    policyCode: policy.policyCode, policyName: policy.policyName, category: policy.category,
    description: policy.description, valueType: policy.valueType, value: policy.value,
    options: policy.options ?? [], minValue: policy.minValue, maxValue: policy.maxValue, unit: policy.unit,
  } : newPolicy());
  const [initial] = useState(() => JSON.stringify(draft));
  const busy = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [discardOpen, setDiscardOpen] = useState(false);
  const dirty = JSON.stringify(draft) !== initial;
  useUnsavedChangesBeforeUnload(dirty);
  const definitionLocked = Boolean(policy?.systemPolicy);
  const set = <K extends keyof PolicyPayload>(key: K, value: PolicyPayload[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const close = () => { if (!busy.current) { if (dirty) setDiscardOpen(true); else onClose(); } };
  const save = async () => {
    if (busy.current) return;
    const validation = validatePolicy(draft);
    if (validation) { setError(validation); return; }
    if (Array.isArray(draft.value) && draft.value.length > 100) { setError('사용자는 최대 100명까지 선택할 수 있습니다.'); return; }
    busy.current = true;
    setSaving(true);
    setError('');
    const payload: PolicyPayload = {
      ...draft, policyName: draft.policyName.trim(), category: draft.category.trim(),
      options: draft.options.map((option) => ({ value: option.value.trim(), label: option.label.trim() })),
    };
    try {
      const saved = policy ? await updatePolicy(policy.policyId, { ...payload, version: policy.version }) : await createPolicy(payload);
      onSaved(saved);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '정책 저장에 실패했습니다.');
    } finally { busy.current = false; setSaving(false); }
  };
  return (
    <>
      <Dialog open fullWidth maxWidth="md" onClose={close} aria-labelledby="policy-editor-title">
        <DialogTitle id="policy-editor-title">{policy ? '정책 수정' : '정책 추가'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            {error && <Alert severity="error">{error}</Alert>}
            <Alert severity="info">{policy?.systemPolicy ? '시스템 필수 정책입니다. 허용된 정책값만 변경할 수 있습니다.' : '정책 등록은 설정값을 저장합니다. 실제 업무 적용에는 해당 기능의 정책 연동이 필요합니다.'}</Alert>
            {definitionLocked ? <Stack spacing={1}>
              <Typography variant="h6">{draft.policyName}</Typography>
              <Typography variant="body2" color="text.secondary">{draft.description}</Typography>
              <TextField fullWidth label="정책 코드" value={draft.policyCode} disabled />
            </Stack> : <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField fullWidth label="정책 코드" value={draft.policyCode} disabled={saving || Boolean(policy)} onChange={(event) => set('policyCode', event.target.value.toUpperCase())} helperText="예: SALES_OVER_DELIVERY · 생성 후 변경 불가" slotProps={{ htmlInput: { maxLength: 80 } }} />
              <TextField fullWidth label="정책 이름" value={draft.policyName} disabled={saving || definitionLocked} onChange={(event) => set('policyName', event.target.value)} slotProps={{ htmlInput: { maxLength: 100 } }} />
              <TextField fullWidth label="업무 분류" value={draft.category} disabled={saving || definitionLocked} onChange={(event) => set('category', event.target.value)} helperText="예: 영업관리, 구매관리, 공통" slotProps={{ htmlInput: { maxLength: 80 } }} />
              <TextField select fullWidth label="값 타입" value={draft.valueType} disabled={saving || Boolean(policy)} helperText="생성 후 변경 불가" onChange={(event) => {
                const type = event.target.value as PolicyValueType;
                setDraft((current) => ({ ...current, valueType: type, value: initialPolicyValue(type), options: type === 'SELECT' ? [{ value: '', label: '' }] : [], minValue: null, maxValue: null, unit: '' }));
              }}>{Object.entries(POLICY_TYPES).map(([type, label]) => <MenuItem key={type} value={type}>{label}</MenuItem>)}</TextField>
            </Box>}
            {!definitionLocked && <TextField fullWidth multiline minRows={2} label="정책 설명" value={draft.description} disabled={saving} onChange={(event) => set('description', event.target.value)} helperText="적용되는 업무와 변경 시 주의사항을 적어주세요." slotProps={{ htmlInput: { maxLength: 1000 } }} />}
            {!definitionLocked && draft.valueType === 'NUMBER' && <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
              <TextField label="최솟값" type="number" value={draft.minValue ?? ''} disabled={saving || definitionLocked} slotProps={{ htmlInput: { step: 'any' } }} onChange={(event) => set('minValue', event.target.value === '' ? null : Number(event.target.value))} />
              <TextField label="최댓값" type="number" value={draft.maxValue ?? ''} disabled={saving || definitionLocked} slotProps={{ htmlInput: { step: 'any' } }} onChange={(event) => set('maxValue', event.target.value === '' ? null : Number(event.target.value))} />
              <TextField label="단위" value={draft.unit} disabled={saving || definitionLocked} onChange={(event) => set('unit', event.target.value)} slotProps={{ htmlInput: { maxLength: 30 } }} helperText="예: %, 일, 원" />
            </Box>}
            {!definitionLocked && draft.valueType === 'SELECT' && <Stack spacing={1}>
              <Typography variant="subtitle2">선택지 설정</Typography>
              {draft.options.map((option, index) => <Box key={index} sx={{ display: 'flex', alignItems: 'start', gap: 1 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1, flex: 1, minWidth: 0 }}>
                  <TextField size="small" label={`선택지 ${index + 1} 값`} value={option.value} disabled={saving || definitionLocked} slotProps={{ htmlInput: { maxLength: 100 } }} onChange={(event) => set('options', draft.options.map((item, i) => i === index ? { ...item, value: event.target.value } : item))} />
                  <TextField size="small" label={`선택지 ${index + 1} 표시명`} value={option.label} disabled={saving || definitionLocked} slotProps={{ htmlInput: { maxLength: 100 } }} onChange={(event) => set('options', draft.options.map((item, i) => i === index ? { ...item, label: event.target.value } : item))} />
                </Box>
                {!definitionLocked && <IconButton aria-label={`선택지 ${index + 1} 삭제`} disabled={saving} onClick={() => set('options', draft.options.filter((_item, i) => i !== index))}><DeleteOutlineIcon /></IconButton>}
              </Box>)}
              {!definitionLocked && <Button sx={{ alignSelf: 'start' }} disabled={saving || draft.options.length >= 50} onClick={() => set('options', [...draft.options, { value: '', label: '' }])}>선택지 추가</Button>}
            </Stack>}
            <Divider />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>현재 적용값 설정</Typography>
            <PolicyValueInput draft={draft} disabled={saving} onChange={(value) => set('value', value)} />
            {policy?.policyCode === 'DELIVERY_PLAN_MODE' && <Alert severity="warning">기존 출하계획이 있으면 운영 방식을 바꿀 수 없습니다. 기존 계획을 자동 변환하지 않습니다.</Alert>}
            {policy?.policyCode === 'OVER_DELIVERY_POLICY' && <Alert severity="warning">차단으로 전환해도 기존 초과 출하 실적은 유지됩니다. 이후 저장은 차단 정책으로 검증합니다.</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button variant="contained" disabled={saving} onClick={() => void save()}>{saving ? '저장 중' : '저장'}</Button>
          <Button disabled={saving} onClick={close}>취소</Button>
        </DialogActions>
      </Dialog>
      <UnsavedChangesConfirmDialog open={discardOpen} onCancel={() => setDiscardOpen(false)} onContinue={onClose} continueLabel="변경 버리기" />
    </>
  );
}
