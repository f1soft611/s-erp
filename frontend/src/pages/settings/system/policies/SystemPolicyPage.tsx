import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { getStoredAuth } from '../../../../shared/services/authService';
import type { MenuPermission } from '../../../dashboard/types/dashboard';
import { PolicyEditor } from './components/PolicyEditor';
import { deletePolicy, getPolicies, getPolicyHistory } from './services/systemPolicy.service';
import { POLICY_TYPES, policyValueLabel, type PolicyHistory, type SystemPolicy } from './types/systemPolicy.types';

type Props = {
  isPlatformAdmin: boolean;
  selectedMenuPermissions?: MenuPermission;
  breadcrumbItems?: string[];
};
const errorMessage = (cause: unknown) => cause instanceof Error ? cause.message : '요청 처리에 실패했습니다.';

export function SystemPolicyPage({ isPlatformAdmin, selectedMenuPermissions, breadcrumbItems }: Props) {
  const canRead = isPlatformAdmin && Boolean(selectedMenuPermissions?.read);
  const [policies, setPolicies] = useState<SystemPolicy[]>([]);
  const [loading, setLoading] = useState(canRead);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [editor, setEditor] = useState<{ policy: SystemPolicy | null } | null>(null);
  const [deleting, setDeleting] = useState<SystemPolicy | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const busy = useRef(false);
  const loadId = useRef(0);
  const historyId = useRef(0);
  const [history, setHistory] = useState<{ policy: SystemPolicy; entries: PolicyHistory[]; loading: boolean; error: string } | null>(null);
  const load = useCallback(async () => {
    if (!canRead) return;
    const id = ++loadId.current;
    setLoading(true);
    setError('');
    try { const result = await getPolicies(); if (id === loadId.current) setPolicies(result); }
    catch (cause) { if (id === loadId.current) setError(errorMessage(cause)); }
    finally { if (id === loadId.current) setLoading(false); }
  }, [canRead]);
  const invalidateRequests = useCallback(() => { ++loadId.current; ++historyId.current; }, []);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void load(); });
    return () => { active = false; invalidateRequests(); };
  }, [load, invalidateRequests]);
  const showHistory = async (policy: SystemPolicy) => {
    const id = ++historyId.current;
    setHistory({ policy, entries: [], loading: true, error: '' });
    try {
      const entries = await getPolicyHistory(policy.policyId);
      if (id === historyId.current) setHistory({ policy, entries, loading: false, error: '' });
    } catch (cause) {
      if (id === historyId.current) setHistory({ policy, entries: [], loading: false, error: errorMessage(cause) });
    }
  };
  const remove = async () => {
    if (!deleting || busy.current) return;
    busy.current = true;
    setDeleteBusy(true);
    setError('');
    try {
      await deletePolicy(deleting.policyId, deleting.version);
      setPolicies((current) => current.filter((policy) => policy.policyId !== deleting.policyId));
      setDeleting(null);
      setNotice('정책이 삭제되었습니다.');
    } catch (cause) { setError(errorMessage(cause)); }
    finally { busy.current = false; setDeleteBusy(false); }
  };
  if (!isPlatformAdmin) return <Alert severity="error">플랫폼 관리자만 사용할 수 있습니다.</Alert>;
  if (!canRead) return <Alert severity="error">시스템 정책 조회 권한이 없습니다.</Alert>;
  const categories = [...new Set(policies.map((policy) => policy.category))].sort();
  const filtered = policies.filter((policy) => (!category || category === policy.category)
    && `${policy.policyName} ${policy.policyCode} ${policy.description}`.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <Box sx={{ minWidth: 0, width: '100%' }}>
      <PageHeader breadcrumbItems={breadcrumbItems ?? ['환경설정', '시스템 관리', '시스템 정책']}
        description="현재 회사에 적용되는 업무 정책을 타입별로 설정합니다. 플랫폼 관리자 전용입니다."
        actionGroups={[{ key: 'policy', actions: [
          { label: '조회', icon: RefreshIcon, onClick: load, disabled: loading || Boolean(editor) || Boolean(deleting) },
          { label: '정책 추가', icon: AddIcon, visible: Boolean(selectedMenuPermissions?.create), disabled: loading || Boolean(editor) || Boolean(deleting), onClick: () => setEditor({ policy: null }) },
        ] }]} />
      <Stack spacing={2.5} sx={{ p: { xs: 2, md: 3 } }}>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
            <Chip label="플랫폼 관리자 전용" color="primary" variant="outlined" sx={{ alignSelf: 'start' }} />
            <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>현재 회사: {getStoredAuth()?.tenantCode ?? '현재 로그인 회사'} · 다른 회사의 설정은 변경하지 않습니다.</Typography>
          </Stack>
        </Paper>
        {error && !deleting && <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => void load()}>다시 조회</Button>}>{error}</Alert>}
        {notice && <Alert severity="success" onClose={() => setNotice('')}>{notice}</Alert>}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '180px minmax(0, 1fr)' }, gap: 2 }}>
          <TextField select size="small" label="업무 분류" value={category} onChange={(event) => setCategory(event.target.value)}>
            <MenuItem value="">전체 분류</MenuItem>{categories.map((name) => <MenuItem key={name} value={name}>{name}</MenuItem>)}
          </TextField>
          <TextField fullWidth size="small" label="정책 검색" placeholder="이름, 코드, 설명으로 검색" value={query} onChange={(event) => setQuery(event.target.value)} />
        </Box>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>정책 목록</Typography>
          <Typography variant="body2" color="text.secondary">{filtered.length} / {policies.length}개</Typography>
        </Stack>
        {loading && <Box role="status" sx={{ display: 'flex', gap: 1, alignItems: 'center' }}><CircularProgress size={18} /><Typography>정책 조회 중</Typography></Box>}
        {!loading && !filtered.length && <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}><Typography color="text.secondary">{policies.length ? '검색 조건에 맞는 정책이 없습니다.' : '등록된 정책이 없습니다. 정책 추가로 시작하세요.'}</Typography></Paper>}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
          {filtered.map((policy) => <Paper key={policy.policyId} variant="outlined" sx={{ p: 2.5, borderRadius: 2, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
              <Chip size="small" variant="outlined" label={policy.category} /><Chip size="small" label={POLICY_TYPES[policy.valueType]} />
              {policy.systemPolicy && <Chip size="small" color="primary" variant="outlined" label="시스템 필수" />}
            </Stack>
            <Box sx={{ overflowWrap: 'anywhere' }}>
              <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 700 }}>{policy.policyName}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{policy.policyCode}</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>{policy.description || '등록된 설명이 없습니다.'}</Typography>
            <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1, mt: 'auto', overflowWrap: 'anywhere' }}>
              <Typography variant="caption" color="text.secondary">현재 적용값</Typography>
              <Typography sx={{ fontWeight: 700, whiteSpace: 'pre-wrap' }}>{policyValueLabel(policy) || '(빈 값)'}</Typography>
            </Box>
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <Button size="small" aria-label={`${policy.policyName} 이력`} onClick={() => void showHistory(policy)}>변경 이력</Button>
              {selectedMenuPermissions?.update && <Button size="small" variant="outlined" aria-label={`${policy.policyName} 수정`} onClick={() => setEditor({ policy })} disabled={loading}>수정</Button>}
              {selectedMenuPermissions?.delete && !policy.systemPolicy && <Button size="small" color="error" aria-label={`${policy.policyName} 삭제`} onClick={() => { setError(''); setDeleting(policy); }} disabled={loading}>삭제</Button>}
            </Stack>
          </Paper>)}
        </Box>
        <Alert severity="info">새 정책을 추가해도 업무 동작이 자동 생성되지는 않습니다. 해당 업무에서 정책을 읽도록 연동해야 적용됩니다.</Alert>
      </Stack>
      {editor && <PolicyEditor policy={editor.policy} onClose={() => setEditor(null)} onSaved={(saved) => {
        setPolicies((current) => current.some((policy) => policy.policyId === saved.policyId) ? current.map((policy) => policy.policyId === saved.policyId ? saved : policy) : [...current, saved]);
        setNotice('정책이 저장되었습니다.');
        setEditor(null);
      }} />}
      <Dialog open={Boolean(deleting)} fullWidth maxWidth="xs" onClose={() => { if (!busy.current) setDeleting(null); }} aria-labelledby="policy-delete-title">
        <DialogTitle id="policy-delete-title">정책 삭제</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Typography sx={{ overflowWrap: 'anywhere' }}>‘{deleting?.policyName}’ 정책을 삭제하시겠습니까? 삭제 이력은 보존됩니다.</Typography>
        </DialogContent>
        <DialogActions><Button color="error" variant="contained" disabled={deleteBusy} onClick={() => void remove()}>삭제</Button><Button disabled={deleteBusy} onClick={() => setDeleting(null)}>취소</Button></DialogActions>
      </Dialog>
      <Dialog open={Boolean(history)} fullWidth maxWidth="md" onClose={() => { ++historyId.current; setHistory(null); }} aria-labelledby="policy-history-title">
        <DialogTitle id="policy-history-title">정책 변경 이력 · {history?.policy.policyName}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {history?.loading && <Typography role="status">변경 이력 조회 중</Typography>}
            {history?.error && <Alert severity="error">{history.error}</Alert>}
            {!history?.loading && !history?.error && !history?.entries.length && <Typography>변경 이력이 없습니다.</Typography>}
            {history?.entries.map((entry, index) => <Paper key={index} variant="outlined" sx={{ p: 2, overflowWrap: 'anywhere' }}>
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}><Chip size="small" label={({ CREATE: '추가', UPDATE: '수정', DELETE: '삭제' } as Record<string, string>)[entry.action] ?? entry.action} /><Typography variant="body2">{entry.changedBy}</Typography><Typography variant="body2" color="text.secondary">{entry.changedAt}</Typography></Stack>
              <Typography variant="caption">변경 전 → 변경 후</Typography>
              <Typography component="pre" variant="body2" sx={{ whiteSpace: 'pre-wrap', m: 0, overflowWrap: 'anywhere' }}>{JSON.stringify(entry.beforeValue)} → {JSON.stringify(entry.afterValue)}</Typography>
            </Paper>)}
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => { ++historyId.current; setHistory(null); }}>닫기</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
