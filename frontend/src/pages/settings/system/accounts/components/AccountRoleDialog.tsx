import { Alert, Box, Button, Checkbox, FormControlLabel, FormGroup, Typography } from '@mui/material';
import { useState } from 'react';
import { CommonDialog } from '../../../../../shared/components/CommonDialog';
import type { AccountRow, RoleOption } from '../types/account.types';

type Props = {
  account: AccountRow;
  roleOptions: RoleOption[];
  saving: boolean;
  onSubmit: (roleIds: number[]) => Promise<unknown>;
  onClose: () => void;
};

/** 계정에 부여할 역할을 고른다. 역할은 1개 이상이어야 로그인할 수 있다. */
export function AccountRoleDialog({ account, roleOptions, saving, onSubmit, onClose }: Props) {
  const [selected, setSelected] = useState<number[]>(() => account.roles.map((role) => role.roleId));
  const [error, setError] = useState('');
  const title = '권한 변경';

  const toggle = (roleId: number) => setSelected((current) => (
    current.includes(roleId) ? current.filter((id) => id !== roleId) : [...current, roleId]
  ));

  const submit = async () => {
    if (selected.length === 0) {
      setError('역할을 1개 이상 선택해 주세요.');
      return;
    }
    setError('');
    try {
      await onSubmit(selected);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? cause.message : '권한을 저장하지 못했습니다.');
    }
  };

  return (
    <CommonDialog
      open
      onClose={onClose}
      title={title}
      description={`${account.userNm} (${account.loginCode})`}
      size="xs"
      fullScreenOnMobile
      actions={(
        <>
          <Button variant="contained" onClick={() => void submit()} disabled={saving}>저장</Button>
          <Button onClick={onClose} disabled={saving}>취소</Button>
        </>
      )}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {error ? <Alert severity="error">{error}</Alert> : null}
        {roleOptions.length === 0 ? (
          <Typography variant="body2" color="text.secondary">선택할 수 있는 역할이 없습니다.</Typography>
        ) : (
          <FormGroup aria-label="역할 목록">
            {roleOptions.map((role) => (
              <FormControlLabel
                key={role.roleId}
                control={(
                  <Checkbox
                    checked={selected.includes(role.roleId)}
                    onChange={() => toggle(role.roleId)}
                    disabled={saving}
                  />
                )}
                label={role.roleNm}
              />
            ))}
          </FormGroup>
        )}
      </Box>
    </CommonDialog>
  );
}
