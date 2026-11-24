import { useMemo, useState } from 'react';
import {
  Alert, Box, Button, Checkbox, CircularProgress, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
} from '@mui/material';
import { CommonDialog } from '../../../../shared/components/CommonDialog';
import type { ProcessRow } from '../types/processManagement.types';

type Props = {
  workplaceName: string;
  masters: ProcessRow[];
  /** 대상 작업장에 이미 연결되었거나 이번 변경에서 추가한 공정 마스터 ID. */
  linkedProcessIds: ReadonlySet<number>;
  loading: boolean;
  error: string;
  onClose: () => void;
  onConfirm: (selected: ProcessRow[]) => void;
};

/** 공정 설정에 등록된 공정 중 작업장에 연결할 공정을 고른다. 신규 입력은 지원하지 않는다. */
export function ProcessPickerDialog({ workplaceName, masters, linkedProcessIds, loading, error, onClose, onConfirm }: Props) {
  const [checked, setChecked] = useState<ReadonlySet<number>>(new Set());
  const candidates = useMemo(() => masters.filter((row) =>
    !row.inactive && row.processId !== null && !linkedProcessIds.has(row.processId)), [masters, linkedProcessIds]);
  const toggle = (processId: number) => setChecked((current) => {
    const next = new Set(current);
    if (!next.delete(processId)) next.add(processId);
    return next;
  });
  const confirm = () => onConfirm(candidates.filter((row) => row.processId !== null && checked.has(row.processId)));

  return (
    <CommonDialog open onClose={onClose} title="공정 선택" size="sm" fullScreenOnMobile
      description={`${workplaceName || '작업장'}에 연결할 공정을 선택하세요. 공정은 공정 설정에서 등록합니다.`}
      actions={<>
        <Button variant="contained" disabled={loading || checked.size === 0} onClick={confirm}>추가</Button>
        <Button onClick={onClose}>닫기</Button>
      </>}>
      <Box sx={{ minWidth: 0 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} aria-label="공정 조회 중" /></Box>}
        {!loading && !error && candidates.length === 0 && (
          <Alert severity="info">추가할 수 있는 공정이 없습니다. 공정 설정에서 공정을 먼저 등록해 주세요.</Alert>
        )}
        {!loading && candidates.length > 0 && (
          <List dense aria-label="연결 가능한 공정">
            {candidates.map((row) => {
              const processId = row.processId as number;
              return (
                <ListItem key={row.id} disablePadding>
                  <ListItemButton onClick={() => toggle(processId)}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Checkbox edge="start" disableRipple tabIndex={-1} checked={checked.has(processId)}
                        slotProps={{ input: { 'aria-label': `${row.name} 선택` } }} />
                    </ListItemIcon>
                    <ListItemText primary={row.name} secondary={row.description || undefined} />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        )}
      </Box>
    </CommonDialog>
  );
}
