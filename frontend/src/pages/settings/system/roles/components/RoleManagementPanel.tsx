import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import type { RoleManagementRow } from '../types/roleManagement.types';
import type { RoleSavePayload } from '../services/roleManagement.service';

type RoleManagementPanelProps = {
  roles: RoleManagementRow[];
  onCreateRole?: (payload: RoleSavePayload) => Promise<void> | void;
};

export function RoleManagementPanel({
  roles,
  onCreateRole,
}: RoleManagementPanelProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ roleCode: '', roleNm: '', roleDc: '' });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.roleCode.trim() || !form.roleNm.trim()) {
      return;
    }
    setSaving(true);
    try {
      await onCreateRole?.(form);
      setOpen(false);
      setForm({ roleCode: '', roleNm: '', roleDc: '' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box
      sx={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 2, p: 3 }}
    >
      <Card
        sx={{
          borderRadius: 3,
          border: '1px solid rgba(148,163,184,0.18)',
          boxShadow: 'none',
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              역할 목록
            </Typography>
            <Button
              variant="contained"
              size="small"
              onClick={() => setOpen(true)}
            >
              권한 등록
            </Button>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>역할</TableCell>
                <TableCell>그룹</TableCell>
                <TableCell>메뉴</TableCell>
                <TableCell>활성</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id} hover>
                  <TableCell>
                    <Typography sx={{ fontWeight: 700 }}>
                      {role.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {role.description}
                    </Typography>
                  </TableCell>
                  <TableCell>{role.group}</TableCell>
                  <TableCell>{role.menuCount}</TableCell>
                  <TableCell>{role.active ? '사용' : '미사용'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card
        sx={{
          borderRadius: 3,
          border: '1px solid rgba(148,163,184,0.18)',
          boxShadow: 'none',
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            권한 상세
          </Typography>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                선택 역할
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {roles[0]?.name ?? 'ADMIN'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                권한 매핑
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {['READ', 'CREATE', 'UPDATE', 'DELETE'].map((label) => (
                <Chip key={label} label={label} variant="outlined" />
              ))}
            </Box>
            <Stack direction="row" spacing={2}>
              <FormControlLabel
                control={<Checkbox defaultChecked />}
                label="조회"
              />
              <FormControlLabel
                control={<Checkbox defaultChecked />}
                label="생성"
              />
              <FormControlLabel
                control={<Checkbox defaultChecked />}
                label="수정"
              />
              <FormControlLabel
                control={<Checkbox defaultChecked />}
                label="삭제"
              />
            </Stack>
          </Stack>
        </CardContent>
      </Card>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>역할 등록</DialogTitle>
        <DialogContent
          sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}
        >
          <TextField
            label="역할 코드"
            size="small"
            value={form.roleCode}
            onChange={(e) =>
              setForm((f) => ({ ...f, roleCode: e.target.value }))
            }
            autoFocus
          />
          <TextField
            label="역할명"
            size="small"
            value={form.roleNm}
            onChange={(e) => setForm((f) => ({ ...f, roleNm: e.target.value }))}
          />
          <TextField
            label="설명"
            size="small"
            multiline
            minRows={2}
            value={form.roleDc}
            onChange={(e) => setForm((f) => ({ ...f, roleDc: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>취소</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            저장
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
