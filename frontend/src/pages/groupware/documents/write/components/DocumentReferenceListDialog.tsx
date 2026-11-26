import { useMemo, useState } from 'react';
import { Box, Button, IconButton, TextField, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { F1GridUserOption } from '../../../../../shared/components/f1-grid/types/grid.types';
import { CommonDialog } from '../../../../../shared/components/CommonDialog';
import { groupByDepartment } from '../data/documentReferenceGroups';

type DocumentReferenceListDialogProps = {
  open: boolean;
  users: F1GridUserOption[];
  onRemove: (userId: string) => void;
  onClear: () => void;
  onClose: () => void;
};

export function DocumentReferenceListDialog({
  open,
  users,
  onRemove,
  onClear,
  onClose,
}: DocumentReferenceListDialogProps) {
  const [query, setQuery] = useState('');
  const groups = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase();
    const filtered = keyword
      ? users.filter((user) =>
          [user.label, user.departmentName, user.positionName]
            .filter(Boolean)
            .some((text) => text!.toLocaleLowerCase().includes(keyword)),
        )
      : users;
    return groupByDepartment(filtered, (user) => user.departmentName);
  }, [query, users]);

  return (
    <CommonDialog
      open={open}
      onClose={onClose}
      title={`참조자 ${users.length}명`}
      size="xs"
      dialogProps={{ 'data-testid': 'document-reference-list-dialog' }}
      actions={
        <>
          <Button color="inherit" onClick={onClear} disabled={users.length === 0}>
            전체 삭제
          </Button>
          <Button onClick={onClose}>닫기</Button>
        </>
      }
    >
        <Box sx={{ p: 1.5 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="이름·부서 검색"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '참조자 검색' } }}
          />
        </Box>
        <Box sx={{ maxHeight: 360, overflowY: 'auto', px: 1.5, pb: 1.5 }}>
          {groups.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              검색 결과가 없습니다.
            </Typography>
          )}
          {groups.map((group) => (
            <Box key={group.department} sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                {group.department} ({group.items.length})
              </Typography>
              {group.items.map((user) => (
                <Box
                  key={String(user.value)}
                  sx={{ display: 'flex', alignItems: 'center', minHeight: 36 }}
                >
                  <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>
                    {user.label}
                    {user.positionName ? ` ${user.positionName}` : ''}
                  </Typography>
                  <IconButton
                    size="small"
                    aria-label={`${user.label} 삭제`}
                    onClick={() => onRemove(String(user.value))}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          ))}
        </Box>
    </CommonDialog>
  );
}
